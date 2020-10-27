### Node 端事件循环

`node`中的事件循环是在`libuv`中实现的，
![](https://github.com/zengwmFE/project-image/blob/main/node_loop.png)

上图所示，`libuv`中的事件循环主要有7个阶段，他们按照顺序依次为：
- `timers`阶段：这个阶段执行`setInverval`和`setTimeout`注册回调函数
- `pending callbacks`阶段：这个阶段会执行除了`close`事件回调，被`timers`设定的回调，`setImmdiate`设定的回调之外的回调函数
- `idle,prepare`阶段：供`node`内部使用
- `pool`阶段：获取新的`I/O`事件
- `check`阶段：执行`setImmediate`注册的回调函数
- `close callbacks`阶段: 执行`socket.on('close',...)`等回调函数