### Node 端事件循环

`node`中的事件循环是在`libuv`中实现的，
![](https://github.com/zengwmFE/project-image/blob/main/node_loop.png)

上图所示，`libuv`中的事件循环主要有 7 个阶段，他们按照顺序依次为：

- `timers`阶段：这个阶段执行`setInverval`和`setTimeout`注册回调函数
- `pending callbacks`阶段：这个阶段会执行除了`close`事件回调，被`timers`设定的回调，`setImmdiate`设定的回调之外的回调函数
- `idle,prepare`阶段：供`node`内部使用
- `pool`阶段：获取新的`I/O`事件
- `check`阶段：执行`setImmediate`注册的回调函数
- `close callbacks`阶段: 执行`socket.on('close',...)`等回调函数

Node 中任务的比较

1. 比较 setImmediate 和 setTimeout 的执行顺序

```
setTimeout(()=>{
  console.log('timeout')
})
setImmedidate(()=>{
  console.log('immediate')
})
```

这个需要考虑执行环境的原因，因为可能在`timers`，`setTimeout`的回调，并没有被注册到，然后在`check`阶段，执行了`setImmedidate`，`setTimeout`就要到下个阶段才能执行了

2. process.nextTick
   每个阶段执行完成后，在当前阶段的尾部触发`nextTick`

3. process.nextTick 和 setImmediate
   由于执行每个阶段前都会执行`process.nextTick`，那么，如果当从`poll`阶段到`check`阶段的时候，那么就一定

### node 执行的区别

node11 以前，会执行完所有这个阶段的任务，才会执行这个阶段剩下的微任务

node11 之后，执行完一个阶段的宏任务，就会立即执行对应的微任务队列
