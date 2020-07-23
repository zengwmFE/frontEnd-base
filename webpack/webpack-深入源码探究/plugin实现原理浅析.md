## plugin 的实现

### plugin 实现需要注意的内容

- compiler 暴露了和 Webpack 整个生命周期相关的钩子
- compilation 暴露了与模块和依赖有关的粒度更小的事件钩子
- 插件需要在其原型上绑定 apply 方法，才能访问 compiler 实例
- 传给每个插件的 compiler 和 compilation 对象都是同一个引用，若在一个插件中修改了它们身上的属性，会影响后面的插件
- 找出合适的事件点去完成想要的功能
  - emit 事件发生时，可以读取到最终输出的资源、代码块、模块及其依赖，并进行修改(emit 事件是修改 Webpack 输出资源的最后时机)
  - watch-run 当依赖的文件发生变化时会触发
- 异步的事件需要在插件处理完任务时调用回调函数通知 Webpack 进入下一个流程，不然会卡住 （作为回调执行的第二个参数的next方法必须调用）

### compiler（编译器） 和 compilation（编译）
两个对象都是继承至`Tapable`
> Tapable是一个类似于`NodeJS`的EventEmitter库，主要控制子函数的发布与订阅，控制着webpack的插件系统

tapable提供了**同步和异步绑定钩子的方法**，并且他们都是绑定时间和执行事件的对应方法:

```
          Async (异步)                      sync（同步）
绑定：     tapeAsync/tapPromise/tap       绑定：tap
执行：     callSync/promise               执行：call
```

compiler提供的钩子（生命周期钩子）：
```
	this.hooks = {
			/** @type {SyncBailHook<Compilation>} */
			shouldEmit: new SyncBailHook(["compilation"]),
			/** @type {AsyncSeriesHook<Stats>} */
			done: new AsyncSeriesHook(["stats"]),
			/** @type {AsyncSeriesHook<>} */
			additionalPass: new AsyncSeriesHook([]),
			/** @type {AsyncSeriesHook<Compiler>} */
			beforeRun: new AsyncSeriesHook(["compiler"]),
			/** @type {AsyncSeriesHook<Compiler>} */
			run: new AsyncSeriesHook(["compiler"]),
			/** @type {AsyncSeriesHook<Compilation>} */
			emit: new AsyncSeriesHook(["compilation"]),
			/** @type {AsyncSeriesHook<string, Buffer>} */
			assetEmitted: new AsyncSeriesHook(["file", "content"]),
			/** @type {AsyncSeriesHook<Compilation>} */
			afterEmit: new AsyncSeriesHook(["compilation"]),

			/** @type {SyncHook<Compilation, CompilationParams>} */
			thisCompilation: new SyncHook(["compilation", "params"]),
			/** @type {SyncHook<Compilation, CompilationParams>} */
			compilation: new SyncHook(["compilation", "params"]),
			/** @type {SyncHook<NormalModuleFactory>} */
			normalModuleFactory: new SyncHook(["normalModuleFactory"]),
			/** @type {SyncHook<ContextModuleFactory>}  */
			contextModuleFactory: new SyncHook(["contextModulefactory"]),

			/** @type {AsyncSeriesHook<CompilationParams>} */
			beforeCompile: new AsyncSeriesHook(["params"]),
			/** @type {SyncHook<CompilationParams>} */
			compile: new SyncHook(["params"]),
			/** @type {AsyncParallelHook<Compilation>} */
			make: new AsyncParallelHook(["compilation"]),
			/** @type {AsyncSeriesHook<Compilation>} */
			afterCompile: new AsyncSeriesHook(["compilation"]),

			/** @type {AsyncSeriesHook<Compiler>} */
			watchRun: new AsyncSeriesHook(["compiler"]),
			/** @type {SyncHook<Error>} */
			failed: new SyncHook(["error"]),
			/** @type {SyncHook<string, string>} */
			invalid: new SyncHook(["filename", "changeTime"]),
			/** @type {SyncHook} */
			watchClose: new SyncHook([]),

			/** @type {SyncBailHook<string, string, any[]>} */
			infrastructureLog: new SyncBailHook(["origin", "type", "args"]),

			// TODO the following hooks are weirdly located here
			// TODO move them for webpack 5
			/** @type {SyncHook} */
			environment: new SyncHook([]),
			/** @type {SyncHook} */
			afterEnvironment: new SyncHook([]),
			/** @type {SyncHook<Compiler>} */
			afterPlugins: new SyncHook(["compiler"]),
			/** @type {SyncHook<Compiler>} */
			afterResolvers: new SyncHook(["compiler"]),
			/** @type {SyncBailHook<string, Entry>} */
			entryOption: new SyncBailHook(["context", "entry"])
		};
```
**compilation**
> `compilation`对象代表了一次单一的版本构建和生成资源。当运行 webpack 开发环境中间件时，每当检测到一个文件变化，一次新的编译将被创建，从而生成一组新的编译资源。一个编译对象表现了当前的模块资源、编译生成资源、变化的文件、以及被跟踪依赖的状态信息。编译对象也提供了很多关键点事件回调供插件做自定义处理时选择使用。

```
this.hooks = {
assetPath: new SyncWaterfallHook(["filename", "data"]), // 生成文件
}
具体钩子见webpack/lib/compilation.js文件
```
### 手动实现一个简单的 plugin

一个`plugin`的组成：
1. 一个函数或者`class`
2. 原型上必须要有一个`apply`方法，参数为`compiler`,这个`compiler`是webpack的实例
3. 指定挂载的webpack事件钩子，可以选择`compiler`上的一部分的生命周期，不同的事件节点去绑定需要的事件,以便以后触发，最后进行自己的操作，如：

```
// 在编译compiler，绑定whileCompiler事件
compiler.hooks.compile.tap('whileCompiler', (compilation，next) => {
    console.log(compilation)
    next()
})
```
4. 处理webpack内部实例的特定数据

```
// html-webpack-plugin
// 在output之前输出文件
compilation.assets[finalOutputName] = {
    source: () => html,
    size: () => html.length
};
```

5. 功能完成后调用webpack提供的回调

> 执行回调函数
```
emitHtmlPromise.then(() => {
    callback();
});
```

基本用法：
```
{
  plugins: [new DemoWebpackPlugin()]
}
```
实现
```
class DemoWebpackPlugin {
    constructor () {
        console.log('plugin init')
    }
    apply (compiler) {
       compiler.hooks.compile.tap('DemoWebpackPlugin', (compilation，next) => {
            compilation.assets['index'] = {
    			source: () => html,
   				size: () => html.length
			};
        })
    }
}
```
