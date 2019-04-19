const WebSocket = require('ws')

const { encoder, decoder } = require('./buffer')

class LiveWS {
  constructor(roomid) {
    this.roomid = roomid
    this.online = 0
    this.ws = new WebSocket('wss://broadcastlv.chat.bilibili.com/sub')

    this.ws.on('open', () => {
      let buf = encoder({ type: 'join', body: { uid: 0, roomid, protover: 2, platform: 'web', clientver: '1.6.3', type: 2 } })
      // console.log(buf)
      this.ws.send(buf)
    })

    this.ws.on('message', async buffer => {
      let packs = await decoder(buffer)
      for (let i = 0; i < packs.length; i++) {
        if (packs[i].type === 'welcome') {
          this.ws.send(encoder({ type: 'heartbeat' }))
        }
        if (packs[i].type === 'heartbeat') {
          this.online = packs[i].data
          this.heartbeat()
        }
      }
    })
  }
  wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
  async heartbeat() {
    await this.wait(1000 * 30)
    this.ws.send(encoder({ type: 'heartbeat' }))
  }
}

module.exports = LiveWS
