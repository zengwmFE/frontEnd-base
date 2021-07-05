## HTTP/3
- 运行在QUIC之上的HTTP被称为http/3(HTTP over QUIC)
- QUIC协议（quick UDP Internect Connection）基于UDP协议，正是看中了UDP的速度与效率，同时QUIC也整合了TCP、TLS和HTTP/2的优点，并加以优化
- 特点
  - 减少了握手的延迟（1-RTT或者0-RTT）RTT（往返时间）
  - 多路复用，并且没有TCP阻塞问题
  - 连接迁移，（主要是在客户端），当由wifi转移到4g的时候，连接不会被断开
- HTTP3跟HTTP/1.1和HTTP/2没有直接的关系