class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.ratio = sampleRate / 16000 // sampleRate worklet ka global hai
    this.acc = 0
    this.count = 0
    this.idx = 0
    this.next = this.ratio
    this.out = []
  }

  process(inputs) {
    const ch = inputs[0][0]
    if (!ch) return true
    for (let i = 0; i < ch.length; i++) {
      this.acc += ch[i]
      this.count++
      this.idx++
      if (this.idx >= this.next) {
        this.out.push(this.acc / this.count) // average = simple low-pass + downsample
        this.acc = 0
        this.count = 0
        this.next += this.ratio
      }
    }
    if (this.out.length >= 1600) { // 100ms @ 16kHz
      const pcm = new Int16Array(this.out.length)
      for (let j = 0; j < pcm.length; j++) {
        const s = Math.max(-1, Math.min(1, this.out[j]))
        pcm[j] = s < 0 ? s * 0x8000 : s * 0x7fff
      }
      this.port.postMessage(pcm.buffer, [pcm.buffer])
      this.out = []
    }
    return true
  }
}

registerProcessor('pcm-processor', PCMProcessor)