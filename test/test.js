/* global describe */
/* global context */
/* global it */
const { LiveWS, LiveTCP } = require('..')

const { assert } = require('chai')

Object.entries({ LiveWS, LiveTCP })
  .forEach(([name, Live]) => {
    describe(name, function() {
      this.timeout(1000 * 15)
      context('Connect', function() {
        it('online', async function() {
          const ws = new Live(12235923)
          const online = await new Promise(resolve => ws.on('live', () => ws.on('heartbeat', resolve)))
          ws.close()
          return assert.isAbove(online, 0)
        })
        it('roomid must be number', function() {
          return assert.throw(() => new Live('12235923'))
        })
        it('roomid can not be NaN', function() {
          return assert.throw(() => new Live(NaN))
        })
      })
      context('functions', function() {
        it('close', async function() {
          const ws = new Live(12235923)
          const close = await new Promise(resolve => ws.on('live', () => ws.on('heartbeat', () => {
            ws.on('close', () => resolve('closed'))
            ws.close()
          })))
          return assert.strictEqual(close, 'closed')
        })
        it('getOnline', async function() {
          const ws = new Live(12235923)
          const online = await new Promise(resolve => ws.on('live', () => resolve(ws.getOnline())))
          ws.close()
          return assert.isAbove(online, 0)
        })
      })
    })
  })
