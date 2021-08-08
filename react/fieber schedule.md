## react 架构

### react15整体架构
a. Reconciler找出更新的组件
b. Renderer渲染到页面

还有一些批处理的优化,react默认批处理，当然也可以不批处理分开： `unBatchUpdate`如`ReactDom.render`,因为这里需要尽快将页面呈现出来

```javascript
this.setState({
    a: 1,
})
this.setState({
    b: 1
})
```
就会将这两个处理成同一个更新


一个大的缺点：
react15的架构是递归的，一个长任务，会导致阻塞用户后续交互，会卡顿
当一个项目过大的时候，你`setState`,涉及到的组件数目多的时候，就会很难响应用户交互，导致卡顿

### react16 fiber架构
优化1. 
执行异步的调度任务会在宏任务中执行，这样可以保证，不用让用户失去响应？
因为宏任务，是在下一次页面更新的执行，这样就能保证页面始终可以响应用户的操作

优化2. 
react16对所有的更新都做了一个优先级的绑定，当出现多个更新同时需要处理的时候，可以中断低优先级的更新，先执行高优先级的更新。同时新增了`Scheduler`模块，来调度任务的优先级

就比如在第一次响应中，执行了一个假设为优先级c的任务，然后在第二次响应的时候，执行了一个优先级为b的任务，这时候系统就会中断优先级为`c`的任务，执行优先级为b的任务的更新，随着时间的过去，那个被中断的任务，会逐渐优先级就高起来了，这样他就能执行了。

#### react对于用户操作划分了优先级
1. 生命周期方法：同步执行
2. 受控的用户输入：比如输入框内输入文字，同步执行
3. 交互事件：比如动画，高优先级执行
4. 其他：数据请求，低优先级执行

#### fiber tree
react中把每一个虚拟节点称为`fiber Node`

#### react16的缺点
当进行一次更新的时候，都会从根节点开始，将所有的节点都标上这个任务的优先级，直到找到了这个要更新的节点，如果同时又有一个同样地方的节点进行了一次更高的更新，又需要从根`fiber node`更改成这个更新的优先级，

如：CPU任务执行时间长，I/O任务执行时间短
高优先级CPU任务
低优先级CPU任务
高优先级I/O任务
低优先级I/O任务

如果任务一开始就有一个高优先级CPU任务执行了，然后这个时候又来了一个低优先级的I/O任务，因为高优先级CPU任务优先级高，一个执行时间短的任务却没办法优先执行，还要等待一个时间长的任务执行完成。

#### react17对优先级的扩展

从指定一个优先级到指定一个连续的优先级区间(lane通道)


### Scheduler优先级调度器

```javascript
function FiberNode(
  tag: WorkTag,
  pendingProps: mixed,
  key: null | string,
  mode: TypeOfMode,
) {
  // Instance
  // Instance 作为静态数据结构的属性
  // Fiber对应的组件的类型 Function/Class/Host
  this.tag = tag;
  // 节点的唯一性，用来做dom Diff
  this.key = key;
  this.elementType = null;
  // 对于FunctionComponent指函数本身，对于ClassComponent，指class,对于HostComponent指Dom节点targetName
  this.type = null;

  // Fiber对应的真实DOM节点
  this.stateNode = null;

  // Fiber用于连接其他fiber节点形成fiber树
  this.return = null;
  this.child = null; // 
  this.sibling = null;
  this.index = 0;

  this.ref = null;

  this.pendingProps = pendingProps;
  this.memoizedProps = null;
  this.updateQueue = null;
  this.memoizedState = null;
  this.dependencies = null;

  this.mode = mode;

  // Effects  原来叫：sideEffect  用来标志节点是删除替换还是只是修改属性
  this.flags = NoFlags;
  this.subtreeFlags = NoFlags;
  this.deletions = null;
  // 优先级
  this.lanes = NoLanes;
  this.childLanes = NoLanes;

  this.alternate = null;
}
```

### schedule任务调度
1. 遇到ReactDom.Render,setState,dispatchAction
2. 设置expirationTime，新增一个update任务，添加到fiber的updateQueue里面，开始调度任务（17之后变成lane===synclane 变成了车道的概念）
3. 首先判断这个任务是否是`expirationTime=sync`是不是一个同步任务
    1. 如果是，那么直接走了performsyncworkonRoot,进行domdiff，以及render
    2. 如果不是同步任务，那么就进入ensureRootIsSchedule
        1. 判断是否有fiber过期，需要设置最高优先级，立即执行
        2. 判断是否还有新的fiber，没有则充值
        3. 判断新fiber和正在处理的fiber的优先级
    3. 判断任务的`delay`是否等于0，来判断是否是一个延时任务
        1. 如果不是延时任务，那么直接添加到tastQueue，等待通过`messageChannel`在宏任务队列中执行（这里会循环执行所有`taskQueue`的所有任务）
        2. 如果是延时任务，就添加到`timeQueue`
        3. 在非延时任务，每一轮结束的时候，都会调用`advanceTime`去判断`timeQueue`的任务时候有过期需要执行的，那么就将它拿出去放到`taskQueue`，然后走到`messageChannel`,通过红人调用执行
    4. 执行完后，将任务通过`performSyncworkOnRoot`，然后进行domdiff,render

大致的逻辑
1. 根据优先级区分同步任务和异步任务，同步任务立即同步执行，最快渲染出来，异步任务走`schedule`
2. 计算得到`expirationTime`, expirationTime = currentTime(当前时间) + timeout(不同优先级的时间间隔，时间越短，优先级越大)
3. 对比startTime和currentTime,将任务分为及时任务和延时任务
4. 及时任务当时执行
5. 延时任务需要等到currentTime>=expirationTime的时候才会执行
6. 及时任务执行完后，也会判断是否有延时任务到了该执行的时候，如果是，就执行延时任务
7. 每一批任务都执行在宏任务中，不堵塞页面与用户的交互


### ensureRootIsSchedule

```javascript
function ensureRootIsScheduled(root: FiberRoot, currentTime: number) {
  const existingCallbackNode = root.callbackNode;
  // 检查是否存在现有任务，判断是否可以重用
  // Check if there's an existing task. We may be able to reuse it.
  // 获取优先级，由于获取更新是从root开始的，往下找到这个优先级所有的update
  // 比如连续的setState,会执行这里的逻辑，而不会去新建一个update
  const existingCallbackPriority = root.callbackPriority;
  /**
   * this.setState({
    a: 1,
    })
    this.setState({
    b: 1
    })
   * 
   * */ 
  if (
    existingCallbackPriority === newCallbackPriority
  ){
    if (existingCallbackNode != null) {
    // Cancel the existing callback. We'll schedule a new one below.
    // 如果优先级发生了变化，那么就需要取消了当前执行的，后续重新发起一个
        cancelCallback(existingCallbackNode);
    }
  return 
  }
  // Schedule a new callback.
  let newCallbackNode;
  ...
  let schedulerPriorityLevel;
  // 发起新的一个调度callback
  newCallbackNode = scheduleCallback(
      schedulerPriorityLevel,
      performConcurrentWorkOnRoot.bind(null, root),
    );
  }

  root.callbackPriority = newCallbackPriority;
  // root.callbackNode的存活周期是从ensureRootIsSchedule到commitRootImpl为止
  root.callbackNode = newCallbackNode;
}
```
如果遇到高优先级的在执行的时候，来了一个低优先级的在执行，就会先取消掉高优先级的执行，然后根据`lane`的特性，将2次更新合并到一个`lane`然后进行创建一个调度callback

### unstable_scheduleCallback判断延时任务非延时任务的实效性
计算得到expirationTime,expirationTime=currentTime(当前时间)+timeout(不同优先级的时间间隔，时间越长，优先级越大)
```javascript
var currentTime = getCurrentTime();
 // 根据startTime是否大于当前时间currentTime，将任务分为及时任务及延时任务，延时任务还不会立即执行，他会在currentTime接近startTime的时候，才会执行
  var startTime;
  if (typeof options === 'object' && options !== null) {
    var delay = options.delay;
    if (typeof delay === 'number' && delay > 0) {
        // 延时任务
      startTime = currentTime + delay;
    } else {
        // 及时任务
      startTime = currentTime;
    }
  } else {
    startTime = currentTime;
  }

  var timeout;
  switch (priorityLevel) {
    case ImmediatePriority: // -1
      timeout = IMMEDIATE_PRIORITY_TIMEOUT; 
      break;
    case UserBlockingPriority:
      timeout = USER_BLOCKING_PRIORITY_TIMEOUT;
      break;
    case IdlePriority:
      timeout = IDLE_PRIORITY_TIMEOUT;
      break;
    case LowPriority:
      timeout = LOW_PRIORITY_TIMEOUT;
      break;
    case NormalPriority:
    default:
      timeout = NORMAL_PRIORITY_TIMEOUT;
      break;
  }
 // 得到过期时间
  var expirationTime = startTime + timeout;
```
这样就得到了`expirationTime`,然后将它和`currentTime`进行对比，`currentTime`小于expiration的时候就会，让他执行，类似于immediatePriority=-1,所以这类任务会立即执行


#### 判断延时任务和及时任务
```javascript

  if (startTime > currentTime) {
    // This is a delayed task.
    newTask.sortIndex = startTime;
    push(timerQueue, newTask);
      // Schedule a timeout.
    requestHostTimeout(handleTimeout, startTime - currentTime);
  } else {
    newTask.sortIndex = expirationTime;
    push(taskQueue, newTask);
    // Schedule a host callback, if needed. If we're already performing work,
    // wait until the next time we yield.
    if (!isHostCallbackScheduled && !isPerformingWork) {
      isHostCallbackScheduled = true;
      requestHostCallback(flushWork);
    }
  }
  return newTask;
```
1. 判断startTime和currentTime
2.  将任务加入到`taskQueue`执行
3. 如果startTime大于currentTime,那么他是一个延时任务，delay大于0，就将它放入到`timeQueue`，然后同时开启一个定时器（setTimeout），当时间到了就将它加入到`taskQueue`执行

### taskQueue的执行

```javascript
if (typeof localSetImmediate === 'function') {
  // Node.js and old IE.
  // There's a few reasons for why we prefer setImmediate.
  //
  // Unlike MessageChannel, it doesn't prevent a Node.js process from exiting.
  // (Even though this is a DOM fork of the Scheduler, you could get here
  // with a mix of Node.js 15+, which has a MessageChannel, and jsdom.)
  // https://github.com/facebook/react/issues/20756
  //
  // But also, it runs earlier which is the semantic we want.
  // If other browsers ever implement it, it's better to use it.
  // Although both of these would be inferior to native scheduling.
  schedulePerformWorkUntilDeadline = () => {
    localSetImmediate(performWorkUntilDeadline);
  };
} else if (typeof MessageChannel !== 'undefined') {
  // DOM and Worker environments.
  // We prefer MessageChannel because of the 4ms setTimeout clamping.
  const channel = new MessageChannel();
  const port = channel.port2;
  channel.port1.onmessage = performWorkUntilDeadline;
  schedulePerformWorkUntilDeadline = () => {
    port.postMessage(null);
  };
} else {
  // We should only fallback here in non-browser environments.
  schedulePerformWorkUntilDeadline = () => {
    localSetTimeout(performWorkUntilDeadline, 0);
  };
}
```
为什么优先选择setImmedidate
1. 为什么优先选择setImmedidate与 MessageChannel 不同，它不会阻止 Node.js 进程退出
    1. 在node15开始，又一个全局的MessageChannel对象，为了防止节点事件循环退出，为了正常关闭进程，应该要调用port.close或者port.unref()
    2. JSDOM环境中，进程无法正常退出

为什么次选择为MessageChannel
1. 因为setTimeout有4ms的延时默认时间

### 实现一个0timeout的setTimeout

```javascript
let timeout = []
function zeroSetTimeout(fn){
    timeout.push(fn)
    window.postMessage('setTimeout')
}
window.addEventListern('message',function(ev){
    if(ev.data==='setTimeout'){
        let fn = timeout.pop()
        fn()
    }
})

// 同样可以用messageChannel和Immediate
```