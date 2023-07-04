import { EventEmitter } from 'events'
import { Agent } from 'http'
import IsomorphicWebSocket from 'isomorphic-ws'

import { Inflates } from './buffer'
import { LiveOptions, Live } from './common'

export type WSOptions = LiveOptions & { address?: string, agent?: Agent }

export const isNode = !!IsomorphicWebSocket.Server

class WebSocket extends EventEmitter {
  ws: IsomorphicWebSocket

  constructor(address: string, inflates: Inflates, ...args: any[]) {
    super()

    const ws = new IsomorphicWebSocket(address, ...(isNode ? args : []))
    this.ws = ws

    ws.onopen = () => this.emit('open')
    ws.onmessage = isNode ? ({ data }) => this.emit('message', data) : async ({ data }) => this.emit('message', inflates.Buffer.from(await new Response(data as unknown as InstanceType<typeof Blob>).arrayBuffer()))
    ws.onerror = () => this.emit('error')
    ws.onclose = () => this.emit('close')
  }

  get readyState() {
    return this.ws.readyState
  }

  send(data: Buffer) {
    this.ws.send(data)
  }

  close(code?: number, data?: string) {
    this.ws.close(code, data)
  }
}

export class LiveWSBase extends Live {
  ws: InstanceType<typeof WebSocket>

  constructor(inflates: Inflates, roomid: number, { address = 'wss://broadcastlv.chat.bilibili.com/sub', agent, ...options }: WSOptions = {}) {
    const ws = new WebSocket(address, inflates, { agent })
    const send = (data: Buffer) => {
      if (ws.readyState === 1) {
        ws.send(data)
      }
    }
    const close = () => this.ws.close()

    super(inflates, roomid, { send, close, ...options })

    ws.on('open', (...params) => this.emit('open', ...params))
    ws.on('message', data => this.emit('message', data as Buffer))
    ws.on('close', (code, reason) => this.emit('close', code, reason))
    ws.on('error', error => this.emit('_error', error))

    this.ws = ws
  }
}
