## nextTick 原理分析

**官方介绍:**

> `Vue`异步执行`DOM`更新。只要观察到数据变化，`Vue`将开启一个队列，并缓冲在同一事件循环中发生的所有数据改变。

提出问题：

1. `nextTick`是怎么监听到`DOM`数据发生了改变？才能获取到这个数据的！
2. 多次操作对同一个数值，进行操作，会多次更改吗？

#### 两种写法

```
Vue.$nextTick(()=>{
  console.log('new Value')
})

Vue.$nextTick().then(()=>{
  console.log('new Value')
})
```

#### 结合使用情景分析 nextTick

1. 在`beforeCreate`或者`Create`生命周期要对`DOM`进行操作，在这两个周期可以知道，`DOM`还没有被挂载数据甚至还没有初始化`DOM`，所以在这里进行`DOM`操作是不太好的，这是需要将`DOM`放到`this.$nextTick`
2. 修改数据后，及时获取`DOM`的数据

```
this.newValue = 'this is a new Value'
this.$nextTick(()=>{
  console.log(xxx.getElementById('#id').innerHTML)
})
```

可以先看一下当`Data`数据改变的时候执行情况,`vue`是怎么处理的

```
class Watcher {
    addDep (dep: Dep) {
    // 添加进dep，同时进行去重
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
    }
    update () {
        queueWatcher(this) // 异步更新策略
    }
    run () {
        //  dom执行真正的更新
    }
}
```

1. 使用`setter`,通知订阅了`newValue`属性的所有的`watcher`
2. `watcher`收到通知，接着把自己放入到待更新的数组
3. 紧接着执行了`dep.notify()`,接着执行了`watch`的`update`,然后`queueWatcher`
4. 执行`nextTick(flushSchedulerQueue)`,将`flushSchedulerQueue`存到`nextTick`中的`callbacks`

> 这个地方为什么要将更新放入到数组，就是因为用户很有可能多次修改数据，如果发生修改就直接修改了到`DOM`，那就会导致大量的渲染。所以他在`queueWatcher`中判断是否出现相同的`watcher`，保证将数据操作更好的聚集起来

### 分析源码

> `nextTick`用于延迟执行回调函数。可以看到，最多接收 2 个参数.当`cb`不存在的时候，会返回一个`Promise`实例，让`nextTick`可以使用`then`

```
export let isUsingMicroTask = false
// 存放所有的回调函数
const callbacks = []
// 是否在执行回调函数的标志
let pending = false
// 处理回调函数
function flushCallbacks () {
  pending = false
  const copies = callbacks.slice(0)
  callbacks.length = 0
  for (let i = 0; i < copies.length; i++) {
    // 执行回调函数
    copies[i]()
  }
}
// 触发执行回调函数
let timerFunc
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  // 优先使用promise
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
  // 然后考虑MutationObserver
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
  // 在考虑setImmediate
  timerFunc = () => {
    setImmediate(flushCallbacks)
  }
} else {
  // 最后使用setTimeout兜底
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

#### 调用 timerFunc

1. 优先使用原生`Promise`
2. 在判断`MutationObserver`
3. 然后判断`setImmdiate`
4. 最后使用`setTimeout`

> 首先我们知道，在这里面，`Promise`和`MutationObserver`属于`micotask`而`setImmdiate`和`setTimeout`属于`macrotask`的范畴，可以看到`isUsingMicroTask`决定的是使用是微任务还是宏任务

#### 接着可以看看`nextTick`是怎么做到 dom 更新和回调执行顺序

5. 使用数组，保存了要执行的操作
6. 每次修改了数据，只是往数组推入回调函数，而不是立即执行这些方法
7. 在下次事件循环中，在执行这个数组所有的方法，避免阻塞主线程（下次事件循环可以是微任务，当然也有可能是宏任务）
8. 每次执行完毕后，将所有的任务队列清空

优先使用了`Promise`等一些`microtask`，保证在同一次事件循环里面执行，这样页面只需要渲染一次，如果还是不行的话就会考虑`setTimeout`等一些`macrotask`，但是这会第二次渲染.`vue`用异步队列的方式来控制 DOM 更新和 nextTick 回调先后执行，保证了能在 dom 更新后在执行回调。

这样我们可以推出`nextTick`的触发时机

1. 一次事件循环的代码执行完毕
2. `DOM`更新
3. 触发`nextTick`的回调
4. 重复**1，2，3**

#### MutationObserver

`MutationObserver`是`HTML5`中的新`API`,是个用来监视`DOM`变动的接口，他能监听`DOM`对象发生的子节点删除、属性修改、文本内容修改等等。

```
let mo = new MutationObserver(callback)
```

通过给`MutationObserver`的构造函数传入一个回调函数，能得到一个`MutationObserver`实例，这个回调函数回在`MutationObserver`监听到`DOM`变化时触发
而这个时候仅仅是给`MutationObserver`实例绑定好了回调，他具体监听哪个`DOM`、监听节点删除还是其他操作，这时候还没有设置，这时候需要调用`observe`方法

```
mo.observe(domTarget,{
  characterData: true
})
```

在 nextTick 中 MutationObserver 的作用就如下图所示。在监听到 DOM 更新后，调用回调函数。

![MutationObserver](https://github.com/zengwmFE/project-image/raw/main/MutationObserver.png)
