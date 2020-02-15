import { EventEmitter } from 'events'
import net, { Socket } from 'net'

import WebSocket from 'ws'

import { encoder, decoder } from './buffer'

const relayEvent = Symbol('relay')

class NiceEventEmitter extends EventEmitter {
  emit(eventName: string | symbol, ...params: any[]) {
    super.emit(eventName, ...params)
    super.emit(relayEvent, eventName, ...params)
    return true
  }
}

type EventMap = {
  [relayEvent]: any[]
  close: [number?, string?]
  open: []
  _error: [Error]
  error: [Error]
  live: []
  msg: [any]
  heartbeat: [number]
  timeout: []
  DANMU_MSG: [object]
  message: [Buffer]
}

interface Live {
  on<E extends keyof EventMap>(eventName: E, listener: (...data: EventMap[E]) => void): any
  once<E extends keyof EventMap>(eventName: E, listener: (...data: EventMap[E]) => void): any
  emit<E extends keyof EventMap>(eventName: E, ...data: EventMap[E]): boolean
}

class Live extends NiceEventEmitter {
  roomid: number
  online: number
  live: boolean
  timeout: ReturnType<typeof setTimeout>

  send: (data: Buffer) => void
  close: () => void

  constructor(roomid: number, { send, close }: { send: (data: Buffer) => void, close: () => void }) {
    if (typeof roomid !== 'number' || Number.isNaN(roomid)) {
      throw new Error(`roomid ${roomid} must be Number not NaN`)
    }

    super()
    this.roomid = roomid
    this.online = 0
    this.live = false
    this.timeout = setTimeout(() => { }, 0)

    this.send = send
    this.close = close

    this.on('message', async buffer => {
      const packs = await decoder(buffer)
      packs.forEach(pack => {
        const { type, data } = pack
        if (type === 'welcome') {
          this.live = true
          this.emit('live')
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
      this.send(buf)
    })

    this.on('close', () => {
      clearTimeout(this.timeout)
    })

    this.on('_error', error => {
      this.close()
      this.emit('error', error)
    })
  }

  heartbeat() {
    this.send(encoder('heartbeat'))
  }

  getOnline() {
    this.heartbeat()
    return new Promise<number>(resolve => this.once('heartbeat', resolve))
  }
}

export class LiveWS extends Live {
  ws: WebSocket

  constructor(roomid: number, { address = 'wss://broadcastlv.chat.bilibili.com/sub' } = {}) {
    const ws = new WebSocket(address)
    const send = (data: Buffer) => {
      if (ws.readyState === 1) {
        ws.send(data)
      }
    }
    const close = () => this.ws.close()

    super(roomid, { send, close })

    ws.on('open', (...params) => this.emit('open', ...params))
    ws.on('message', data => this.emit('message', data as Buffer))
    ws.on('close', (code, reason) => this.emit('close', code, reason))
    ws.on('error', error => this.emit('_error', error))

    this.ws = ws
  }
}

export class LiveTCP extends Live {
  socket: Socket
  buffer: Buffer

  constructor(roomid: number, { host = 'broadcastlv.chat.bilibili.com', port = 2243 } = {}) {
    const socket = net.connect(port, host)
    const send = (data: Buffer) => {
      socket.write(data)
    }
    const close = () => this.socket.end()

    super(roomid, { send, close })

    this.buffer = Buffer.alloc(0)

    socket.on('ready', () => this.emit('open'))
    socket.on('close', () => this.emit('close'))
    socket.on('error', (...params) => this.emit('_error', ...params))
    socket.on('data', buffer => {
      this.buffer = Buffer.concat([this.buffer, buffer])
      this.splitBuffer()
    })
    this.socket = socket
  }

  splitBuffer() {
    while (this.buffer.length >= 4 && this.buffer.readInt32BE(0) <= this.buffer.length) {
      const size = this.buffer.readInt32BE(0)
      const pack = this.buffer.slice(0, size)
      this.buffer = this.buffer.slice(size)
      this.emit('message', pack)
    }
  }
}



const keepLive = (Base: typeof LiveWS | typeof LiveTCP) => class extends EventEmitter {
  params: [number, any?]
  closed: boolean
  interval: number
  timeout: number
  connection: InstanceType<typeof Base>

  constructor(...params: ConstructorParameters<typeof Base>) {
    super()
    this.params = params
    this.closed = false
    this.interval = 100
    this.timeout = 45 * 1000
    this.connection = new Base(...this.params)
    this.connect(false)
  }

  connect(reconnect = true) {
    if (reconnect) {
      this.connection = new Base(...this.params)
    }
    const connection = this.connection

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
    return this.connection.online
  }

  get roomid() {
    return this.connection.roomid
  }

  close() {
    this.closed = true
    this.connection.close()
  }

  heartbeat() {
    return this.connection.heartbeat()
  }

  getOnline() {
    return this.connection.getOnline()
  }

  send(data: Buffer) {
    return this.connection.send(data)
  }
}


export interface KeepLiveWS {
  on<E extends keyof EventMap>(eventName: E, listener: (...data: EventMap[E]) => void): any
  once<E extends keyof EventMap>(eventName: E, listener: (...data: EventMap[E]) => void): any
  emit<E extends keyof EventMap>(eventName: E, ...data: EventMap[E]): boolean
}

export interface KeepLiveTCP {
  on<E extends keyof EventMap>(eventName: E, listener: (...data: EventMap[E]) => void): any
  once<E extends keyof EventMap>(eventName: E, listener: (...data: EventMap[E]) => void): any
  emit<E extends keyof EventMap>(eventName: E, ...data: EventMap[E]): boolean
}

export class KeepLiveWS extends keepLive(LiveWS) { }
export class KeepLiveTCP extends keepLive(LiveTCP) { }
