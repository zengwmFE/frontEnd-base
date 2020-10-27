## nextTick 原理分析
**官方介绍:**

> `Vue`异步执行`DOM`更新。只要观察到数据变化，`Vue`将开启一个队列，并缓冲在同一事件循环中发生的所有数据改变。

提出问题：
1. `nextTick`是怎么监听到`DOM`数据发生了改变？才能获取到这个数据的！
2. 多次操作对同一个数值，进行操作，会多次更改吗？

### 源码

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

1. 优先使用原生`Promise`
2. 在判断`MutationObserver`
3. 然后判断`setImmdiate`
4. 最后使用`setTimeout`

首先我们知道，在这里面，`Promise`和`MutationObserver`属于`micotask`而`setImmdiate`和`setTimeout`属于`macrotask`的范畴

源码介绍到这里，行数比较少，并没有这里对`DOM`获取更改，有实际性代码展示，所以问题并没有解决，**得从`VUE`源码来找到`nextTick`怎么监听`DOM`数据的变化，从而获取到新数据的，并且怎么解决多次改变数据，产生的副作用的**,首先我们来看一下`nextTick`的使用情景

1. 在`beforeCreate`或者`Create`生命周期要对`DOM`进行操作，在这两个周期可以知道，`DOM`还没有被挂载数据甚至还没有初始化`DOM`，所以在这里进行`DOM`操作是不太好的，这是需要将`DOM`放到`this.$nextTick`
2. 修改数据后，及时获取`DOM`的数据



#### 修改了数据

```
this.newValue = 'this is a new Value'
this.$nextTick(()=>{
  console.log(xxx.getElementById('#id').innerHTML)
})
```
1. 使用`setter`,通知订阅了`newValue`属性的所有的`watcher`
2. `watcher`收到通知，接着把自己放入到待更新的数组
2. 执行`nextTick(flushSchedulerQueue)`,将`flushSchedulerQueue`存到`nextTick`中的`callbacks`