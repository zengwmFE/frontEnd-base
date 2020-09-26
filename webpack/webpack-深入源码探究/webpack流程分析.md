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

#### webpack能够识别的模块类型
这里先说明一下在`webpack`中
![webpack支持的模块类型](https://github.com/zengwmFE/frontEnd-base/blob/master/image/webpackmodule.png)

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
		);
	}

handleModuleCreation(
		{ factory, dependencies, originModule, context, recursive = true },
		callback
	) {
        // factorize 分解的意思
		this.factorizeModule(
			{ currentProfile, factory, dependencies, originModule, context },
			(err, newModule) => {
			
			}
		);
	}

factorizeModule(options, callback) {
		this.factorizeQueue.add(options, callback);
	}
```

可以注意到这个时候执行了`this.factorizeQueue.add`方法
```
this.factorizeQueue = new AsyncQueue({
	name: "factorize",
	parallelism: options.parallelism || 100,
	processor: this._factorizeModule.bind(this)
});

```
**AsyncQueue**
```
class AsyncQueue {
	constructor({ name, parallelism, processor, getKey }) {
		this._name = name;
		this._parallelism = parallelism;
		this._processor = processor;
		this._ensureProcessing = this._ensureProcessing.bind(this);
	}

    add(item, callback) {
		this.hooks.beforeAdd.callAsync(item, err => {
			const newEntry = new AsyncQueueEntry(item, callback);
			this._queued.push(newEntry);
			setImmediate(this._ensureProcessing);
            // 触发添加的钩子
		    this.hooks.added.call(item);
		});
	}

	_startProcessing(entry) {
		this.hooks.beforeStart.callAsync(entry.item, err => {

				this._processor(entry.item, (e, r) => {
					inCallback = true;
					this._handleResult(entry, e, r);
				});
			this.hooks.started.call(entry.item);
		});
	}

}
```
在`add`方法里面执行了`setImmediate(this._ensureProcessing)`,`setImmediate`使用类似与`setTimeout`，可以使用此方法代替`setTimeout(fn, 0)`执行繁重操作的方法。 可以最后通过`_startProcessing`来执行了`this._processor`，那么这个`this._processor`是什么呢？

看了之前在`compilation`的`AsyncQueue`的实例化,就能知道是：`this._factorizeModule.bind(this)`
兜兜转转又回到了`compilation`
```
	_factorizeModule(
		{ currentProfile, factory, dependencies, originModule, context },
		callback
	) {
		factory.create(
			{
				contextInfo: {
					issuer: originModule ? originModule.nameForCondition() : "",
					compiler: this.compiler.name
				},
				resolveOptions: originModule ? originModule.resolveOptions : undefined,
				context: context
					? context
					: originModule
					? originModule.context
					: this.compiler.context,
				dependencies: dependencies
			},
			(err, result) => {
                ...
            }
		);
	}
```
在`_factorizeModule`中执行了`factory.create`.
这时候有两个问题：
1. factory是什么呢？
2. create的作用是什么？

怀着这个问题：
> 在`debugger`之后可以看到是：
![normalModuleFactory](https://github.com/zengßåßwmFE/frontEnd-base/blob/master/image/moduleCreate.png)
可以知道这个对象是一个`NormalModuleFactory`，这时候就能想起，我在章节说明的**webpack**所支持的`Module`的类型，跟这个非常像！也能通过这里知道，这样的`Factory`不仅仅只有`NormalModuleFactory`这一个，事实上，根据你引入模块的不一样有不同的工厂函数去生成对应的模块，这里因为是一个简单的，所以只使用了一个`NormalModuleFactory`，其实根据名字我们也能大概知道`create`的作用了，就是根据模块工厂的不一样，创建出对应的`Module`

这段流程比较长，需要汇总一下才能更清楚点：
```
addEntry->addModuleChain->handleModuleCreation->factorizeModule->_factorizeModule->factory.create
```

### buildModule

构建模块

```
	this.buildModule(module, err => {
	if (!recursive) {
		this.processModuleDependenciesNonRecursive(module);
		callback(null, module);
		return;
	}
 	this.processModuleDependencies(module, err => {
		callback(null, module);
	});
	});
	buildModule(module, callback) {
		this.buildQueue.add(module, callback);
	}
	processModuleDependencies(module, callback) {
		this.processDependenciesQueue.add(module, callback);
	}

	_buildModule(module, callback) {
		module.needBuild(
			{
				fileSystemInfo: this.fileSystemInfo
			},
			(err, needBuild) => {
				this.hooks.buildModule.call(module);
				this.builtModules.add(module);
				module.build(
					this.options,
					this,
					this.resolverFactory.get("normal", module.resolveOptions),
					this.inputFileSystem,
					err => {
						...
					}
				);
			}
		);
	}
```
执行了`buildModule`,执行`_buildModule`，接着执行`module.build`方法开始构建，这里的`module.build`指的是`NormalModule.js`中的`build`,看下这段代码
```
build(options, compilation, resolver, fs, callback) {
		this._source = null;
		this._ast = null;
		return this.doBuild(options, compilation, resolver, fs, err => {
			...
		});
}
```

接着执行了`this.doBuild`


> 在这里提一句，这里出现了`_source`和`_ast`，是分别代表模块路径和`AST`树

```
// doBuild
doBuild(options, compilation, resolver, fs, callback) {
		const loaderContext = this.createLoaderContext(
			resolver,
			options,
			compilation,
			fs
		);

		const processResult = (err, result) => {

			const source = result[0];
			const sourceMap = result.length >= 1 ? result[1] : null;
			const extraInfo = result.length >= 2 ? result[2] : null;
			this._source = this.createSource(
				options.context,
				this.binary ? asBuffer(source) : asString(source),
				sourceMap,
				compilation.compiler.root
			);
			if (this._sourceSizes !== undefined) this._sourceSizes.clear();
			this._ast =
				typeof extraInfo === "object" &&
				extraInfo !== null &&
				extraInfo.webpackAST !== undefined
					? extraInfo.webpackAST
					: null;
			return callback();
		};

		const hooks = NormalModule.getCompilationHooks(compilation);

		hooks.beforeLoaders.call(this.loaders, this, loaderContext);
		runLoaders(
			{
				resource: this.resource,
				loaders: this.loaders,
				context: loaderContext,
				readResource: (resource, callback) => {...}
			},
			(err, result) => {
				this.buildInfo.fileDependencies = new LazySet();
				this.buildInfo.fileDependencies.addAll(result.fileDependencies);
				this.buildInfo.contextDependencies = new LazySet();
				this.buildInfo.contextDependencies.addAll(result.contextDependencies);
				this.buildInfo.missingDependencies = new LazySet();
				this.buildInfo.missingDependencies.addAll(result.missingDependencies);
				if (
					this.loaders.length > 0 &&
					this.buildInfo.buildDependencies === undefined
				) {
					this.buildInfo.buildDependencies = new LazySet();
				}
				for (const loader of this.loaders) {
					this.buildInfo.buildDependencies.add(loader.loader);
				}
				this.buildInfo.cacheable = result.cacheable;
				processResult(err, result.result);
			}
		);
	}
```
**runLoaders**
> Run a webpack loader (or chain of loaders) from the command line

这东西就有意思了🌹，可以让我们在不需要`webpack`的情况下，就可以执行`loader`，所以在`webpack`内部中就使用了🐸。

复习以下loader的作用：
1. `loader`让`webpack`能够去处理那些非 `JavaScript `文件（`webpack`自身只理解 `JavaScript`）。`loader` 可以将所有类型的文件转换为 `webpack` 能够处理的有效模块，然后你就可以利用 `webpack` 的打包能力，对它们进行处理。
----
所以我们知道在这里`runloaders`的作用为将所有的模块，用对应的`loader`转换成`js`模块，然后调用`processResult`将转化后的模块传递给`this.doBuild`的回调函数
```
err => {
	let result;
		try {
			result = this.parser.parse(this._ast || this._source.source(), {
			current: this,
			module: this,
			compilation: compilation,
			options: options
			});
		} catch (e) {
		}
});
```
接着便调用`this.parser.parse`方法📦，这个parser是哪来的呢？
答案就是🍎：`webpack/lib/javascript/JavascriptParser.js`
来看一下这个地方是做什么用的，可以知道最终调用的是`_parse`方法
```
	static _parse(code, options) {
		const type = options ? options.sourceType : "module";
		const parserOptions = {
			...defaultParserOptions,
			allowReturnOutsideFunction: type === "script",
			...options,
			sourceType: type === "auto" ? "module" : type
		};

		let ast;
		ast = (parser.parse(code, parserOptions));
		return /** @type {ProgramNode} */ (ast);
	}
```

这个`parser`为全局变量 `const { Parser: AcornParser } = require("acorn")`
关于`acorn`
> A tiny, fast JavaScript parser written in JavaScript.


![](https://github.com/zengwmFE/frontEnd-base/blob/master/image/ast.png)

**我们知道了`webpack`是通过`acorn`将所有的`javascript`模块都转换成`ast`🐿️**


#### buildModule小段流程总结
1. 首先`buildModule`到`module.build`中的`normalModule`进行了`loader`对所有模块的解析，将其转换化为对应的`javascript`模块代码
2. 使用`acorn`的`parse`的方法，将所有的`javascript`模块都拆解成`ast`




**收尾工作**

初始化构建的`hash`

```
	const handleParseResult = result => {
		this.dependencies.sort(
			oncatComparators(
				compareSelect(a => a.loc, compareLocations),
				keepOriginalOrder(this.dependencies)
				)
			);
			this._initBuildHash(compilation);
			this._lastSuccessfulBuildMeta = this.buildMeta;
				
			return handleBuildDone();
	};
```
然后通过`handleBuildDone`的`callback`回到`module.build`

### program 

```
// webpack/lib/dependencies/HarmonyDetectionParserPlugin.js
	apply(parser) {
		parser.hooks.program.tap("HarmonyDetectionParserPlugin", ast => {
			const isStrictHarmony = parser.state.module.type === "javascript/esm";
			const isHarmony =
				isStrictHarmony ||
				ast.body.some(
					statement =>
						statement.type === "ImportDeclaration" ||
						statement.type === "ExportDefaultDeclaration" ||
						statement.type === "ExportNamedDeclaration" ||
						statement.type === "ExportAllDeclaration"
				);
			if (isHarmony) {
				const module = parser.state.module;
				const compatDep = new HarmonyCompatibilityDependency();
				compatDep.loc = {
					start: {
						line: -1,
						column: 0
					},
					end: {
						line: -1,
						column: 0
					},
					index: -3
				};
				module.addPresentationalDependency(compatDep);
				DynamicExports.bailout(parser.state);
				HarmonyExports.enable(parser.state, isStrictHarmony);
				parser.scope.isStrict = true;
			}
		});
```
