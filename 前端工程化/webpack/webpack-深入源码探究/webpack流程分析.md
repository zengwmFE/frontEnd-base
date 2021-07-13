## webpack 流程分析

重要的概念
1. compiler webpack运行入口，compiler对象代表了完整的webpack环境配置。这个对象在启动webpack时被一次性建立，并配置好所有可操作的设置，包含`options`,`loader`,`plugin`。当在webpack环境中应用一个插件时，插件将受到此`compiler`对象的应用，可以使用它来访问`webpack`的主环境（这样就能通过compiler来自定义plugin）

2. compilation对象代表了一次资源版本构建，当运行`webpack`开发环境中间件时，每当检测到一个文件变化，就会创建一个新的`compilation`，从而生成一组新的编译资源，一个`compilation`对象表现了当前的模块资源，编译生成资源，变化的文件以及被跟踪依赖的状态信息，`compilation`对象也提供很多关键步骤的回调，以供插件做自定义处理时使用

3. chunk 即用于表示`chunk`的类，对于构建时需要的`chunk`对象由`compilation`创建后保存管理（webpack中最核心的负责编译的`Compiler`和创建`bundle`的`compilation`都是继承于`tapable`）

4. Module 用于表示代码模块的基础类，衍生出很多子类用于处理不同的情况，关羽代码模块的所有信息都会存在`Module`实例中，例如`dependencies`记录代码模块的依赖

5. Parser其中相对复杂的一个部分，基于acorn来分析AST语法树，解析出代码模块的依赖


### 1. 初始化 options

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
	// 执行plugin
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

> externals 转换成：ExternalsPlugin splitChunks 转换成：SplitChunksPlugin

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

在`DynamicEntryPlugin`和`EntryPlugin`中`apply`方法中，向`make`的钩子上挂载了一个事件

```
		compiler.hooks.make.tapAsync("EntryPlugin", (compilation, callback) => {
			const { entry, options, context } = this;

			const dep = EntryPlugin.createDependency(entry, options);
			compilation.addEntry(context, dep, options, err => {
				callback(err);
			});
		});
```

这个事件上主要执行的内容是`createDependency`和`addEntry`，这两个函数的作用是什么，在`make`阶段会具体的提到

4. 初始化`compiler`

结束后调用`compiler.run`，开始启动编译

### 2. run 执行编译

```
const run = () => {
	this.hooks.beforeRun.callAsync(this, err => {
	this.hooks.run.callAsync(this, err => {
	this.readRecords(err => {
		this.compile(onCompiled);
	});
	});
	});
};
```

1. 在这里触发`beforeRun`钩子的触发，
2. 触发`run`钩子，最后执行`this.compile(onCompiled)`，这里是一切的源头，一切“罪恶”的根源 🐶，在这里贴上源码：

```
newCompilation(params) {
		const compilation = this.createCompilation();
		compilation.name = this.name;
		compilation.records = this.records;
		this.hooks.thisCompilation.call(compilation, params);
		this.hooks.compilation.call(compilation, params);
		return compilation;
}
newCompilationParams() {
		const params = {
			normalModuleFactory: this.createNormalModuleFactory(),
			contextModuleFactory: this.createContextModuleFactory()
		};
		return params;
	}
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

这样执行顺序，那我们就看着一路往下走 🌹：

这里在提一句:

这里的`newCompilationParams`是非常重要的，它返回了两个工厂函数的实例化对象:`NormalModuleFactory`和`ContextMouduleFactory`;以及调用了`this.newCompilation`，全局查找之后，我们可以知道，`hook.thisCompilation`以及`hooks.compilation`都是在每一个`plugin`的`apply`方法下进行了注册，所以这个这个方法是通知每个相关插件在`make`前阶段需要做的操作，然后得到了一个`compilation`的新实例以便接下来触发的所有钩子都能使用到这个实例

### 3. make 依赖分析

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

当执行了`callAsync`，所有之前已经被注册的`tap`都会被依次执行。我们知道了，只要是在`make`阶段的被注册的事件都会被调用。这就用到了我们刚才在`entryOptions`提到的那些了

我们可以看到所有的`make`钩子绑定的事件主要调用的有

1. `addEntry`添加入口
2. `createDependency` 构建依赖
3. `addModuleChain` 模块链生成

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

有个问题，**entry**这个参数是怎么来的 🤔️？

我们来打开`addEntry`的来源地之一的`EntryPlugin`

```
apply(compiler){
const dep = EntryPlugin.createDependency(entry, options);
			compilation.addEntry(context, dep, options, err => {
				callback(err);
});
}
static createDependency(entry, options) {
		const dep = new EntryDependency(entry);
		// TODO webpack 6 remove string option
		dep.loc = { name: typeof options === "object" ? options.name : options };
		return dep;
}
```

我们可以看到`entry`这个参数应该是`entryPlugin`或者是其他`XXXentryPlugin`的实例，将所有的`dep`都存入到`entryData`，紧接着调用`addModuleChain`,将所有的模块的入口的路径传入到`webpack`的模块链中

#### addModuleChain

接着调用的是`addModuleChain`去将`dep`添加到`factorizeQueue`中

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
兜兜转转 😷 又回到了`compilation`

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

1. factory 是什么呢？
2. create 的作用是什么？

怀着这个问题：

在`debugger`之后可以看到是：

![normalModuleFactory](https://github.com/zengwmFE/frontEnd-base/raw/master/image/moduleCreate.png)

> 可以知道这个对象是一个`NormalModuleFactory`，这样的`Factory`不仅仅只有`NormalModuleFactory`这一个，事实上，根据你引入模块的不一样有不同的工厂函数去生成对应的模块，这里因为是一个简单的，所以只使用了一个`NormalModuleFactory`，其实根据名字我们也能大概知道`create`的作用了，就是根据模块工厂的不一样，将`dependenies`转化成对应的`Module`

这段流程比较长，需要汇总一下才能更清楚点：

```
addEntry->addModuleChain->
handleModuleCreation->
factorizeModule->_factorizeModule->
factory.create
```

### 4. buildModule

在`factory`以及获取到了依赖所转换的模块，接下来要进行构建模块

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

#### runLoaders 使用 loader 转换 js 模块

> Run a webpack loader (or chain of loaders) from the command line

这东西就有意思了 🌹，可以让我们在不需要`webpack`的情况下，就可以执行`loader`，所以在`webpack`内部中就使用了 🐸。

复习以下 loader 的作用：

1. `loader`让`webpack`能够去处理那些非 `JavaScript `文件（`webpack`自身只理解 `JavaScript`）。`loader` 可以将所有类型的文件转换为 `webpack` 能够处理的有效模块，然后你就可以利用 `webpack` 的打包能力，对它们进行处理。

---

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

接着便调用`this.parser.parse`方法 📦，这个 parser 是哪来的呢？

**答案就是 🍎：`webpack/lib/javascript/JavascriptParser.js`**

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

![](https://github.com/zengwmFE/frontEnd-base/raw/master/image/ast.png)

**我们知道了`webpack`是通过`acorn`将所有的`javascript`模块都转换成`ast`🐿️**

#### buildModule 小段流程总结

1. 首先`buildModule`到`module.build`中的`normalModule`进行了`loader`对所有模块的解析，将其转换化为对应的`javascript`模块代码
2. 使用`acorn`的`parse`的方法，将所有的`javascript`模块都拆解成`ast`

#### succeedModule 结束 make 阶段

等到模块构建完，并分析完依赖之后，执行`this.hooks.succeedModule.call(module);`

### 5. seal chunks 的创建和优化

紧接着执行`complation.seal`

```
	compilation.seal(err => {
		this.hooks.afterCompile.callAsync(compilation, err => {
			logger.timeEnd("afterCompile hook");
			return callback(null, compilation);
			});
	});
```

`seal`看源码注释就知道这个方法主要用来创建`chunks`，以及一系列的优化，来具体的分析一下，在模块构建的过程中，我们知道，`webpack`会将所有分析出来的依赖如我们这里的`export`和`index`模块,都分别存放到`complation.modules`这个数组里面。

```
	for (const module of this.modules) {
			ChunkGraph.setChunkGraphForModule(module, chunkGraph);
	}
```

在`debug`中我们可以看到循环出来的`module`，来看看

![export模块](https://github.com/zengwmFE/frontEnd-base/raw/master/image/webpack-modules.png)

可以看到这个地方有一个叫`dependencies`的属性，二者里面就包括了这个模块所依赖的下一个模块，然后我们在看看`index.js`模块长啥样 🖐️：

![export模块](https://github.com/zengwmFE/frontEnd-base/raw/master/image/webpack-modules2.png)

#### chunk 生成算法

1. `webpack`先将`entry`中对应的`module`都生成一个新的`chunk`
2. 遍历`module`的依赖列表，将依赖的`module`也加入到`chunk`中
3. 如果一个依赖`module`是动态引入的模块，那么就根据这个`module`创建一个新的`chunk`
4. 重复上面的过程，知道得到所有的`chunk`

#### chunk 优化

调用了大量的钩子去执行`chunks`的优化

```
		this.hooks.optimize.call();

		while (this.hooks.optimizeModules.call(this.modules)) {
		}
		this.hooks.afterOptimizeModules.call(this.modules);

		while (this.hooks.optimizeChunks.call(this.chunks, this.chunkGroups)) {
		}
		this.hooks.afterOptimizeChunks.call(this.chunks, this.chunkGroups);

		this.hooks.optimizeTree.callAsync(this.chunks, this.modules, err => {
			this.hooks.afterOptimizeTree.call(this.chunks, this.modules);

			this.hooks.optimizeChunkModules.callAsync(
				this.chunks,
				this.modules,
				err => {

					this.hooks.afterOptimizeChunkModules.call(this.chunks, this.modules);

					const shouldRecord = this.hooks.shouldRecord.call() !== false;

					this.hooks.reviveModules.call(this.modules, this.records);
					this.hooks.beforeModuleIds.call(this.modules);
					this.hooks.moduleIds.call(this.modules);
					this.hooks.optimizeModuleIds.call(this.modules);
					this.hooks.afterOptimizeModuleIds.call(this.modules);

					this.hooks.reviveChunks.call(this.chunks, this.records);
					this.hooks.beforeChunkIds.call(this.chunks);
					this.hooks.chunkIds.call(this.chunks);
					this.hooks.optimizeChunkIds.call(this.chunks);
					this.hooks.afterOptimizeChunkIds.call(this.chunks);

					this.sortItemsWithChunkIds();

					if (shouldRecord) {
						this.hooks.recordModules.call(this.modules, this.records);
						this.hooks.recordChunks.call(this.chunks, this.records);
					}

					this.hooks.optimizeCodeGeneration.call(this.modules);

```

到这里我们构建需要的`chunks`和`modules`都成功构建好了,接下来就进入**文件输出**

### 6. hash 生成及文件输出

首先进行文件`hash`的创建:`createHash`
紧接着进行文件的生成，

1. 调用`createModuleAssets`
   这个功能主要是为了遍历模块中的需要构建的模块，然后调用`emitAsset`将模块路径生成以`fileName`和`source`为键值对的`Map`,存放在`assets`

2. 调用`createChunkAssets`，遍历`chunks`,获取对应的`fileName`和`source`，然后存放在`assets`
   遍历`chunks`

```
createModuleAssets() {
		const { chunkGraph } = this;
		for (const module of this.modules) {
			if (module.buildInfo.assets) {
				const assetsInfo = module.buildInfo.assetsInfo;
				for (const assetName of Object.keys(module.buildInfo.assets)) {
					const fileName = this.getPath(assetName, {
						chunkGraph: this.chunkGraph,
						module
					});
					for (const chunk of chunkGraph.getModuleChunksIterable(module)) {
						chunk.auxiliaryFiles.add(fileName);
					}
					// 将所有的fileName和source进行收集
					this.emitAsset(
						fileName,
						module.buildInfo.assets[assetName],
						assetsInfo ? assetsInfo.get(assetName) : undefined
					);
					this.hooks.moduleAsset.call(module, fileName);
				}
			}
		}
}

// emitAsset
emitAsset(file, source, assetInfo = {}) {
		this.assets[file] = source;
		this._setAssetInfo(file, assetInfo, undefined);
}

createChunkAssets(callback) {
		const outputOptions = this.outputOptions;
		const cachedSourceMap = new WeakMap();
		const alreadyWrittenFiles = new Map();

		asyncLib.forEach(
			this.chunks,
			(chunk, callback) => {
				let manifest;
					manifest = this.getRenderManifest({
						chunk,
						hash: this.hash,
						fullHash: this.fullHash,
						outputOptions,
						codeGenerationResults: this.codeGenerationResults,
						moduleTemplates: this.moduleTemplates,
						dependencyTemplates: this.dependencyTemplates,
						chunkGraph: this.chunkGraph,
						moduleGraph: this.moduleGraph,
						runtimeTemplate: this.runtimeTemplate
					});
				asyncLib.forEach(
					manifest,
					(fileManifest, callback) => {
						const ident = fileManifest.identifier;
						const usedHash = fileManifest.hash;

						const assetCacheItem = this._assetsCache.getItemCache(
							ident,
							usedHash
						);

						assetCacheItem.get((err, sourceFromCache) => {
							let filenameTemplate;
							let file;
							let assetInfo;

							let inTry = true;

								if ("filename" in fileManifest) {
									file = fileManifest.filename;
									assetInfo = fileManifest.info;
								} else {
									filenameTemplate = fileManifest.filenameTemplate;
									const pathAndInfo = this.getPathWithInfo(
										filenameTemplate,
										fileManifest.pathOptions
									);
									file = pathAndInfo.path;
									assetInfo = pathAndInfo.info;
								}
								let source = sourceFromCache;
								const alreadyWritten = alreadyWrittenFiles.get(file);
								if (alreadyWritten !== undefined) {
									if (alreadyWritten.hash !== usedHash) {
										...
									} else {
										source = alreadyWritten.source;
									}
								} else if (!source) {
									source = fileManifest.render();
								}
								this.emitAsset(file, source, assetInfo);
						});
					},
					callback
				);
			},
			callback
		);
	}
```

在`Complation`的构造函数,我们可以看到，实例化了四个`template`,其实也能算是 3 个，`runtimeTemplate`是用来生成`moduleTemplate`的

```
	this.mainTemplate = new MainTemplate(this.outputOptions, this);
	this.chunkTemplate = new ChunkTemplate(this.outputOptions, this);
	this.runtimeTemplate = new RuntimeTemplate(
			this.outputOptions,
			this.requestShortener
		);

	this.moduleTemplates = {
			javascript: new ModuleTemplate(this.runtimeTemplate, this)
	};
```

看一下`MainTemplate`中，我们可以看到一个在打包文件中非常常见的`__webpack_require__`

```
Object.defineProperty(MainTemplate.prototype, "requireFn", {
	get: util.deprecate(
		() => "__webpack_require__",
		'MainTemplate.requireFn is deprecated (use "__webpack_require__")',
		"DEP_WEBPACK_MAIN_TEMPLATE_REQUIRE_FN"
	)
});
```

可以才想这个类是跟我们`bundles`模版生成有相关的，事实上

1. `MainTemplate`对入口模块`chunk`进行编译，用来生成入口模块的`bundle`
2. `ChunkTemplate`是对非入口模块的`chunk`
3. `ModuleTemplate`渲染模块中引入的模块

事实上，我们在打包完成的`bundles`可以看到有大量`__webpack_require__`，却没有看到我们所正常认识的`import`和`require`，就是在这里替换成`__webpack_require__`

#### 文件输出

做完这些事，`complation`也做完了自己的事了，`this.compile(onCompiled)`,通过`onCompiled`回调执行，随即将调用`compiler`的`emitAssets`

```
this.hooks.emit.callAsync(compilation, err => {
	outputPath = compilation.getPath(this.outputPath, {});
	mkdirp(this.outputFileSystem, outputPath, emitFiles);
});
```

然后执行了`this.hooks.done`结束整个编译过程

### 另附一份简单版的 webpack 实现

[老样子，世界上最大的同性交友网站](https://github.com/zengwmFE/my-webpack)

附上过程思路解析：

1. 将`es6+`的语法转化成`es5`的语法
2. 通过`babel`的`babylon`生成`AST`
3. 通过`babel-core`的`transformFromAST`将`AST`重新生成源码
4. 分析模块之间的依赖关系
   1. 通过`babel-traverse`的`importDedaration`方法获取依赖属性
5. 将生成的内容，拼接成字符串(`bundle`)
6. 写入文件`fs.writeFileSync`
