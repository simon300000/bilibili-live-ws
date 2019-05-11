# bilibili-live-ws [![npm](https://img.shields.io/npm/v/bilibili-live-ws.svg)](https://www.npmjs.com/package/bilibili-live-ws)

Bilibili 直播WebSocket API

## API

```javascript
const LiveWS = require('bilibili-live-ws')
let ws = new LiveWS(roomid)
```

举个栗子:

```javascript
let ws = new LiveWS(14327465)

ws.on('open', () => console.log('Connection is established'))
// Connection is established
ws.on('live', () => {
  ws.on('heartbeat', console.log)
  // 20603
})
```

## Class: LiveWS

LiveWS extends [WebSocket](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocket)

### new LiveWS(roomid)

- `roomid` 房间号

  比如 https://live.bilibili.com/14327465 中的 `14327465`

#### ws.on('open')

WebSocket连接上了

#### ws.on('live')

成功登入房间

#### ws.on('heartbeat')

收到服务器心跳包，会在30秒之后自动发送心跳包。

- `Data` 当前人气值

#### ws.on('msg')

- `Data` 收到信息/弹幕/广播等

  Data的例子: (我simon3000送了一个辣条)

  ```javascript
  {
    cmd: 'SEND_GIFT',
    data: {
      giftName: '辣条',
      num: 1,
      uname: 'simon3000',
      face: 'http://i1.hdslb.com/bfs/face/c26b9f670b10599ad105e2a7fea4b5f21c0f0bcf.jpg',
      guard_level: 0,
      rcost: 2318827,
      uid: 3499295,
      top_list: [],
      timestamp: 1555690631,
      giftId: 1,
      giftType: 0,
      action: '喂食',
      super: 0,
      super_gift_num: 0,
      price: 100,
      rnd: '1555690616',
      newMedal: 0,
      newTitle: 0,
      medal: [],
      title: '',
      beatId: '0',
      biz_source: 'live',
      metadata: '',
      remain: 6,
      gold: 0,
      silver: 0,
      eventScore: 0,
      eventNum: 0,
      smalltv_msg: [],
      specialGift: null,
      notice_msg: [],
      capsule: null,
      addFollow: 0,
      effect_block: 1,
      coin_type: 'silver',
      total_coin: 100,
      effect: 0,
      tag_image: '',
      user_count: 0
    }
  }
  ```

#### ws.on(cmd)

用法如上，只不过只会收到特定cmd的Event。

比如 `ws.on('DANMU_MSG')` 只会收到弹幕Event，一个弹幕Event的Data例子如下: (我simon3000发了个`233`)

```javascript
{
  cmd: 'DANMU_MSG',
  info: [
    [0, 1, 25, 16777215, 1555692037, 1555690616, 0, 'c5c630b1', 0, 0, 0],
    '233',
    [3499295, 'simon3000', 0, 0, 0, 10000, 1, ''],
    [5, '財布', '神楽めあOfficial', 12235923, 5805790, ''],
    [11, 0, 6406234, '>50000'],
    ['title-58-1', 'title-58-1'],
    0,
    0,
    null,
    { ts: 1555692037, ct: '2277D56A' }
  ]
}
```



#### ws.heartbeat()

无视30秒时间，直接发送一个心跳包。

如果连接正常，会收到来自服务器的心跳包，也就是 `ws.on('heartbeat')`，可以用于更新人气值。

#### ws.close()

关闭WebSocket连接。

#### ws.getOnline()

立即调用 `ws.heartbeat()` 刷新人气数值，并且返回 Promise，resolve 人气刷新后数值

#### ws.on('message')

WebSocket收到的Raw Buffer（不推荐直接使用）

推荐参考<https://github.com/lovelyyoshino/Bilibili-Live-API/blob/master/API.WebSocket.md>

# 贡献

更多神奇用法请参照：[WebSocket](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocket)

欢迎Issue和Pull Request！