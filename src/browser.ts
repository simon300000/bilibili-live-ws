import { inflates } from './inflate/browser'
import { LiveWSBase, WSOptions } from './ws'
import { KeepLive } from './common'

export { WSOptions }
export { LiveOptions, relayEvent } from './common'

export class LiveWS extends LiveWSBase {
  constructor(roomid: number, opts?: WSOptions) {
    super(inflates, roomid, opts)
  }
}

export class KeepLiveWS extends KeepLive<typeof LiveWSBase> {
  constructor(roomid: number, opts?: WSOptions) {
    super(LiveWSBase, inflates, roomid, opts)
  }
}
