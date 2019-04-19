const { inflate } = require('zlib')
const { promisify } = require('util')
const inflateAsync = promisify(inflate)

const blank = Buffer.alloc(16)

// https://github.com/lovelyyoshino/Bilibili-Live-API/blob/master/API.WebSocket.md

const decoder = async buffer => {
  let packs = []
  let size
  for (let i = 0; i < buffer.length; i += size) {
    size = buffer.readInt32BE(i)
    packs.push(buffer.slice(i, i + size))
  }
  for (let i = 0; i < packs.length; i++) {
    let buf = packs[i]

    let body = buf.slice(16)
    let protocol = buf.readInt16BE(6)
    let operation = buf.readInt32BE(8)

    let type
    if (operation === 3) {
      type = 'heartbeat'
    }
    if (operation === 5) {
      type = 'message'
    }
    if (operation === 8) {
      type = 'welcome'
    }

    let data
    if (protocol === 0) {
      data = JSON.parse(String(body))
    }
    if (protocol === 1 && body.length) {
      data = body.readUIntBE(0, body.length)
    }
    if (protocol === 2) {
      data = await decoder((await inflateAsync(body)))
    }

    let pack = { buf, type, protocol, data }
    packs[i] = pack
  }

  let realPack = []
  for (let i = 0; i < packs.length; i++) {
    if (packs[i].protocol === 2) {
      realPack = realPack.concat(packs[i].data)
    } else {
      realPack.push(packs[i])
    }
  }
  return realPack
}

const encoder = ({ type, body = '[object Object]' }) => {
  if (typeof body !== 'string') {
    body = JSON.stringify(body)
  }
  let head = Buffer.from(blank)
  let buffer = Buffer.from(body)

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

module.exports = { encoder, decoder }
