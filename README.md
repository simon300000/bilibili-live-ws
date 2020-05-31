# bilibili-live-ws [![npm](https://img.shields.io/npm/v/bilibili-live-ws.svg)](https://www.npmjs.com/package/bilibili-live-ws) [![Coverage Status](https://coveralls.io/repos/github/simon300000/bilibili-live-ws/badge.svg?branch=master)](https://coveralls.io/github/simon300000/bilibili-live-ws?branch=master) ![Node CI](https://github.com/simon300000/bilibili-live-ws/workflows/Node%20CI/badge.svg)

Bilibili 直播 WebSocket/TCP API

LiveWS/KeepLiveWS 支持浏览器 *(实验性)*

## API

```javascript
const { LiveWS, LiveTCP, KeepLiveWS, KeepLiveTCP } = require('bilibili-live-ws')
const live = new LiveWS(roomid)
// 或
const live = new LiveTCP(roomid)
```

举个栗子:

```javascript
const live = new LiveWS(14275133)

live.on('open', () => console.log('Connection is established'))
// Connection is established
live.on('live', () => {
  live.on('heartbeat', console.log)
  // 74185
})
```

或者用TCP (新功能):

```javascript
const live = new LiveTCP(26283)

live.on('open', () => console.log('Connection is established'))
// Connection is established
live.on('live', () => {
  live.on('heartbeat', console.log)
  // 13928
})
```

> 晚上做梦梦到一个白胡子的老爷爷和我说TCP更节约内存哦！

## Class: LiveWS / LiveTCP / KeepLiveWS / KeepLiveTCP

(Keep)LiveWS 和 (Keep)LiveTCP 的大部分API基本上一样, 区别在本文末尾有注明

### new LiveWS(roomid [, { address, protover, key }])

### new LiveTCP(roomid [, { host, port, protover, key }])

- `roomid` 房间号

  比如 https://live.bilibili.com/14327465 中的 `14327465`
  
- `address` 可选, WebSocket连接的地址

  默认 `'wss://broadcastlv.chat.bilibili.com/sub'`

- `host` 可选, TCP连接的地址

  默认 `'broadcastlv.chat.bilibili.com'`

- `port` 可选, TCP连接的端口

  默认 `2243`
  
- `protover` 可选, 见 #17 

  默认 `2`
  
- `key` 可选, WS握手的Token

#### live.on('open')

WebSocket连接上了

#### live.on('live')

成功登入房间

#### live.on('heartbeat', (online) => ...)

收到服务器心跳包，会在30秒之后自动发送心跳包。

- `online` 当前人气值

#### live.on('msg', (data) => ...)

- `data` 收到信息/弹幕/广播等

  data的例子: (我simon3000送了一个辣条)

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

#### live.on(cmd, (data) => ...)

用法如上，只不过只会收到特定cmd的Event。

比如 `live.on('DANMU_MSG')` 只会收到弹幕Event，一个弹幕Event的Data例子如下: (我simon3000发了个`233`)

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



#### live.on('close')

连接关闭事件

#### live.on('error', (e) => ...)

连接 error 事件，连接同时也会关闭

#### live.heartbeat()

无视30秒时间，直接发送一个心跳包。

如果连接正常，会收到来自服务器的心跳包，也就是 `live.on('heartbeat')`，可以用于更新人气值。

#### live.close()

关闭WebSocket/TCP Socket连接。

#### live.getOnline()

立即调用 `live.heartbeat()` 刷新人气数值，并且返回 Promise，resolve 人气刷新后数值

#### live.on('message')

WebSocket/TCP收到的Raw Buffer（不推荐直接使用）

#### live.send(buffer)

使用 WebSocket 或者 TCP 发送信息

## getConf(roomid)

选一个cdn，Resolve host, address 和 key, 可以直接放进(Keep)LiveWS/TCP设置

(需要安装 got `npm i -S got`)

```typescript
const { getConf } = require('bilibili-live-ws/extra')

getConf(roomid)
// Return
Promise<{
    key: string;
    host: string;
    address: string;
}>
```

<hr>

### Keep和无Keep的区别

KeepLiveWS 和 KeepLiveTCP 有断线重新连接的功能

#### new KeepLiveWS(roomid [, { address, protover, key }])

#### new KeepLiveTCP(roomid [, { host, port, protover, key }])

所有上方的API都是一样的, 只不过会有以下微小的区别

* 收到error或者close事件的时候并不代表连接关闭, 必须要手动调用`live.close()`来关闭连接
* 内部的连接对象(`LiveWS`/`LiveTCP`)在`live.connection`中
* 内部的连接关闭了之后, 如果不是因为`live.close()`关闭, 会在100毫秒之后自动打开一个新的连接。
  * 这个100毫秒可以通过改变`live.interval`来设置
* 内部的boolean, `live.closed`, 用于判断是否是因为`live.close()`关闭。

<hr>

### LiveWS 和 LiveTCP 的区别

#### LiveWS.ws

LiveWS 内部 WebSocket 对象，需要时可以直接操作

Doc: <https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocket>

#### LiveTCP.socket

LiveTCP 内部 TCP Socket 对象，需要时可以直接操作

Doc: <https://nodejs.org/api/net.html#net_class_net_socket>

#### LiveTCP.buffer

LiveTCP内部TCP流的Buffer缓冲区，有不完整的包

#### LiveTCP.splitBuffer()

处理LiveTCP内部TCP流的Buffer缓冲区，把其中完整的包交给decoder处理

### BenchMark 简单对比

在连接了640个直播间后过了一分钟左右(@2.0.0)

|          | LiveWS (wss) | LiveWS (ws) | LiveTCP |
| -------- | ------------ | ----------- | ------- |
| 内存占用 | 63 MB        | 26 MB       | 18 MB   |

<hr>

参考资料: <https://github.com/lovelyyoshino/Bilibili-Live-API/blob/master/API.WebSocket.md>

# 贡献

欢迎Issue和Pull Request！
