### webpack实现首屏加载插入(属于项目优化)

```
// webpack.config.js
new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './src/index.html',
      loading,
})
const loading = {
  html: '加载中',
}
// html
<div id="app">
        <%= htmlWebpackPlugin.options.loading.html %>
</div>
```
可以通过`<%= htmlWebPackPlugin.options.loading.html %>`获取到在`webpack`配置的内容
也可以通过`webpack`写插件,来获取资源的数量的加载，

### webpack体积分析工具
首先通过`webpack --profile --json > stats.json`，生成`stats.json`
webpack-chart

webpack-bundle-analyzer

### 压缩js，css
```
// webpack-parallel-uglify-plugin
new ParallelUglifyPlugin({
      exclude: /\.min\.js$/,
      workerCount: os.cpus().length,
      compress: {
        warnings: false,
        drop_console: true,
      },
      terser: {
        output: {
          beautify: false,
          comments: false,
        },
      },
    })
```

`optimize-css-assets-webpack-plugin`webpack4.x
`css-minimier-webpack-plugin`webpack5.x优化和压缩css
`happypack->thread-loader`

`terser-webpack-plugin`用`terser`对js进行压缩

```
optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
```

### sourceMap的妙用

五个关键字

|关键字|意义|
|--|--|
|source-map|产生了.map文件|
|eval|用eval包含模块代码|
|cheap|不包含列信息也不包含loader的sourcemap|
|module|包含loader的sourcemap(比如jsx->js,babel的sourcemap),否则无法定义源文件|
|inline|将.map作为DataUrl嵌入，不单独生成.map文件|

#### source-map
生成了一个独立的`.map`文件
```
{"version":3,"sources":["webpack://webpack-sourcemap/./src/index.js"],"names":[],"mappings":";;;;;AAAA;AACA;AACA","file":"main.js","sourcesContent":["let a = 1,\n  b\nb = a\n"],"sourceRoot":""}
```
定位信息最全，但是`.map`文件也大，效率最低

#### eval
用`eval`包含了源代码执行IIEF，利用字符串可缓存从而提效
```
/***/ (() => {

eval("let a = 1,\n  b\nb = a\n\n\n//# sourceURL=webpack://webpack-sourcemap/./src/index.js?");

/***/ })
```

#### inline-source-map
不单独生成`.map`文件，减少了文件

#### cheap-source-map
如果发生错误，对于`cheap-source-map`只会定义到出错的那一行，至于那个地方错了，并不会指明
`source-map`会定义到列

也就是用错误精准度降低了，来换取文件打包内容的缩小

#### cheap-module-source-map
`cheap-source-map`，如果代码经历了`babel`的转化，在执行界面使用`debuger`来观察代码，使用的是**ES5**代码
`source-map`这个就能看到的`ES6`
`cheap-module-source-map`这也就能定位到`ES6`的代码

#### 配置项最佳实践：

开发环境
- 我们在开发环境对`source-map`的要求：`快（cheap）`,信息全（module）
- 但是因为在开发环境没有被压缩，所以使不使用`cheap`也没有那么重要
- 而且`source-map`给错误收集工具，而且不会为`bundle`添加引用注释，以避免浏览器使用


**所以开发环境比较推荐的配置dev:'cheap-module-eval-source-map'**

生产环境
- 一般来说，生产环境不希望能直接看到没有经过编译的源码
- 一般来说，不应该直接提供`source-map`给浏览器，但是又需要`source-map`来定位生成环境的错误信息

**所以可以使用devtool: 'hidden-source-map'**