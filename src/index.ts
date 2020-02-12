import { EventEmitter } from 'events'
import net, { Socket } from 'net'

import WebSocket from 'ws'

import { encoder, decoder } from './buffer'

const relayEvent = Symbol('relay')

class NiceEventEmitter extends EventEmitter {
  emit(eventName: string, ...params: any[]) {
    super.emit(eventName, ...params)
    super.emit(relayEvent, eventName, ...params)
    return true
  }
}

class Live extends NiceEventEmitter {
  roomid: number
  online: number
  live: boolean
  timeout: ReturnType<typeof setTimeout>

  constructor(roomid: number) {
    if (typeof roomid !== 'number' || Number.isNaN(roomid)) {
      throw new Error(`roomid ${roomid} must be Number not NaN`)
    }

    super()
    this.roomid = roomid
    this.online = 0
    this.live = false
    this.timeout = setTimeout(() => { }, 0)

    this.on('message', async buffer => {
      const packs = await decoder(buffer)
      packs.forEach(pack => {
        const { type, data } = pack
        if (type === 'welcome') {
          this.live = true
          this.emit('live')
          //@ts-ignore
          this.send(encoder('heartbeat'))
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
      const buf = encoder('join', { uid: 0, roomid, protover: 2, platform: 'web', clientver: '1.8.5', type: 2 })
      //@ts-ignore
      this.send(buf)
    })

    this.on('close', () => {
      clearTimeout(this.timeout)
    })

    this.on('_error', (...params) => {
      //@ts-ignore
      this.close()
      this.emit('error', ...params)
    })
  }

  heartbeat() {
    //@ts-ignore
    this.send(encoder('heartbeat'))
  }

  getOnline() {
    this.heartbeat()
    return new Promise(resolve => this.once('heartbeat', resolve))
  }
}

interface LiveUpstream {
  send(data: Buffer): void
}

export class LiveWS extends Live implements LiveUpstream {
  ws: WebSocket
  send: (data: Buffer) => void

  constructor(roomid: number, address = 'wss://broadcastlv.chat.bilibili.com/sub') {
    super(roomid)

    const ws = new WebSocket(address)
    this.ws = ws

    ws.on('open', (...params) => this.emit('open', ...params))
    ws.on('message', (...params) => this.emit('message', ...params))
    ws.on('close', (...params) => this.emit('close', ...params))
    ws.on('error', (...params) => this.emit('_error', ...params))

    this.send = (data) => {
      if (ws.readyState === 1) {
        ws.send(data)
      }
    }
  }

  close() {
    this.ws.close()
  }
}

export class LiveTCP extends Live implements LiveUpstream {
  socket: Socket
  buffer: Buffer
  send: (data: Buffer) => void

  constructor(roomid: number, host = 'broadcastlv.chat.bilibili.com', port = 2243) {
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

const keepLive = <B = LiveTCP | LiveWS>(Base: B) => class extends EventEmitter {
  //@ts-ignore
  params: ConstructorParameters<B>
  closed: boolean
  interval: number
  timeout: number
  connection?: B

  //@ts-ignore
  constructor(...params: ConstructorParameters<B>) {
    super()
    this.params = params
    this.closed = false
    this.interval = 100
    this.timeout = 45 * 1000
    this.connect()
  }

  connect() {
    //@ts-ignore
    const connection = new Base(...this.params)
    this.connection = connection

    let timeout = setTimeout(() => {
      connection.close()
      connection.emit('timeout')
    }, this.timeout)

    connection.on(relayEvent, (eventName: string, ...params: any[]) => this.emit(eventName, ...params))

    connection.on('error', (e: any) => this.emit('e', e))
    connection.on('close', () => {
      if (!this.closed) {
        setTimeout(() => this.connect(), this.interval)
      }
    })

    connection.on('heartbeat', () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        connection.close()
        connection.emit('timeout')
      }, this.timeout)
    })

    connection.on('close', () => {
      clearTimeout(timeout)
    })
  }

  get online() {
    //@ts-ignore
    return this.connection?.online
  }

  get roomid() {
    //@ts-ignore
    return this.connection?.roomid
  }

  close() {
    this.closed = true
    // @ts-ignore
    this.connection.close()
  }

  heartbeat() {
    // @ts-ignore
    return this.connection.heartbeat()
  }

  getOnline() {
    // @ts-ignore
    return this.connection.getOnline()
  }

  send(data: Buffer) {
    // @ts-ignore
    return this.connection.send(data)
  }
}

export class KeepLiveWS extends keepLive(LiveWS) { }
export class KeepLiveTCP extends keepLive(LiveTCP) { }
