import { useCallback, useEffect, useRef, useState } from 'react'

// function wsUrl(interviewId) {
//   const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
//   return `${proto}://${window.location.host}/api/interviews/${interviewId}/audio` // Vite proxy se backend
// }



function wsUrl(interviewId) {
  const apiUrl =
    import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

  const wsBaseUrl = apiUrl.replace(/^http/, 'ws')

  return `${wsBaseUrl}/ws/interviews/${interviewId}`
}




// mic sample rate (48kHz aadi) -> 16 kHz PCM16. Averaging se aliasing kam hoti hai, STT ki accuracy behtar.
function floatTo16kPCM(float32, inRate) {
  const ratio = inRate / 16000
  const outLength = Math.floor(float32.length / ratio)
  const out = new Int16Array(outLength)
  for (let i = 0; i < outLength; i++) {
    const start = Math.floor(i * ratio)
    const end = Math.max(start + 1, Math.min(float32.length, Math.floor((i + 1) * ratio)))
    let sum = 0
    for (let j = start; j < end; j++) sum += float32[j]
    const s = Math.max(-1, Math.min(1, sum / (end - start)))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out.buffer
}

function base64ToBlob(b64, mime) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type: mime })
}

export function useVoice(interviewId, handlers = {}) {
  const [state, setState] = useState('idle') // idle | connecting | listening | thinking | speaking
  const [partial, setPartial] = useState('')

  const h = useRef(handlers)
  h.current = handlers
  const stateRef = useRef('idle')
  const doneRef = useRef(false)
  const wsRef = useRef(null)
  const ctxRef = useRef(null)
  const streamRef = useRef(null)
  const procRef = useRef(null)
  const playerRef = useRef(null)

  const go = useCallback((s) => {
    stateRef.current = s
    setState(s)
  }, [])

  const stop = useCallback(() => {
    procRef.current?.disconnect()
    procRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (ctxRef.current && ctxRef.current.state !== 'closed') ctxRef.current.close().catch(() => {})
    ctxRef.current = null
    playerRef.current?.pause()
    playerRef.current = null
    const ws = wsRef.current
    wsRef.current = null
    ws?.close()
    go('idle')
    setPartial('')
  }, [go])

  const start = useCallback(() => {
    if (wsRef.current) return
    doneRef.current = false
    go('connecting')

    const ws = new WebSocket(wsUrl(interviewId))
    wsRef.current = ws

    ws.onopen = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
        })
        if (wsRef.current !== ws) {
          stream.getTracks().forEach((t) => t.stop()) // permission ke beech user ne stop kar diya
          return
        }
        streamRef.current = stream

        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        await ctx.resume()
        ctxRef.current = ctx

        const source = ctx.createMediaStreamSource(stream)
        const proc = ctx.createScriptProcessor(4096, 1, 1)
        procRef.current = proc
        proc.onaudioprocess = (e) => {
          // half-duplex: AI bolte/sochte waqt mic ka audio nahi jata,
          // warna AI ki apni awaaz hi tumhara "jawab" ban jati hai
          if (ws.readyState !== WebSocket.OPEN || stateRef.current !== 'listening') return
          ws.send(floatTo16kPCM(e.inputBuffer.getChannelData(0), ctx.sampleRate))
        }
        source.connect(proc)
        proc.connect(ctx.destination) // output khaali hai, graph zinda rakhne ke liye
      } catch (err) {
        h.current.onError?.('Microphone access failed: ' + err.message)
        stop()
      }
    }

    ws.onmessage = (evt) => {
      if (typeof evt.data !== 'string') return
      let msg
      try {
        msg = JSON.parse(evt.data)
      } catch {
        return
      }

      switch (msg.type || msg.event) {
        case 'connected':
          go('listening')
          break

        case 'transcript.partial':
          if (stateRef.current === 'listening') setPartial(msg.text || '')
          break

        case 'transcript.final':
          if (msg.text?.trim()) {
            setPartial('')
            go('thinking')
            h.current.onFinal?.(msg.text.trim())
          }
          break

        case 'llm.response':
          if (msg.done) doneRef.current = true
          h.current.onAiText?.(msg.text || '')
          break

        case 'llm.audio': {
          go('speaking')
          const url = URL.createObjectURL(base64ToBlob(msg.audio, `audio/${msg.format || 'wav'}`))
          const player = new Audio(url)
          playerRef.current = player
          let over = false
          const finish = () => {
            if (over) return
            over = true
            URL.revokeObjectURL(url)
            h.current.onTurnEnd?.()
            if (doneRef.current) stop() // interview khatam: closing bolne ke baad mic band
            else go('listening')
          }
          player.onended = finish
          player.onerror = finish
          player.play().catch(finish)
          break
        }

        case 'warning':
          h.current.onWarning?.(msg.message)
          if (stateRef.current === 'thinking') go('listening') // TTS fail = audio nahi aayega
          break

        case 'error':
          h.current.onError?.(msg.message)
          if (stateRef.current === 'thinking') go('listening')
          break

        default:
          break
      }
    }

    ws.onerror = () => h.current.onError?.('Voice connection error')
    ws.onclose = () => {
      if (wsRef.current === ws) stop()
    }
  }, [interviewId, go, stop])

  useEffect(() => stop, [stop]) // page chhodte hi mic band

  return { state, partial, start, stop }
}