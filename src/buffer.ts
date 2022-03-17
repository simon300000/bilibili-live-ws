import 'array-flat-polyfill'

import { Buffer } from 'buffer'
export { Buffer }
export type Inflates = { inflateAsync: (b: Buffer) => Buffer | Promise<Buffer>, brotliDecompressAsync: (b: Buffer) => Buffer | Promise<Buffer> }

const blank = Buffer.alloc(16)

// https://github.com/lovelyyoshino/Bilibili-Live-API/blob/master/API.WebSocket.md

const cutBuffer = (buffer: Buffer) => {
  const bufferPacks: Buffer[] = []
  let size: number
  for (let i = 0; i < buffer.length; i += size) {
    size = buffer.readInt32BE(i)
    bufferPacks.push(buffer.slice(i, i + size))
  }
  return bufferPacks
}

export const makeDecoder = ({ inflateAsync, brotliDecompressAsync }: Inflates) => {
  const decoder = async (buffer: Buffer) => {
    const packs = await Promise.all(cutBuffer(buffer)
      .map(async buf => {
        const body = buf.slice(16)
        const protocol = buf.readInt16BE(6)
        const operation = buf.readInt32BE(8)

        let type = 'unknow'
        if (operation === 3) {
          type = 'heartbeat'
        } else if (operation === 5) {
          type = 'message'
        } else if (operation === 8) {
          type = 'welcome'
        }

        let data: any
        if (protocol === 0) {
          data = JSON.parse(String(body))
        }
        if (protocol === 1 && body.length === 4) {
          data = body.readUIntBE(0, 4)
        }
        if (protocol === 2) {
          data = await decoder(await inflateAsync(body))
        }
        if (protocol === 3) {
          data = await decoder(await brotliDecompressAsync(body))
        }

        return { buf, type, protocol, data }
      }))

    return packs.flatMap(pack => {
      if (pack.protocol === 2 || pack.protocol === 3) {
        return pack.data as typeof packs
      }
      return pack
    })
  }

  return decoder
}

export const encoder = (type: string, body: any = '') => {
  if (typeof body !== 'string') {
    body = JSON.stringify(body)
  }
  const head = Buffer.from(blank)
  const buffer = Buffer.from(body)

  head.writeInt32BE(buffer.length + head.length, 0)
  head.writeInt16BE(16, 4)
  head.writeInt16BE(1, 6)
  if (type === 'heartbeat') {
    head.writeInt32BE(2, 8)
  }
  if (type === 'join') {
    head.writeInt32BE(7, 8)
  }
  head.writeInt32BE(1, 12)
  return Buffer.concat([head, buffer])
}
