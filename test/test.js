/* global describe */
/* global context */
/* global it */
const { LiveWS, LiveTCP } = require('..')

const { assert } = require('chai')

Object.entries({ LiveWS, LiveTCP })
  .forEach(([name, Live]) => {
    describe(name, function() {
      this.timeout(1000 * 25)
      context('Connect', function() {
        it('online', async function() {
          const live = new Live(12235923)
          const online = await new Promise(resolve => live.on('live', () => live.on('heartbeat', resolve)))
          live.close()
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
          const live = new Live(12235923)
          const close = await new Promise(resolve => live.on('live', () => live.on('heartbeat', () => {
            live.on('close', () => resolve('closed'))
            live.close()
          })))
          return assert.strictEqual(close, 'closed')
        })
        it('getOnline', async function() {
          const live = new Live(12235923)
          const online = await new Promise(resolve => live.on('live', () => resolve(live.getOnline())))
          live.close()
          return assert.isAbove(online, 0)
        })
        it('close on error', async function() {
          const live = new Live(12235923)
          const close = await new Promise(resolve => live.on('live', () => live.on('heartbeat', () => {
            live.on('close', () => resolve('closed'))
            live.emit('error')
          })))
          return assert.strictEqual(close, 'closed')
        })
      })
    })
  })
