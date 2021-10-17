import { inflates } from './inflate/node'
import { LiveWSBase, WSOptions } from './ws'
import { LiveTCPBase, TCPOptions } from './tcp'
import { KeepLive } from './common'

export { getConf, getRoomid } from './extra'
export { TCPOptions, WSOptions }
export { LiveOptions, relayEvent } from './common'

export class LiveWS extends LiveWSBase {
  constructor(roomid: number, opts?: WSOptions) {
    super(inflates, roomid, opts)
  }
}

export class LiveTCP extends LiveTCPBase {
  constructor(roomid: number, opts?: TCPOptions) {
    super(inflates, roomid, opts)
  }
}

export class KeepLiveWS extends KeepLive<typeof LiveWSBase> {
  constructor(roomid: number, opts?: WSOptions) {
    super(LiveWSBase, inflates, roomid, opts)
  }
}


export class KeepLiveTCP extends KeepLive<typeof LiveTCPBase> {
  constructor(roomid: number, opts?: TCPOptions) {
    super(LiveTCPBase, inflates, roomid, opts)
  }
}
