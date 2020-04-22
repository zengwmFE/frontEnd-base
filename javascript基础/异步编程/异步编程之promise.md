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

#### Promise.all([])