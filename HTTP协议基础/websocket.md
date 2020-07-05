
## websocket通信
一开始websocket作为html5的一部分，2011年websocket被RFC6455-the websocket protocol独立成标准.


### websocket
websocket，即浏览器和客户端的全双工通信标准


### websocket协议
一旦客户端与服务器建立起webscoket协议的通信连接，由于websocket协议是基于http协议的，请求依然只能通过客户端发起，但是连接期间无论是客户端还是服务器都能直接向对方发送报文。

**websocket协议的特点**

1. 推送功能
2. 减少通信量，只要建立了websocket请求，就希望一直连接，和http相比不但每一次连接的总开销减少了，websocket的头部较http头部也相对来说要更小，通信量也要更少！

**websocket连接handshaking**
1. 为了实现websocket，需要用到http的upgrade首部字段
```
Upgrade：websocket
connection：Upgrade
sec-websocket-key：xxx
sec-websocket-protocol：chat
sec-websocket-version：13.0
```

握手响应
返回响应码为101（switching protocols）
```
Upgrade：websocket
connection：Upgrade
sec-websocket-Accept：xxx
sec-websocket-protocol：chat
```
其中`sec-websocket-Accept`是根据请求头中`sec-websocket-key`来生成的。
一旦lianjie
