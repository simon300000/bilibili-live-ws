import net, { Socket } from 'net'

import { Inflates } from './buffer'
import { LiveOptions, Live } from './common'

export type TCPOptions = LiveOptions & { host?: string, port?: number }

export class LiveTCPBase extends Live {
  socket: Socket
  buffer: Buffer
  i: number

  constructor(inflates: Inflates, roomid: number, { host = 'broadcastlv.chat.bilibili.com', port = 2243, protover, key }: TCPOptions = {}) {
    const socket = net.connect(port, host)
    const send = (data: Buffer) => {
      socket.write(data)
    }
    const close = () => this.socket.end()

    super(inflates, roomid, { send, close, protover, key })

    this.i = 0
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
      this.i++
      if (this.i > 5) {
        this.i = 0
        this.buffer = Buffer.from(this.buffer)
      }
      this.emit('message', pack)
    }
  }
}
