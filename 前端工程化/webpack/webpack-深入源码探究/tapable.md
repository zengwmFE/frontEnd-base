## tapable学习
`webpack`是基于事件驱动，类似于`node`的`event emitter`:注册事件，然后触发事件，但是`Tapable`要比`Event Emitter`更加的强大，webpack的整个工作流程就是将所有的**插件**串联起来，而保证这一切能够实现的的核心就是`Tapable`

`Tapable`的核心

1. 负责编译的`Compiler`
2. 负责创建`bundles`的`complation`



```
const {
    SyncHook,
    SyncBailHook,
    SyncWaterfallHook,
    SyncLoopHook,
    AsyncParallelHook,
    AsyncParallelBailHook,
    AsyncSeriesHook,
    AsyncSeriesBailHook,
    AsyncSeriesWaterfallHook 
 } = require("tapable");
```

> All Hook constructors take one optional argument, which is a list of argument names as strings.

```
const hook = new SyncHook(["arg1", "arg2", "arg3"]);
// ["arg1","arg2","arg3"] 控制触发事件，最多能传入多少个参数
```

### Tapable主要钩子hook
主要有以下几种钩子
1. 大体分为同步和异步的钩子
2. 异步又分为：异步串行钩子和异步并行钩子
3. 而根据事件终止条件的不同，可以分为`Bail/waterfall/Loop`
![](https://github.com/zengwmFE/frontEnd-base/blob/master/image/Tapable.png)

| 名称 | 注册事件的方法 | 回调时间的方法 | 作用 |
| ---- | -------------- |--------- |---- |
|Hook|tap,tapAsync,tapPromise|---|钩子基类|
|SyncHook|tap|call|同步钩子，顺序执行|
|SyncBailHook|tap|call|同步钩子，只要执行的监听函数handler有返回值不为undefined，剩余的handler就不会执行|
|SyncLoopHook|tap|call|同步循环钩子，只要执行的监听函数handler有返回值为`true`，那么就会一直执行这个钩子,如果返回`undefined`则表示会退出循环|
|SyncWaterfallHook|tap|call|同步流水钩子，上一个监听函数handler的返回值作为下一个handler的参数|
|AsyncParallelBailHook|tap,tapAsync,tapPromise|call,callAsync,promise|异步并行熔断钩子，监听函数handler并行触发，但是跟内部调用逻辑的快慢有关联|
|AsyncParallelHook|tap,tapAsync,tapPromise|call,callAsync,promise|异步并行钩子，不关心返回值|
|AsyncSeriesBailHook|tap,tapAsync,tapPromise|call,callAsync,promise|异步串行钩子熔断钩子,handler串行触发，但是跟handler内部调用回调的逻辑有关|
|AsyncSeriesHook|tap,tapAsync,tapPromise|call,callAsync,promise|异步串行钩子，handler串行触发|



### 源码分析及原理分析

> 任何不拿源码分析的文章都是太简单了，接下来所有的分析只针对于`SyncHook`来分析的，因为大部分过程是一致的

在`package.json`文件的描述中可以看到`Just a little module for plugins.`

### 入口文件：`"main": "lib/index.js"`

#### 从源码分析可以发现：
1. 存在两个基础类：`Hook`以及`HookCodeFactory`工厂类
2. `Hook`有一下几个子类：`SyncHook`,`SyncBailHook`,`SyncLoopHook`,`SyncWaterfallHook`等。在父类`Hook`上可以发现两个最为主要的方法：`tap`和`call`,`webpack`围绕这两个方法，构建出一个基于`plugin`的工作方式
3. `HookCodeFactory`产生了对应于`Hook`的几个子工厂类：`SyncHookCodeFactory`,`SyncBailHOokCodeFactory`等
4. 通过`const factory = new SyncHookCodeFactory()`，在生成对应的工厂实例:`factory`
5. 然后在`SyncHook`的方法`compile`，调用了`factory.setUp`以及返回了`factory.create(options)`
6. 然后根据`options`内部的`type`,通过`Function`构建出可执行的函数，最后在调用`call`的时候被调用`compile`



### tap的实现

在`tapable`的使用中，`tap`函数是一个非常重要的内容。

```
const {
    SyncHook
  } = require('tapable')

  const hook = new SyncHook(['aa','bb'])
  hook.tap('a',function(arg,arg1,arg2){
      console.log('arg1',arg,arg1,arg2)
  })

  hook.tap({name: 'b',before: 'a'},function(arg,arg1,arg2){
    console.log('arg2',arg,arg1,arg2)
})
hook.tap({name: 'c',stage:-1},function(arg,arg1,arg2){
    console.log('arg3',arg,arg1,arg2)
})
// stage的大小决定了它执行的顺序
// before决定了这个回调函数要在那个回调函数前执行
hook.call('b','c','d')
```



`tap`函数的核心概念就是：将所有绑定的回调函数，都存放在`taps`这么样一个数组里面。

在上文提到了，所有的`Hook`都继承与唯一的父类`Hook`，既然在`SyncHook`等并没有发现`tap`函数的**重载**或者**重写**，那么就需要在父类`Hook`找到`tap`方法

```
	// lib/Hook.js
	tap(options, fn) {
		options = this._runRegisterInterceptors(options);
		this._insert(options);
	}
```

**_insert函数**

```
	_insert(item) {
		// 在_resetCompilation,将call,promise,callSync等
		this._resetCompilation();
		let before;
		if (typeof item.before === "string") before = new Set([item.before]);
		else if (Array.isArray(item.before)) {
			before = new Set(item.before);
		}
		let stage = 0;
		if (typeof item.stage === "number") stage = item.stage;
		let i = this.taps.length;
		while (i > 0) {
			i--;
			const x = this.taps[i];
			this.taps[i + 1] = x;
			const xStage = x.stage || 0;
			if (before) {
				if (before.has(x.name)) {
					before.delete(x.name);
					continue;
				}
				if (before.size > 0) {
					continue;
				}
			}
			if (xStage > stage) {
				continue;
			}
			i++;
			break;
		}
		this.taps[i] = item;
	}
	
	// _resetCompilation
	_resetCompilation() {
		this.call = this._call;
		this.callAsync = this._callAsync;
		this.promise = this._promise;
	}
```

**`_insert`根据`before`和`stage`确定这个回调函数在`taps`位置。**

###  call的实现

同样的，`call`跟`tap`一样是在父类`Hook`中实现

```
// lib/Hook.js
this.call = this._call
```

```
Object.defineProperties(Hook.prototype, {
	_call: {
		value: createCompileDelegate("call", "sync"),
		configurable: true,
		writable: true
	},
	_promise: {
		value: createCompileDelegate("promise", "promise"),
		configurable: true,
		writable: true
	},
	_callAsync: {
		value: createCompileDelegate("callAsync", "async"),
		configurable: true,
		writable: true
	}
});
```

使用了`Object.defineProperties`创建了`_call`方法，之后调用`_call`也就是相当于调用了`value`属性的`createCompileDelegate`，然后最终调用了`_createCall`

```
this.compile({
			taps: this.taps,
			interceptors: this.interceptors,
			args: this._args,
			type: type
		});
```

但是在`_createCall`调用了`this.compile`,在父类`Hook`中，`compile`是一个空的实现，所以得看子类`hook`得实现

```
	compile(options) {
		// 在call的时候被调用 _createCall taps interceptors _args type
		factory.setup(this, options);
		return factory.create(options);
	}
```

然后再看`HookCodeFactory`中，生成`Function`的部分代码

```
case "sync":
				fn = new Function(
					this.args(),
					'"use strict";\n' +
						this.header() +
						this.content({
							onError: err => `throw ${err};\n`,
							onResult: result => `return ${result};\n`,
							resultReturns: true,
							onDone: () => "",
							rethrowIfPossible: true
						})
				);
				break;
```

来看看`Function`构造函数的语法:` new Function(arg1, arg2........argN, body);`

> 可以知道`this.args()`生成的是所有的参数，然后紧接着的是`body`

可以看到，主要的是`this.header`,`this.content`的内容

来看看最后生成的`fn`是什么



```
console.log(fn)
// [Function: anonymous] fn
```

一个**闭包**

```
"use strict";
var _context;
var _x = this._x;
var _fn0 = _x[0];
_fn0(aa, bb);
var _fn1 = _x[1];
_fn1(aa, bb);
var _fn2 = _x[2];
_fn2(aa, bb);
```

`this._x`就是之前的`taps`数组，这个闭包功能就是将`taps`里面的回调函数拿出来执行`aa`和`bb`是一开始初始化`SyncHook`传入的参数

**疑问**

1. 为什么源码要采用这样一个一个函数拿出来执行的过程，而不直接采用循环来执行这些回调函数？

### content

在生成的过程中

1. `this.header`负责处理全局的变量
2. `this.args（）`负责处理`call`过程中的参数
3. `this.content()`负责处理核心的流程

而`this.content`是由每一个子类工厂实现的，如:`SyncHookCodeFactory`

```
content({ onError, onDone, rethrowIfPossible }) {
		return this.callTapsSeries({
			onError: (i, err) => onError(err),
			onDone,
			rethrowIfPossible
		});
	}
```

在这里调用了`callTapsSeries`，在这个函数里面最核心的内容就是

```
			const content = this.callTap(i, {
				onError: error => onError(i, error, done, doneBreak),
				onResult:
					onResult &&
					(result => {
						return onResult(i, result, done, doneBreak);
					}),
				onDone: !onResult && done,
				rethrowIfPossible:
					rethrowIfPossible && (firstAsync < 0 || i < firstAsync)
			});
```

来大概看一下超长待机`callTap`的内容

```
		let code = "";
		let hasTapCached = false;
		for (let i = 0; i < this.options.interceptors.length; i++) {
			const interceptor = this.options.interceptors[i];
			if (interceptor.tap) {
				if (!hasTapCached) {
					code += `var _tap${tapIndex} = ${this.getTap(tapIndex)};\n`;
					hasTapCached = true;
				}
				code += `${this.getInterceptor(i)}.tap(${
					interceptor.context ? "_context, " : ""
				}_tap${tapIndex});\n`;
			}
		}
		code += `var _fn${tapIndex} = ${this.getTapFn(tapIndex)};\n`;
		const tap = this.options.taps[tapIndex];
		switch (tap.type) {
			case "sync":
				if (!rethrowIfPossible) {
					code += `var _hasError${tapIndex} = false;\n`;
					code += "try {\n";
				}
				if (onResult) {
					code += `var _result${tapIndex} = _fn${tapIndex}(${this.args({
						before: tap.context ? "_context" : undefined
					})});\n`;
				} else {
					code += `_fn${tapIndex}(${this.args({
						before: tap.context ? "_context" : undefined
					})});\n`;
				}
				if (!rethrowIfPossible) {
					code += "} catch(_err) {\n";
					code += `_hasError${tapIndex} = true;\n`;
					code += onError("_err");
					code += "}\n";
					code += `if(!_hasError${tapIndex}) {\n`;
				}
				if (onResult) {
					code += onResult(`_result${tapIndex}`);
				}
				if (onDone) {
					code += onDone();
				}
				if (!rethrowIfPossible) {
					code += "}\n";
				}
				
				break;
			case "async":
				let cbCode = "";
				if (onResult) cbCode += `(_err${tapIndex}, _result${tapIndex}) => {\n`;
				else cbCode += `_err${tapIndex} => {\n`;
				cbCode += `if(_err${tapIndex}) {\n`;
				cbCode += onError(`_err${tapIndex}`);
				cbCode += "} else {\n";
				if (onResult) {
					cbCode += onResult(`_result${tapIndex}`);
				}
				if (onDone) {
					cbCode += onDone();
				}
				cbCode += "}\n";
				cbCode += "}";
				code += `_fn${tapIndex}(${this.args({
					before: tap.context ? "_context" : undefined,
					after: cbCode
				})});\n`;
				break;
			case "promise":
				code += `var _hasResult${tapIndex} = false;\n`;
				code += `var _promise${tapIndex} = _fn${tapIndex}(${this.args({
					before: tap.context ? "_context" : undefined
				})});\n`;
				code += `if (!_promise${tapIndex} || !_promise${tapIndex}.then)\n`;
				code += `  throw new Error('Tap function (tapPromise) did not return promise (returned ' + _promise${tapIndex} + ')');\n`;
				code += `_promise${tapIndex}.then(_result${tapIndex} => {\n`;
				code += `_hasResult${tapIndex} = true;\n`;
				if (onResult) {
					code += onResult(`_result${tapIndex}`);
				}
				if (onDone) {
					code += onDone();
				}
				code += `}, _err${tapIndex} => {\n`;
				code += `if(_hasResult${tapIndex}) throw _err${tapIndex};\n`;
				code += onError(`_err${tapIndex}`);
				code += "});\n";
				break;
		}
		console.log(code,'code')
		return code;
```

这代码有点长，直接分析太过空洞，所以结合生成的代码来看是比较合适的

### 工厂类创建的执行代码对比

#### syncHook

```
"use strict";
var _context;
var _x = this._x;
var _fn0 = _x[0];
_fn0(aa, bb);
var _fn1 = _x[1];
_fn1(aa, bb);
var _fn2 = _x[2];
_fn2(aa, bb);
```

可以看到没有任何限制，直接将`taps`里面所有的回调函数执行了

#### SyncBailHook

```
"use strict";
var _context;
var _x = this._x;
var _fn0 = _x[0];
var _result0 = _fn0(aa, bb);
if(_result0 !== undefined) {
return _result0;
;
} else {
var _fn1 = _x[1];
var _result1 = _fn1(aa, bb);
if(_result1 !== undefined) {
return _result1;
;
} else {
var _fn2 = _x[2];
var _result2 = _fn2(aa, bb);
if(_result2 !== undefined) {
return _result2;
;
} else {
}
}
}
```

可以看到当回调函数的返回值不为undefined的时候，就会停止向下执行，并且返回当前的回调函数的返回值

#### SyncLoopHook

```
"use strict";
var _context;
var _x = this._x;
var _loop;
do {
_loop = false;
var _fn0 = _x[0];
var _result0 = _fn0(aa, bb);
if(_result0 !== undefined) {
_loop = true;
} else {
var _fn1 = _x[1];
var _result1 = _fn1(aa, bb);
if(_result1 !== undefined) {
_loop = true;
} else {
var _fn2 = _x[2];
var _result2 = _fn2(aa, bb);
if(_result2 !== undefined) {
_loop = true;
} else {
if(!_loop) {
}
}
}
}
} while(_loop);
```

定义了一个为`_loop`的变量控制了`do-while`的执行，当回调函数的返回值不为`undefined`的时候，就会重复该回调函数的执行，直到返回`undefined`，才会执行下一个回调函数`callback`

#### SyncWaterfallHook

```
"use strict";
var _context;
var _x = this._x;
var _fn0 = _x[0];
var _result0 = _fn0(aa, bb);
if(_result0 !== undefined) {
aa = _result0;
}
var _fn1 = _x[1];
var _result1 = _fn1(aa, bb);
if(_result1 !== undefined) {
aa = _result1;
}
var _fn2 = _x[2];
var _result2 = _fn2(aa, bb);
if(_result2 !== undefined) {
aa = _result2;
}
return aa;
```

可以看到当前`SyncWaterfallHook`,如果回调函数中的返回值不为`undefined`,那么这个返回值将成为下一个回调函数执行时的参数

### 接下来是异步hook的分析

> demo代码：

````
const {
    AsyncParallelHook
  } = require('tapable')

  const hook = new AsyncParallelHook(['aa'])
  hook.tap('a',function(arg){
      console.log('arg1',arg)
  })

  hook.tap({name: 'b',before: 'a'},function(arg){
    console.log('arg2',arg)
})
hook.tap({name: 'c',stage:-1},function(arg){
    console.log('arg3',arg)
})

hook.callAsync('b',function(data){
    console.log('这是响应回调',data)
})
````



#### AsyncParallelHook

```
"use strict";
var _context;
var _x = this._x;
do {
var _counter = 3;
var _done = () => {
_callback();
};
if(_counter <= 0) break;
var _fn0 = _x[0];
var _hasError0 = false;
try {
_fn0(aa);
} catch(_err) {
_hasError0 = true;
if(_counter > 0) {
_callback(_err);
_counter = 0;
}
}
if(!_hasError0) {
if(--_counter === 0) _done();
}
if(_counter <= 0) break;
var _fn1 = _x[1];
var _hasError1 = false;
try {
_fn1(aa);
} catch(_err) {
_hasError1 = true;
if(_counter > 0) {
_callback(_err);
_counter = 0;
}
}
if(!_hasError1) {
if(--_counter === 0) _done();
}
if(_counter <= 0) break;
var _fn2 = _x[2];
var _hasError2 = false;
try {
_fn2(aa);
} catch(_err) {
_hasError2 = true;
if(_counter > 0) {
_callback(_err);
_counter = 0;
}
}
if(!_hasError2) {
if(--_counter === 0) _done();
}
} while(false);(--_counter === 0) _done();
}
```

1. `_counter`是表示绑定的回调函数的个数
2. `_callback`代表调用的回调函数
3. 当执行时候报错了，同时当前执行的`_counter`还存在的话，那么会执行回调，同时传入`_err`
4. 当最后一个函数执行完成，也会执行`_callback`

#### AsyncParallelBailHook

```
"use strict";
var _context;
var _x = this._x;
var _results = new Array(3);
var _checkDone = () => {
for(var i = 0; i < _results.length; i++) {
var item = _results[i];
if(item === undefined) return false;
if(item.result !== undefined) {
_callback(null, item.result);
return true;
}
if(item.error) {
_callback(item.error);
return true;
}
}
return false;
}
do {
var _counter = 3;
var _done = () => {
_callback();
};
if(_counter <= 0) break;
var _fn0 = _x[0];
var _hasError0 = false;
try {
var _result0 = _fn0(aa);
} catch(_err) {
_hasError0 = true;
if(_counter > 0) {
if(0 < _results.length && ((_results.length = 1), (_results[0] = { error: _err }), _checkDone())) {
_counter = 0;
} else {
if(--_counter === 0) _done();
}
}
}
if(!_hasError0) {
if(_counter > 0) {
if(0 < _results.length && (_result0 !== undefined && (_results.length = 1), (_results[0] = { result: _result0 }), _checkDone())) {
_counter = 0;
} else {
if(--_counter === 0) _done();
}
}
}
/**重复逻辑代码省略**/
} while(false);
```

1. `_checkdone`函数利用循环，只要注册的回调函数`taps`,里面有一个返回值不为`undefined`，那么就会执行`_callback`（注册callAsync注册的回调）
2. 执行错误或者执行完成的时候

#### AsyncSeriesHook

```
"use strict";
var _context;
var _x = this._x;
var _fn0 = _x[0];
var _hasError0 = false;
try {
_fn0(aa);
} catch(_err) {
_hasError0 = true;
_callback(_err);
}
if(!_hasError0) {
var _fn1 = _x[1];
var _hasError1 = false;
try {
_fn1(aa);
} catch(_err) {
_hasError1 = true;
_callback(_err);
}
if(!_hasError1) {
var _fn2 = _x[2];
var _hasError2 = false;
try {
_fn2(aa);
} catch(_err) {
_hasError2 = true;
_callback(_err);
}
if(!_hasError2) {
_callback();
}
}
}
```

异步串行钩子

1. 不会关注任何回调函数的返回值，只会在报错的时候或者执行了最后一个回调函数且不报错的时候，会执行`callAsync`绑定的回调

#### AsyncSeriesBailHook

```
"use strict";
var _context;
var _x = this._x;
var _fn0 = _x[0];
var _hasError0 = false;
try {
var _result0 = _fn0(aa);
} catch(_err) {
_hasError0 = true;
_callback(_err);
}
if(!_hasError0) {
if(_result0 !== undefined) {
_callback(null, _result0);
;
} else {
var _fn1 = _x[1];
var _hasError1 = false;
try {
var _result1 = _fn1(aa);
} catch(_err) {
_hasError1 = true;
_callback(_err);
}
if(!_hasError1) {
if(_result1 !== undefined) {
_callback(null, _result1);
;
} else {
var _fn2 = _x[2];
var _hasError2 = false;
try {
var _result2 = _fn2(aa);
} catch(_err) {
_hasError2 = true;
_callback(_err);
}
if(!_hasError2) {
if(_result2 !== undefined) {
_callback(null, _result2);
;
} else {
_callback();
}
}
}
}
}
}
```

1. 返回值不为`undefined`会直接触发`tapAsync`的参数

#### AsyncSeriesWaterfallHook

```
"use strict";
var _context;
var _x = this._x;
var _fn0 = _x[0];
var _hasError0 = false;
try {
var _result0 = _fn0(aa);
} catch(_err) {
_hasError0 = true;
_callback(_err);
}
if(!_hasError0) {
if(_result0 !== undefined) {
aa = _result0;
}
var _fn1 = _x[1];
var _hasError1 = false;
try {
var _result1 = _fn1(aa);
} catch(_err) {
_hasError1 = true;
_callback(_err);
}
if(!_hasError1) {
if(_result1 !== undefined) {
aa = _result1;
}
var _fn2 = _x[2];
var _hasError2 = false;
try {
var _result2 = _fn2(aa);
} catch(_err) {
_hasError2 = true;
_callback(_err);
}
if(!_hasError2) {
if(_result2 !== undefined) {
aa = _result2;
}
_callback(null, aa);
}
}
}
```

1. 下一个回调函数接收上一个回调函数的返回值(返回值不为`undefined`)



#### 总结
| 钩子                     | 执行条件                                                     |
| ------------------------ | ------------------------------------------------------------ |
| syncHook                 | 直接将`taps`里面所有的回调函数执行了                         |
| SyncBailHook             | 当回调函数的返回值不为undefined的时候，就会停止向下执行，并且返回当前的回调函数的返回值 |
| SyncLoopHook             | 当回调函数的返回值不为`undefined`的时候，就会重复该回调函数的执行，直到返回`undefined`，才会执行下一个回调函数`callback` |
| SyncWaterfallHook        | 回调函数中的返回值不为`undefined`,那么这个返回值将成为下一个回调函数执行时的参数 |
| AsyncParallelHook        | 将`taps`里面的回调函数按照顺序执行，并不关心返回值           |
| AsyncParalleBailHook     | 里面有一个返回值不为`undefined`，那么就会执行`_callback`（注册callAsync注册的回调） |
| AsyncSeriesHook          | 不会关注任何回调函数的返回值                                 |
| AsyncSeriesBailHook      | 返回值不为`undefined`会直接触发`tapAsync`的参数              |
| AsyncSeriesWaterfallHook | 下一个回调函数接收上一个回调函数的返回值(返回值不为`undefined`) |

