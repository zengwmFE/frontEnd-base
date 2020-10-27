## nextTick 原理分析

**官方介绍:**

> `Vue`异步执行`DOM`更新。只要观察到数据变化，`Vue`将开启一个队列，并缓冲在同一事件循环中发生的所有数据改变。如果同一个`watcher`被多次触发，只会被推入到队列中一次。这种在缓冲时去除重复数据对于避免不必要的计算和`DOM`操作上非常重要。然后，在下一个的事件循**tick**中，`Vue`刷新队列并执行实际 (已去重的) 工作。`Vue`在内部尝试对异步队列使用原生的`Promise.then`和`MessageChannel`，如果执行环境不支持，会采用 `setTimeout(fn, 0)`代替。

### 作用

> `nextTick`用于延迟执行回调函数。可以看到，最多接收 2 个参数.当`cb`不存在的时候，会返回一个`Promise`实例，让`nextTick`可以使用`then`

```
export let isUsingMicroTask = false
const callbacks = []
let pending = false

function flushCallbacks () {
  pending = false
  const copies = callbacks.slice(0)
  callbacks.length = 0
  for (let i = 0; i < copies.length; i++) {
    copies[i]()
  }
}
let timerFunc
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  const p = Promise.resolve()
  timerFunc = () => {
    p.then(flushCallbacks)
    if (isIOS) setTimeout(noop)
  }
  isUsingMicroTask = true
} else if (!isIE && typeof MutationObserver !== 'undefined' && (
  isNative(MutationObserver) ||
  // PhantomJS and iOS 7.x
  MutationObserver.toString() === '[object MutationObserverConstructor]'
)) {
  // Use MutationObserver where native Promise is not available,
  // e.g. PhantomJS, iOS7, Android 4.4
  let counter = 1
  const observer = new MutationObserver(flushCallbacks)
  const textNode = document.createTextNode(String(counter))
  observer.observe(textNode, {
    characterData: true
  })
  timerFunc = () => {
    counter = (counter + 1) % 2
    textNode.data = String(counter)
  }
  isUsingMicroTask = true
} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {

  timerFunc = () => {
    setImmediate(flushCallbacks)
  }
} else {
  timerFunc = () => {
    setTimeout(flushCallbacks, 0)
  }
}

export function nextTick (cb?: Function, ctx?: Object) {
  let _resolve
  callbacks.push(() => {
    if (cb) {
      try {
        cb.call(ctx)
      } catch (e) {
        handleError(e, ctx, 'nextTick')
      }
    } else if (_resolve) {
      _resolve(ctx)
    }
  })
  if (!pending) {
    pending = true
    timerFunc()
  }
  if (!cb && typeof Promise !== 'undefined') {
    return new Promise(resolve => {
      _resolve = resolve
    })
  }
}
```

### 主函数和变量

- nextTick 入口函数
- callbacks 用来存储回调函数
- timerFunc 利用延迟方法来执行回调函数
- pending 执行状态

#### 两种写法

```
Vue.$nextTick(()=>{
  console.log('new Value')
})

Vue.$nextTick().then(()=>{
  console.log('new Value')
})
```

#### 调用 timerFunc

```
if (!pending) {
    pending = true
    timerFunc()
}
```
