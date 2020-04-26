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

### PromiseApi

#### new Promise

> 有启示性的构造函数，必须和`new`一起调用，并且必须提供一个函数回调，这个回调是同步的或者叫立即执行的。

接受两个函数：`resolve`和`reject`,但`resolve`也可能完成`promise`，也可能拒绝，要根据传入的参数而定：

- 如果**传给 resolve 的是一个非`Promise`，非`thenable`的立即值，这个`promise`就会用这个值完成**
- 如果传给`resolve`的是一个`Promise`、`thenable`的值，这个值就会被递归所展开，并且`promise`将取用最终决议值或状态

这个时候会调用`catch`回调

```
new Promise((resolve,reject)=>{

resolve(Promise.reject(1))
}).then(data=>{
    console.log(data)
}).catch((error)=>{
console.log(1,error) //1,1
})
```

#### `Promise.resolve` 和 `Promise.reject()`

> 创建一个已被拒绝的`Promise`的快捷方式使用的：`Promise.reject`,它等价于：`new Promise((resolve,reject)=>{ reject() })`,创建一个已完成的`Promise`，使用方法：`Promise.resolve()`

#### then 和 catch

> then 接受一个或两个参数，第一个用于完成回调，第二个用于拒绝回调，
> catch 接受一个拒绝回调作为参数，并自动替换默认完成回调

#### Promise.all([promise1,promise2,promise3...])

> 以最慢的一方作为基准执行回调，当最后一个`promise`执行完，就会执行回调

**适合的场景**

> 一些游戏类的素材比较多的应用，打开网页时，预先加载需要用到的各种资源如图片、`flash`以及各种静态文件。所有的都加载完后，我们在进行页面的初始化

### Promise.race([promise1,promise2,promise3])

> `Promise.race([..])`协调多个并发`Promise`的运行，并假定所有的`Promise`都需要完成，只想响应“第一个跨过终点线的`Promise`”,然后抛弃其他的`Promise`，被称为竞态

- `Promise.race`也接受单个数组参数，这样的话，肯定是列表的第一个成功
- `Promise.race`至少需要一个`promise`参数，如果传入一个空数组，`race`是永远不会决议的，而不是立即发生决议。因为`Promise`的实现要比`ES6 Promise`提出要早，没办法遗留了这个问题。所以永远不要传递一个空数组

#### finally

> 被丢弃和忽略的`promise`最终会进行的回调

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
