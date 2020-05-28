## Promise

> 何为`Promise`，是解决异步编程的一种方式，让我们可以控制拥有任务何时可以结束的权利！让我们决定异步完成后，下一步必须要紧接着执行什么。

设想一下：如果需要将`x+y`加起来，但是`x`和`y`都有可能有一个没有准备好，但是一旦准备好了，那么需要将两者加起来.可以考虑用回调来实现这个需要：

```
function add(getX,getY,cb){
	var x ,y;
	getX(function(xValue){
		x = xValue
		if(y!==undefined){
			cb(x+y)
		}
	})

	getY(function(yValue){
		y = yValue
		if(x!==undefined){
		cb(x+y)
		}
	})
}

add(getX,getY,function(sum){
	console.log(sum)
})
```

这个当然是能够实现这个功能的，但是代码的优美度不高。而且说起来是一步操作，但事实上，它是一个统一到了未来某时间段才会执行的操作。

同样的可以通过`promise`来实现这个内容

```
function add(xPromise,yPromise){
	return Promise.all([xPromise,yPromise])
}

add(getX(),getY()).then(function(data){
	console.log(data[0]+data[1])
},function(error){
console.log(error)
}) // 其中getX， getY都会返回一个promise对象
```

代码瞬间清晰多了。但`promise`的内容可能是拒绝的而不是完成的，拒绝值和完成值的`promise`不一样,而拒绝值，通常被称为`rejection reason`,可能是程序逻辑直接设置的，也可能是从运行异常隐式得出的值。

### Promise 局限性

#### 顺序错误处理

> `Promise`链中的错误很容易被无意中默默忽略掉，而且由于一个`promise`链仅仅是连接到一起的成员 `promise`,没有把整个链标识为一个个体的实体，这意味着没有外部方法可以用于观察可能发生的错误：一旦构建了没有错误处理的`Promise`链，那么链中任何地方的任何错误都会在链中一直传播下去，直到被查看（通过在某个步骤注册拒绝处理函数）。
> 在一个特定的例子中，只要有一个指向链中最后一个`promise`引用就足够了，因为你可以在那里注册拒绝处理函数，而且可以处理全部传播过来的错误的通知

```
var p = foo(42)
p.then(STEP2)
p.then(STEP3)
```

但是这个`p`并不指向第一个`promise`，而是指向`then(STEP3)`的那一个

如果`Promise`链中的任何一个步骤都没有显示地处理自身错误。这意味着你可以在`p`上注册一个错误处理函数，对于链中任何位置出现的任何错误，这个处理函数都会得到通知：

```
p.catch(handleErrors)
```

**但是：如果中间有一个步骤处理了错误，那么就不会得到错误通知**

#### 单一值

> Promise 只能有一个完成值或者一个拒绝的理由。这个时候就要封装`promise`来解决在复杂环境的局限性

#### 单决议

> `Promise`最本质的一个特征是：Promise 只能被决议一次（完成或拒绝）

#### 惯性

#### 无法取消`Promise`

> 一旦创建了一个`Promise`并为其注册了完成和或者拒绝处理函数。如果出现某种情况使得这个任务悬而未决的话，也没有办法从外部停止它的进程

#### Promise 性能

> 把基本的基于回调的异步任务链与`Promise`链中需要移动的部分数量进行比较。很显然`Promise`进行的动作要多一些，这自然意味着它也会稍微慢一些。

### Promise 凭什么消灭了回调地狱

#### 什么是回调地狱

1. 多层嵌套导致的阅读困难
2. 每个异步任务都会有 2 种可能行（成功或者失败），每次都要处理任务执行结束后的状态。

#### 解决方法

- 回调函数延迟绑定
- 返回值穿透
- 错误冒泡

1. 回调函数不是直接在`promise`内部声明的，而是在`then`方法传入的。也就是`回调函数延迟绑定`
2. 可以在`then`方法内部再次`return promise`作为下一个 then 的回调，可以实现将第二个执行的异步任务的返回值，传入下一个`then方法`
3. 错误冒泡，`promise`可以将任意时候的未自行捕捉的错误一直传到`catch`方法内。

### promise 为什么要引入微任务
