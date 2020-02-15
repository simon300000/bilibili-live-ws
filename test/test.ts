import { once } from 'events'

import { assert } from 'chai'

import { LiveWS, LiveTCP, KeepLiveWS, KeepLiveTCP } from '..'

Object.entries({ LiveWS, LiveTCP, KeepLiveWS, KeepLiveTCP })
  .forEach(([name, Live]) => {
    describe(name, function() {
      this.timeout(1000 * 25)
      context('Connect', function() {
        it('online', async function() {
          const live = new Live(12235923)
          const [online] = await once(live, 'heartbeat')
          live.close()
          return assert.isAbove(online, 0)
        })
        it('roomid must be number', function() {
          //@ts-ignore
          return assert.throw(() => new Live('12235923'))
        })
        it('roomid can not be NaN', function() {
          return assert.throw(() => new Live(NaN))
        })
      })
      context('properties', function() {
        context('roomid', function() {
          Object.entries({ Mea: 12235923, nana: 21304638, fubuki: 11588230 })
            .forEach(([name, roomid]) => {
              it(`roomid ${name}`, async function() {
                const live = new Live(roomid)
                await once(live, 'live')
                live.close()
                return assert.strictEqual(live.roomid, roomid)
              })
            })
        })
        it('online', async function() {
          const live = new Live(12235923)
          const [online] = await once(live, 'heartbeat')
          live.close()
          return assert.strictEqual(online, live.online)
        })
      })
      context('functions', function() {
        it('close', async function() {
          const live = new Live(12235923)
          await once(live, 'heartbeat')
          const close = await new Promise(resolve => {
            live.on('close', () => resolve('closed'))
            live.close()
          })
          return assert.strictEqual(close, 'closed')
        })
        it('getOnline', async function() {
          const live = new Live(12235923)
          await once(live, 'live')
          const online = await live.getOnline()
          live.close()
          return assert.isAbove(online, 0)
        })
        if (name.includes('Keep')) {
          it('close and reopen', async function() {
            const live = new (Live as typeof KeepLiveWS | typeof KeepLiveTCP)(12235923)
            await once(live, 'live')
            live.connection.close()
            await once(live, 'live')
            live.close()
          })
        } else {
          it('close on error', async function() {
            const live = new Live(12235923)
            await once(live, 'heartbeat')
            const close = await new Promise(resolve => {
              live.on('close', () => resolve('closed'))
              live.on('error', () => { })
              live.emit('_error', Error())
            })
            return assert.strictEqual(close, 'closed')
          })
        }
      })
      context('options', function() {
        it('protover: 1', async function() {
          const live = new Live(12235923, { protover: 1 })
          const [online] = await once(live, 'heartbeat')
          live.close()
          return assert.isAbove(online, 0)
        })
        if (name.includes('WS')) {
          it('address', async function() {
            const live = new Live(12235923, { address: 'wss://broadcastlv.chat.bilibili.com:2245/sub' })
            const [online] = await once(live, 'heartbeat')
            live.close()
            return assert.isAbove(online, 0)
          })
        } else if (name.includes('TCP')) {
          it('host, port', async function() {
            const live = new Live(12235923, { host: 'broadcastlv.chat.bilibili.com', port: 2243 })
            const [online] = await once(live, 'heartbeat')
            live.close()
            return assert.isAbove(online, 0)
          })
        } else {
          throw new Error('no options test')
        }
      })
    })
  })
