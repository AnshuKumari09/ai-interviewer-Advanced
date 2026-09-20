// frontend/src/workers/codeRunner.worker.js
//
// Classic (non-module) worker — runner.js creates it without { type: 'module' },
// so we use importScripts() here, NOT ESM imports. If you ever switch runner.js
// to a module worker, swap importScripts for:
//   import { loadPyodide } from '.../pyodide.mjs'

const PYODIDE_VERSION = '0.26.4'
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

const post = (msg) => self.postMessage(msg)

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function deepEqual(a, b) {
  if (a === b) return true
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return true
    // tolerate float drift coming back from Python
    if (!Number.isInteger(a) || !Number.isInteger(b)) return Math.abs(a - b) < 1e-9
    return false
  }
  if (a === null || b === null) return false
  if (typeof a !== 'object' || typeof b !== 'object') return false

  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false
    return a.every((v, i) => deepEqual(v, b[i]))
  }

  const ka = Object.keys(a)
  const kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]))
}

const show = (v) => {
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

// Normalises whatever shape your backend stores tests in into a positional
// argument list. Verify this against your actual /coding-problems payload —
// this is the one place most likely to need tweaking.
function toArgs(test) {
  if (Array.isArray(test.args)) return test.args // {"args": [[7,1,5,3,6,4]]}
  const input = test.input
  if (input === undefined) return []
  if (Array.isArray(input)) return input // {"input": [[7,1,5,3,6,4]]}
  if (input !== null && typeof input === 'object') return Object.values(input) // {"input": {"prices": [...]}}
  return [input] // {"input": 5}
}

const expectedOf = (test) => (test.expected !== undefined ? test.expected : test.output)

/* ------------------------------------------------------------------ */
/* python                                                              */
/* ------------------------------------------------------------------ */

// Finds the user's entry point whether they wrote a bare function or the
// LeetCode-style `class Solution:` wrapper your starter code uses.
const PY_HARNESS = `
import json

def __resolve(name):
    g = globals()
    if 'Solution' in g and hasattr(g['Solution'], name):
        return getattr(g['Solution'](), name)
    if name in g and callable(g[name]):
        return g[name]
    raise NameError("Could not find a function named '" + name + "'")

def __run_case(name, args_json):
    fn = __resolve(name)
    args = json.loads(args_json)
    return json.dumps(fn(*args), default=str)
`

let pyodidePromise = null

async function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      post({ type: 'status', text: 'Loading Python runtime...' })
      importScripts(PYODIDE_URL + 'pyodide.js')
      const py = await loadPyodide({ indexURL: PYODIDE_URL })
      return py
    })()
  }
  return pyodidePromise
}

async function runPython({ code, func, tests }) {
  const py = await getPyodide()
  post({ type: 'loaded' })

  let stdout = ''
  py.setStdout({ batched: (s) => { stdout += s + '\n' } })
  py.setStderr({ batched: (s) => { stdout += s + '\n' } })

  try {
    py.runPython(code)
    py.runPython(PY_HARNESS)
  } catch (e) {
    post({ type: 'compile_error', message: lastLines(e) })
    return
  }

  const runCase = py.globals.get('__run_case')

  for (let i = 0; i < tests.length; i++) {
    stdout = ''
    const started = performance.now()
    try {
      const raw = runCase(func, JSON.stringify(toArgs(tests[i])))
      const actual = JSON.parse(raw)
      emit(i, actual, expectedOf(tests[i]), stdout, started)
    } catch (e) {
      post({
        type: 'result',
        index: i,
        status: 'error',
        error: lastLines(e),
        stdout,
        ms: Math.round(performance.now() - started),
      })
    }
  }

  runCase.destroy()
}

// Python tracebacks are long; the last couple of lines carry the actual error.
function lastLines(e) {
  return String(e?.message || e).trim().split('\n').slice(-3).join('\n')
}

/* ------------------------------------------------------------------ */
/* javascript                                                          */
/* ------------------------------------------------------------------ */

async function runJavaScript({ code, func, tests }) {
  post({ type: 'loaded' })

  let fn
  try {
    // eslint-disable-next-line no-new-func
    const factory = new Function(`${code}\n;return typeof ${func} === 'function' ? ${func} : undefined;`)
    fn = factory()
  } catch (e) {
    post({ type: 'compile_error', message: String(e?.message || e) })
    return
  }

  if (typeof fn !== 'function') {
    post({ type: 'compile_error', message: `Could not find a function named '${func}'` })
    return
  }

  const realLog = console.log
  for (let i = 0; i < tests.length; i++) {
    let stdout = ''
    console.log = (...args) => { stdout += args.map(show).join(' ') + '\n' }
    const started = performance.now()
    try {
      const actual = await fn(...toArgs(tests[i]))
      emit(i, actual, expectedOf(tests[i]), stdout, started)
    } catch (e) {
      post({
        type: 'result',
        index: i,
        status: 'error',
        error: String(e?.message || e),
        stdout,
        ms: Math.round(performance.now() - started),
      })
    } finally {
      console.log = realLog
    }
  }
}

/* ------------------------------------------------------------------ */

function emit(index, actual, expected, stdout, started) {
  const passed = deepEqual(actual, expected)
  post({
    type: 'result',
    index,
    status: passed ? 'passed' : 'failed',
    actual,
    error: passed ? undefined : `Expected ${show(expected)}, got ${show(actual)}`,
    stdout,
    ms: Math.round(performance.now() - started),
  })
}

self.onmessage = async (e) => {
  const { type, language, code, func, tests } = e.data
  if (type !== 'run') return

  try {
    if (language === 'python') await runPython({ code, func, tests })
    else if (language === 'javascript') await runJavaScript({ code, func, tests })
    else post({ type: 'fatal', message: `Unsupported language: ${language}` })
  } catch (err) {
    post({ type: 'fatal', message: String(err?.message || err) })
  } finally {
    post({ type: 'done' })
  }
}