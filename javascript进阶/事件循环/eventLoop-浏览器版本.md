## event Loop

`JS`是一门单线程的语言，从名字就知道，在整个`JS`执行的过程中，有且只能存在一个**线程（主线程）**：是操作系统能运算调度的最小单位。它被包含在`进程`当中，是`进程`的实际运作单位。一条线程指的是进程中一个单一顺序的控制流，一个进程内可以包含多个线程，**每个线程并行执行不同的任务**。线程的特点：

- 轻量实体
- 独立调度和分派的基本单位
- 可以并发执行
- 共享线程资源

**进程是资源分配的基本单位**

### 浏览器端事件循环

在浏览器中，为了避免因为大资源（图片，外部文件等）导致页面等待加载，出现页面停止渲染而卡住，所以浏览器将任务分为：① 同步任务；② 异步任务；

![](https://github.com/zengwmFE/frontEnd-base/blob/master/image/15fdd88994142347.png)

1. 同步任务和异步任务，在执行过程中，会进入不同的执行“场所”，同步任务会进入主线程，异步任务会进入一个`event table`注册回调函数。
2. 然后将回调函数放入`event queue`事件队列，等待同步任务全部执行完成
3. 当同步任务执行完毕，主线程就会去`event queue`读取回调函数，然后执行
4. 当所有任务执行完成，线程会等待，同时去`js`引擎不断检查主线程是否为空，如果有，重复刚才的过程。这就是常说的事件循环（eventLoop）

**补充**

> 在`js引擎`当中，有一个`monitor process`进程会不断去检查主线程的是否为空，保证当主线程为空的时候，去读取`event queue`的回调函数来执行

```
var a = [1,2,3]
$.ajax({
    url:xxx,
    data:a,
    method: 'post'
    success:() => {
        console.log('data获取!');
    }
})
console.log('结束');
```

1. 整个`javascript脚本开始执行`，`a=[1,2,3]`放入主线程中执行
2. `ajax`请求呗放入到`event table`，注册`success`回调函数
3. 执行`console.log("结束")`，然后执行`success`回调函数

---

- 这个是 2 个事件队列的例子

```
console.log('首次执行')

setTimeout(() => {
  console.log('我是timeOut的执行回调')
}, 0)

new Promise((resolve) => {
  resolve(1)
}).then((data) => {
  console.log(data)
})
console.log('结束')
```

两个都存在`callback`函数，所以输出应该是`我是timeOut的执行回调,1`
但是事实上是：`1,我是timeOut的执行回调`，所以说，同样是`回调函数`,在执行的顺序是有差别的。这里涉及到两个概念：宏任务(macrotask)和微任务(microtask)

**macro-task 大致分为**

- script（整体代码）
- setTimeout
- setInterval
- setImmediate
- I/O
- UIrender
  **microtask 大致分为**
- process.nextTick（node 版的 setTimeout）
- Promise
- Async await
- MutationObserver(HTML5 新特性)

在针对于微任务和宏任务基本的调度应该是：

![](https://github.com/zengwmFE/frontEnd-base/blob/master/image/marmic.png)

1. 从宏任务队列中，取出第一个任务执行，执行完成
2. 查看微任务队列中是否有可以执行的任务，有，则执行所有的微任务，否，重新执行下一个宏任务，如果产生了微任务，则将微任务注册到微任务队列中。
3. 然后继续访问微任务队列是否有内容。重复这个过程

例子：

```
console.log('script start')

async function async1() {
await async2()
console.log('async1 end')
}
async function async2() {
console.log('async2 end')
}
async1()

setTimeout(function() {
console.log('setTimeout')
}, 0)

new Promise(resolve => {
console.log('Promise')
resolve()
})
.then(function() {
console.log('promise1')
})
.then(function() {
console.log('promise2')
})

console.log('script end')
// script start => async2 end => Promise => script end => async1 end=> promise1 => promise2 => setTimeout

```

**async 和 await**

> async 会隐式的返回一个`promise`,也就是说在 await 执行完之后，会往微任务队列内增加一个`微任务`

### Node 端事件循环

浏览器中有事件循环，`node`中也有，事件循环是`node`处理非阻塞`I/O`操作的机制，`node`中事件循环的实现是依靠的`libuv`引擎。

**宏任务大概包括：**

- setTimeout
- setInterval
- SetImmdidate
- script整体代码
- I/O操作

**微任务包括**

- process.nextTick(与普通的微任务有区别，在微任务队列之前执行)
- new Promise().then等

