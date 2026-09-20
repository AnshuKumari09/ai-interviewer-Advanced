// Wraps the Web Worker from codeRunner.worker.js (see below for where to save it).
// One worker per run — spun up fresh each time and terminated when done/cancelled,
// so a runaway solution from a previous run can never bleed into the next one.

const WATCHDOG_MS = 12000 // if the worker goes silent this long, assume it's hung (e.g. infinite loop) and kill it

export function runInWorker({ language, code, func, tests }, callbacks = {}) {
  const { onStatus, onLoaded, onResult, onCompileError, onFatal, onDone } = callbacks

  const worker = new Worker(new URL('../workers/codeRunner.worker.js', import.meta.url))
  let watchdog

  const resetWatchdog = () => {
    clearTimeout(watchdog)
    watchdog = setTimeout(() => {
      onFatal?.('Execution timed out — check for an infinite loop.')
      worker.terminate()
    }, WATCHDOG_MS)
  }

  const cleanup = () => {
    clearTimeout(watchdog)
    worker.terminate()
  }

  resetWatchdog()

  worker.onmessage = (e) => {
    resetWatchdog()
    const m = e.data
    switch (m.type) {
      case 'status':
        onStatus?.(m.text)
        break
      case 'loaded':
        onLoaded?.()
        break
      case 'result':
        onResult?.(m) // { index, status: 'passed'|'failed'|'error', actual, error, stdout, ms }
        break
      case 'compile_error':
        onCompileError?.(m.message)
        cleanup()
        break
      case 'fatal':
        onFatal?.(m.message)
        cleanup()
        break
      case 'done':
        onDone?.()
        cleanup()
        break
      default:
        break
    }
  }

  worker.onerror = (err) => {
    onFatal?.(err.message || 'Worker crashed unexpectedly')
    cleanup()
  }

  worker.postMessage({ type: 'run', language, code, func, tests })

  return cleanup // call this to cancel a run early (e.g. user navigates away)
}