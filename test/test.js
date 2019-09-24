/* global describe */
/* global context */
/* global it */
const LiveWS = require('..')

const { assert } = require('chai')

describe('bilibili live ws', function() {
  this.timeout(1000 * 15)
  context('Connect', function() {
    it('online', async function() {
      const ws = new LiveWS(12235923)
      const online = await new Promise(resolve => ws.on('live', () => ws.on('heartbeat', resolve)))
      ws.close()
      return assert.isAbove(online, 0)
    })
    it('roomid must be number', function() {
      return assert.throw(() => new LiveWS('12235923'))
    })
    it('roomid can not be NaN', function() {
      return assert.throw(() => new LiveWS(NaN))
    })
  })
  context('functions', function() {
    it('close', async function() {
      const ws = new LiveWS(12235923)
      const close = await new Promise(resolve => ws.on('live', () => ws.on('heartbeat', () => {
        ws.on('close', () => resolve('closed'))
        ws.close()
      })))
      return assert.strictEqual(close, 'closed')
    })
    it('terminate', async function() {
      const ws = new LiveWS(12235923)
      const terminate = await new Promise(resolve => ws.on('live', () => ws.on('heartbeat', () => {
        ws.on('close', () => resolve('terminated'))
        ws.terminate()
      })))
      return assert.strictEqual(terminate, 'terminated')
    })
    it('getOnline', async function() {
      const ws = new LiveWS(12235923)
      const online = await new Promise(resolve => ws.on('live', () => resolve(ws.getOnline())))
      ws.terminate()
      return assert.isAbove(online, 0)
    })
  })
})
