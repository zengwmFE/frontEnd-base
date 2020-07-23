// setInterval 需要注意的点?定时器为什么是不精确的?setTimeout(1)和 setTimeout(2)之间的区别

## setInterval

> var intervalID = scope.setInterval(func, delay, [arg1, arg2, ...]);
> var intervalID = scope.setInterval(code, delay);

- `func`:要重复调用的函数。`A function to be executed every delay milliseconds. The function is not passed any arguments, and no return value is expected.`
- `code`:这个语法是可选的，你可以传递一个字符串来代替一个函数对象，传递的字符串会被编译然后每个`delay`毫秒时间内执行一次。（不被推荐）
- `delay`:每次延迟的毫秒数(一秒等于1000毫秒)，函数的每次调用会在该延迟之后发生，和setTimeout一样，**实际的延迟时间可能会长一点**。这个时间计算单位是毫秒（千分之一秒。）如果这个参数值小于10，则默认使用值为10。

### 返回值
> intervalID为非0数值，用来标识通过`setInterval`创建的计时器，这个值可以用来作为`clearInterval`的参数来清楚对应值

注意：
1. `setInterval`和`setTimeout`共享一个ID池
2. `setInterval`需要及时清除，防止内存泄漏
3. 参数`code`传入的值为函数:`setInterval('app()',200)`
4. setInterval可能不是精确的


### 定时器为什么不是精确的

1. 超时限制为>=4ms
在现代浏览器中，由于回调嵌套（嵌套级别至少为特定深度）或者经过一定数量的连续间隔而触发连续调用时，`setTimeout`/`setInterval`调用至少每**4ms**被限制一次
```
function f(){}
function cb(){
    f()
    setTimeout(cb,0)
}
setTimeout(cb,0)
```
- 在Chrome和Firefox 第五次连续的调用就会被限制
- Safari锁定了第六次通话
- Edge在第三次
- Gecko在`version56`已经这样开始尝试`setInterval`(对setTimeout也一样) 。`In Chrome and Firefox, the 5th successive callback call is clamped; Safari clamps on the 6th call; in Edge its the 3rd one. Gecko started to treat setInterval() like this in version 56 (it already did this with setTimeout(); see below). `

**从历史上来看，某些浏览器在执行此节流方式有所不同了，在`setInterval`从任何地方的调用上，或者在`setTimeout`嵌套级别至少达到一定深度的情况下调用嵌套时，要想在现代浏览器实现0毫秒延迟可以使用`postMessage`**

> 注意：最小延迟`DOM_MIN_TIMEOUT_VALUE`为4ms，同时`DOM_CLAMP_TIMEOUT_NESTING_LEVEL`是5（dom固定超时嵌套级别）

### 在非活动tab卡，超时限制为>=1000ms

> 为了减少背景选项卡的负载（和相关的资源使用），在不活动的资源卡将超时限制为1000ms以下

- firefox从版本5开始实施该行为（可通过`dom.min_background_timeout_value`首选项调整1000ms常量）。Chrome从版本11开始实现该行为，自Firefox 14中出现错误736602以来，Android版Firefox的背景标签使用的超时值为15分钟，并且背景标签也可以完全卸载

### 限制跟踪超时脚本

> 自Firefox 55起，跟踪脚本（例如Google Analytics（分析），Firefox通过其TP列表将其识别为跟踪脚本的任何脚本URL ）都受到了进一步的限制。在前台运行时，节流最小延迟仍为4ms。但是，在后台选项卡中，限制最小延迟为10,000毫秒（即10秒），该延迟在首次加载文档后30秒生效。

控制此行为的首选项是：

- dom.min_tracking_timeout_value：4
- dom.min_tracking_background_timeout_value：10000
- dom.timeout.tracking_throttling_delay：30000

### 逾期超时

> 除了固定值意外，当页面（或OS /浏览器本身）忙于其他任务时，超时还会在以后触发。要注意的一个重要情况是，直到调用的线程setTimeout()终止，函数或代码段才能执行。例如：

```
function foo() {
  console.log('foo has been called');
}
setTimeout(foo, 0);
console.log('After setTimeout');
```

> After setTimeout    foo has been called

> 这是因为即使setTimeout以零的延迟被调用，它也被放置在队列中并计划在下一个机会运行。不是立即。当前执行的代码必须在执行队列中的功能之前完成，因此生成的执行顺序可能与预期的不同

## setTimeout(1)和 setTimeout(2)之间的区别