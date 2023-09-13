type GET_DANMU_INFO = {
  code: number
  message: string
  ttl: number
  data: {
    business_id: number
    group: string
    host_list: {
      host: string
      port: number
      wss_port: number
      ws_port: number
    }[]
    max_delay: number
    refresh_rate: number
    refresh_row_factor: number
    token: string
  }
}

export const getConf = async (roomid: number) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const raw = await fetch(`https://api.live.bilibili.com/xlive/web-room/v1/index/getDanmuInfo?id=${roomid}`).then(w => w.json()) as GET_DANMU_INFO
  const { data: { token: key, host_list: [{ host }] } } = raw
  const address = `wss://${host}/sub`
  return { key, host, address, raw }
}

export const getRoomid = async (short: number) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { data: { room_id } } = await fetch(`https://api.live.bilibili.com/room/v1/Room/mobileRoomInit?id=${short}`).then(w => w.json())
  return room_id
}
