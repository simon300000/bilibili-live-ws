const EventEmitter = require('events')
const net = require('net')

const WebSocket = require('ws')

const { encoder, decoder } = require('./buffer')

class Live extends EventEmitter {
  constructor(roomid) {
    if (typeof roomid !== 'number' || Number.isNaN(roomid)) {
      throw new Error(`roomid ${roomid} must be Number not NaN`)
    }

    super()
    this.roomid = roomid
    this.online = 0

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

    this.on('_error', (...params) => {
      this.close()
      this.emit('error', ...params)
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
   * @param {number} roomid  房间号
   * @param {string} address WebSocket url
   */
  constructor(roomid, address = 'wss://broadcastlv.chat.bilibili.com/sub') {
    super(roomid)

    const ws = new WebSocket(address)
    this.ws = ws

    ws.on('open', (...params) => this.emit('open', ...params))
    ws.on('message', (...params) => this.emit('message', ...params))
    ws.on('close', (...params) => this.emit('close', ...params))
    ws.on('error', (...params) => this.emit('_error', ...params))

    this.send = data => {
      if (ws.readyState === 1) {
        ws.send(data)
      }
    }
  }

  close() {
    this.ws.close()
  }
}

class LiveTCP extends Live {
  /**
   * @param {number} roomid 房间号
   * @param {string} host   TCP Host
   * @param {number} port   TCP 端口
   */
  constructor(roomid, host = 'broadcastlv.chat.bilibili.com', port = 2243) {
    super(roomid)

    const socket = net.connect(port, host)
    this.socket = socket
    this.buffer = Buffer.alloc(0)

    socket.on('ready', (...params) => this.emit('open', ...params))
    socket.on('close', (...params) => this.emit('close', ...params))
    socket.on('error', (...params) => this.emit('_error', ...params))

    socket.on('data', buffer => {
      this.buffer = Buffer.concat([this.buffer, buffer])
      this.splitBuffer()
    })

    this.send = data => {
      socket.write(data)
    }
  }

  splitBuffer() {
    while (this.buffer.length >= 4 && this.buffer.readInt32BE(0) <= this.buffer.length) {
      const size = this.buffer.readInt32BE(0)
      const pack = this.buffer.slice(0, size)
      this.buffer = this.buffer.slice(size)
      this.emit('message', pack)
    }
  }

  close() {
    this.socket.end()
  }
}

module.exports = { LiveWS, LiveTCP }
