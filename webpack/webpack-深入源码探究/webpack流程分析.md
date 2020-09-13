## webpack流程分析
阅读本章的时候，最好要对于`tapable`的知识有所了解，`webpack`使用了大量钩子来实现流程
### 入口文件
**package.json**
> 在阅读源码的时候，在`package.json`中的`main`字段中可以知道整个库的入口文件是那里

**`"main": "lib/index.js"`**
```
get webpack() {
		return require("./webpack");
},
```
所以真正的入口文件是`lib/webpack.js`

### 初始化options

```
compiler = createCompiler(options);
watch = options.watch;
watchOptions = options.watchOptions || {};
```

```
const createCompiler = rawOptions => {
	const compiler = new Compiler(options.context);
	compiler.options = options;
	new NodeEnvironmentPlugin({
		infrastructureLogging: options.infrastructureLogging
	}).apply(compiler);
	if (Array.isArray(options.plugins)) {
		for (const plugin of options.plugins) {
			if (typeof plugin === "function") {
				plugin.call(compiler, compiler);
			} else {
				plugin.apply(compiler);
			}
		}
	}
	applyWebpackOptionsDefaults(options);
	compiler.hooks.environment.call();
	compiler.hooks.afterEnvironment.call();
	new WebpackOptionsApply().process(options, compiler);
	compiler.hooks.initialize.call();
	return compiler;
};
```
在这里`createCompiler`做了：
1. 执行了`NodeEnvironmentPlugin`,触发了`beforeRun`钩子，清除了磁盘
2. 将`options`内的`plugin`内的所有的事件流都绑定到`webpack`事件流上
3. `WebpackOptionsApply`将所有的配置的`options`参数都转换成合适的`webpack`内部插件,如：
```
externals转换成：ExternalsPlugin

splitChunks转换成：SplitChunksPlugin
```
在`webpackOptionsApply`中调用了`new EntryOptionPlugin().apply(compiler)`
```
compiler.hooks.entryOption.tap("EntryOptionPlugin", (context, entry) => {
			if (typeof entry === "function") {
				const DynamicEntryPlugin = require("./DynamicEntryPlugin");
				new DynamicEntryPlugin(context, entry).apply(compiler);
			} else {
				const EntryPlugin = require("./EntryPlugin");
				for (const name of Object.keys(entry)) {
					const desc = entry[name];
					const options = EntryOptionPlugin.entryDescriptionToOptions(
						compiler,
						name,
						desc
				);
				for (const entry of desc.import) {
						new EntryPlugin(context, entry, options).apply(compiler);
				}
			}
		}
		return true;
});
```
在`entryOption`中，绑定`EntryOptionPlugin`的钩子，并在回调中，将`webpack.config.js`中的`entry`转化成对应的的`DynamicEntryPlugin`或者`EntryPlugin`

4. 初始化`compiler`

结束后调用`compiler.run`
### run执行编译

```
const run = () => {
	this.hooks.beforeRun.callAsync(this, err => {
	if (err) return finalCallback(err);

	this.hooks.run.callAsync(this, err => {
	if (err) return finalCallback(err);

	this.readRecords(err => {
		if (err) return finalCallback(err);

		this.compile(onCompiled);
	});
	});
	});
};
```
1. 在这里触发`beforeRun`钩子的触发，
2. 触发`run`钩子，最后执行`this.compile(onCompiled)`
在这里贴上源码
```
	compile(callback) {
		const params = this.newCompilationParams();
		this.hooks.beforeCompile.callAsync(params, err => {
			this.hooks.compile.call(params);
			const compilation = this.newCompilation(params);
			this.hooks.make.callAsync(compilation, err => {
				this.hooks.finishMake.callAsync(compilation, err => {
					process.nextTick(() => {
						compilation.finish(err => {
							compilation.seal(err => {
								this.hooks.afterCompile.callAsync(compilation, err => {
									return callback(null, compilation);
								});
							});
						});
					});
				});
			});
		});
	}
```
开文提到过，`webpack`是基于`tapable`的，在这里可以看到
```
beforeCompile->compile->make->finishMake->finish->seal->afterCompile
```
这样执行顺序

### 依赖分析
在这里对`make`这个主要的流程进行分析，但是这个`make`在这里仅仅是一个触发的地方，需要在`webpack`找到它注册的位置。
首先我们来看看，一个基本的`tapable`是如何执行的
```
const {
    AsyncSeriesLoopHook
  } = require('tapable')

  const hook = new AsyncSeriesLoopHook(['aa'])
  hook.tap('a',function(arg){
      console.log('arg1',arg)
  })

  hook.tap({name: 'b',before: 'a'},function(arg){
    console.log('arg2',arg)
})
hook.tap({name: 'c',stage:-1},function(arg){
    console.log('arg3',arg)
})

// hook.callAsync('b',function(data){
//     console.log('这是响应回调',data)
// })

hook.callAsync('b',function(error){
    console.log('响应内容')
})
```
当执行了`callAsync`，所有之前已经被注册的`tap`都会被依次执行。我们知道了，只要是在`make`阶段的被注册的事件都会被调用。经过全局查找后，可以看到以下几个注册的事件：
```
// lib/AutomaticPrefetchPlugin.js
compiler.hooks.make.tapAsync(
	"AutomaticPrefetchPlugin",
	(compilation, callback) => {
		asyncLib.forEach(
		lastModules,
		(m, callback) => {
			compilation.addModuleChain(
			m.context || compiler.context,
			new PrefetchDependency(m.request),
			callback
			);
			},
				callback
			);
	}
);


// lib/DllEntryPlugin.js
compiler.hooks.make.tapAsync("DllEntryPlugin", (compilation, callback) => {
	compilation.addEntry(
				this.context,
				new DllEntryDependency(
					this.entries.map((e, idx) => {
						const dep = new EntryDependency(e);
						dep.loc = {
							name: this.options.name,
							index: idx
						};
						return dep;
					}),
					this.options.name
				),
				this.options,
				callback
			);
});


// webpack/lib/EntryPlugin.js
compiler.hooks.make.tapAsync("EntryPlugin", (compilation, callback) => {
			const { entry, options, context } = this;

			const dep = EntryPlugin.createDependency(entry, options);
			compilation.addEntry(context, dep, options, err => {
				callback(err);
			});
});

// webpack/lib/DynamicEntryPlugin.js
compiler.hooks.make.tapPromise(
			"DynamicEntryPlugin",
			(compilation, callback) =>
				Promise.resolve(this.entry())
					.then(entry => {
						const promises = [];
						for (const name of Object.keys(entry)) {
							const desc = entry[name];
							const options = EntryOptionPlugin.entryDescriptionToOptions(
								compiler,
								name,
								desc
							);
							for (const entry of desc.import) {
								promises.push(
									new Promise((resolve, reject) => {
										compilation.addEntry(
											this.context,
											EntryPlugin.createDependency(entry, options),
											options,
											err => {
												if (err) return reject(err);
												resolve();
											}
										);
									})
								);
							}
						}
						return Promise.all(promises);
					})
					.then(x => {})
);

... 以下省略
```

经过分析之后`make`钩子主要调用的有
1. `addEntry`添加入口
2. `createDependency`   构建依赖
3. `addModuleChain`  模块链生成


#### addEntry
```
	_addEntryItem(context, entry, target, options, callback) {
		const { name } = options;
			entryData[target].push(entry);
			for (const key of Object.keys(options)) {
				if (options[key] === undefined) continue;
				if (entryData.options[key] === options[key]) continue;
				if (entryData.options[key] === undefined) {
					entryData.options[key] = options[key];
				}
			}
		this.hooks.addEntry.call(entry, options);
		this.addModuleChain(context, entry, (err, module) => {
			this.hooks.succeedEntry.call(entry, options, module);
			return callback(null, module);
		});
	}
```
将所有的依赖路径都存入到`entryData`，紧接着调用`addModuleChain`,将所有的模块的入口的路径传入到`webpack`的模块链中

#### addModuleChain
刚才说到`addEntry`最后会调用的是`addModuleChain`去将模块的入口添加到模块链中
```
	addModuleChain(context, dependency, callback) {
		this.handleModuleCreation(
			{
				factory: moduleFactory,
				dependencies: [dependency],
				originModule: null,
				context
			},
			err => {
				if (err && this.bail) {
					callback(err);
					this.buildQueue.stop();
					this.rebuildQueue.stop();
					this.processDependenciesQueue.stop();
					this.factorizeQueue.stop();
				} else {
					callback();
				}
			}
		);
	}
```
在`addModuleChain`中，会调用`handleModuleCreation`