const EventEmitter = require('events')

const WebSocket = require('ws')

const { encoder, decoder } = require('./buffer')

class LiveWS extends EventEmitter {
  /**
   * @param {number} roomid
   */
  constructor(roomid) {
    if (typeof roomid !== 'number' || Number.isNaN(roomid)) {
      throw new Error(`roomid ${roomid} must be Number not NaN`)
    }
    super()

    this.ws = new WebSocket('wss://broadcastlv.chat.bilibili.com/sub')
    this.roomid = roomid
    this.online = 0

    this.ws.on('open', (...params) => this.emit('open', ...params))
    this.ws.on('message', (...params) => this.emit('message', ...params))
    this.ws.on('close', (...params) => this.emit('close', ...params))

    this.send = data => this.ws.send(data)

    this.on('open', () => {
      const buf = encoder({ type: 'join', body: { uid: 0, roomid, protover: 2, platform: 'web', clientver: '1.8.5', type: 2 } })
      this.send(buf)
    })

    this.on('message', async buffer => {
      const packs = await decoder(buffer)
      packs.forEach(pack => {
        const { type, data } = pack
        if (type === 'welcome') {
          this.live = true
          this.emit('live')
          this.send(encoder({ type: 'heartbeat' }))
        }
        if (type === 'heartbeat') {
          this.online = data
          clearTimeout(this.timeout)
          this.timeout = setTimeout(() => this.heartbeat(), 1000 * 30)
          this.emit('heartbeat', this.online)
        }
        if (type === 'message') {
          this.emit('msg', data)
          const cmd = data.cmd || (data.msg && data.msg.cmd)
          if (cmd) {
            if (cmd.includes('DANMU_MSG')) {
              this.emit('DANMU_MSG', data)
            } else {
              this.emit(cmd, data)
            }
          }
        }
      })
    })
  }

  close() {
    clearTimeout(this.timeout)
    this.ws.close()
  }

  terminate() {
    clearTimeout(this.timeout)
    this.ws.terminate()
  }

  heartbeat() {
    if (this.readyState === 1) {
      this.send(encoder({ type: 'heartbeat' }))
    }
  }

  getOnline() {
    this.heartbeat()
    return new Promise(resolve => this.once('heartbeat', resolve))
  }
}

module.exports = { LiveWS }
