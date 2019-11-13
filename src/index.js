const EventEmitter = require('events')

const WebSocket = require('ws')

const { encoder, decoder } = require('./buffer')

class Live extends EventEmitter {
  constructor(roomid) {
    if (typeof roomid !== 'number' || Number.isNaN(roomid)) {
      throw new Error(`roomid ${roomid} must be Number not NaN`)
    }

    super()

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

    this.on('open', () => {
      const buf = encoder({ type: 'join', body: { uid: 0, roomid, protover: 2, platform: 'web', clientver: '1.8.5', type: 2 } })
      this.send(buf)
    })

    this.on('close', () => {
      clearTimeout(this.timeout)
    })
  }

  heartbeat() {
    this.send(encoder({ type: 'heartbeat' }))
  }

  getOnline() {
    this.heartbeat()
    return new Promise(resolve => this.once('heartbeat', resolve))
  }
}

class LiveWS extends Live {
  /**
   * @param {number} roomid
   */
  constructor(roomid) {
    super(roomid)

    this.ws = new WebSocket('wss://broadcastlv.chat.bilibili.com/sub')
    this.roomid = roomid
    this.online = 0

    this.ws.on('open', (...params) => this.emit('open', ...params))
    this.ws.on('message', (...params) => this.emit('message', ...params))
    this.ws.on('close', (...params) => this.emit('close', ...params))

    this.ws.on('error', (...params) => this.emit('error', ...params))

    this.send = data => {
      if (this.ws.readyState === 1) {
        this.ws.send(data)
      }
    }
  }

  close() {
    this.ws.close()
  }
}

module.exports = { LiveWS }
