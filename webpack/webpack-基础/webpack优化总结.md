## webpack

### webpack的tree Shaking 一问
https://juejin.cn/post/6844903777229635598#heading-1
1. js的tree Shaking->在webpack4之后默认支持了js的tree Shaking
2. css的tree Shaking在webpack中没有内置css的tree Shaking,所以需要依靠外部plugin来处理：`purgecss-webpack-plugin`

！！！而且webpack的treeShaking只能简单的扫描一遍导入导出的引用关系，对于`scope`内部他无法进行tree shaking.举例说明：

```javascript
// sync.js
import {isArray} from "lodash-es";
const sync = function () {
  console.log("sync");
};

const fnIsArray = function (arg) {
  console.log(isArray(arg), "myisArray");
};


export { sync };


// index.js
import {sync} from './components/sync'

sync()
console.log('重新开始学习webpack4的配置')
```
在这里函数`isArray`没有在任何地方使用了，但是当我们真正进行`production`构建的时候，竟然发现没办法去掉这个`lodash`中的isArray方法
证明webpack无法针对`scope`内部进行深度`treeShaking`

解决办法：
`webpack-deep-scope-plugin`


**这个插件已经不再维护了，但是`webpack5`优化改进了这个方案，能做到了这个插件所做的事情**

webpack4
```
上面省略一万行代码，😂   webpack4  dddd
function (e, r, t) {
    "use strict";
    t.r(r);
    Array.isArray;
    console.log("sync"), console.log("重新开始学习webpack4的配置");
  },
```
同样的案例在`webpack5`中打印
```
(() => {
  "use strict";
  console.log("sync"), console.log("重新开始学习webpack4的配置");
})();

```
这是使用了`webpack-deep-scope-plugin`之后的包

```javascript
function (e, t, n) {
    "use strict";
    n.r(t);
    n(419);
    console.log("sync"), console.log("重新开始学习webpack4的配置");
}
```
总结：
在webpack4中没有提供两个东西：

1. js深度treeShaking
2. csshint

#### 扩展 cssModule
[阮一峰 cssModules用法](http://www.ruanyifeng.com/blog/2016/06/css_modules.html)

CSS的规则都是全局的，任何一个组件的样式规则，都对整个页面有效。
产生局部作用域的唯一方法，就是使用一个独一无二的class的名字，不会与其他选择器重名。这就是`CSS Modules` 的做法。
```
// App.js
<h1 class="_3zyde4l1yATCOkgn-DBWEL">
  Hello World
</h1>

// App.css
._3zyde4l1yATCOkgn-DBWEL {
  color: red;
}
```
webpack使用`css-loader`中`options`内的`modules`来开启`CSS modules`: 

```
{
    loader: 'css-loader',
    options: {
    modules: {
         localIdentName: "[name]_[local]-[hash:base64:5]",
    },
}
}
```
在webpack中，这配置一般用于`MPA`


### 2问-文件指纹码的区别

1. hash 和整个项目的构建相关，只要项目有修改，整个项目构建的值就会发生改变
2. chunkhash 和webpack打包的chunk相关，不同的entry会生成不同的chunkhash,缺点就是，如果只改变了js，同时也会让同文件引入的css的chunkhash发生改变，因为这两个是属于一个`entry`出来的
3. contenthash 根据文件内容来定义了hash值，文件如果没有改变的话，那么他重新发生构建之后的值是不会改变的

### webpack-dev-server

webpack-dev-server可用于快速开发应用程序

```node
// 使用用例1：
{
    ...
    devServer: {
        contentBase: path.join(__dirname,'dist'),
        compress: true,
        port: 9000
    }
}
// 使用用例2:

const Webpack = require('webpack');
const WebpackDevServer = require('../../../lib/Server');
const webpackConfig = require('./webpack.config');

const compiler = Webpack(webpackConfig);
const devServerOptions = { ...webpackConfig.devServer, open: true };
const server = new WebpackDevServer(devServerOptions, compiler);

server.listen(8080, '127.0.0.1', () => {
  console.log('Starting server on http://localhost:8080');
});
```
常用的配置项
1. `contentBase` 告诉服务器内容的来源，仅在需要提供静态文件时才需要进行配置；示例：`contentBase: path.join(__dirname,'public')`，优先级小于`publicPath`
2. `publicPath` 捆绑的文件可以在此路径的浏览器下可用
3. `proxy`代理请求: 

    ```
     proxy: {
      '/api': 'http://localhost:3000',
    }
    ```
    代表了对`/api/users`对请求会将请求代理到 `http://localhost:3000/api/users`
    不过大部分时间，我们可能不需要`/api`这个前缀：
    ```
    proxy: {
        '/api': 'http://localhost:3000',
        pathRewrite: {
            '^/api': ''
        }
    }
    ```
### 3问-异步导入优化之魔法注释

```
// Single target
import(
  /* webpackChunkName: "my-chunk-name" */
  /* webpackMode: "lazy" */
  /* webpackExports: ["default", "named"] */
  'module'
);
```
如果我们采用异步导入模块的话，就会导致这些模块打包之后，名字变成了`1.3503b.bundles.js`，就只能以`id`为辨认标志了，这样比较不友好，这个时候就可以采用魔法注释（`Magic comments`）来设置对应的名称

### 4问-webpack之SPA
#### optimization.runtimeChunk
SPA在运行的时候，尽量要减少页面切换时请求的包，设置为`true`或者`multiple`,会为每个入口添加一个只含有`runtime`的额外`chunk`,这样就能减少页面多次请求这个内容，就跟很多页面会将一些必须要用的文件，直接通过`script`标签写入到`html`中

#### optimization.splitChunk
对于动态导入模块，默认使用`webpack v4+`提供的全新的通用分块策略

#### optimization.minimizer
开启多核压缩

### 小工具solo webpack

速度监控:

`speed-measure-webpack-plugin`
构建完成后提醒: 

`webpack-build-notifier-plugin`
构建进度显示:

`webpack-progress-bar-plugin`

构建面板显示：
`webpack-dashboard`
修改命令行的title
`node-bash-title`

### 上线配置
1. 多核压缩 minimizer配合terserPlugin 开启多核压缩以及进行缓存
2. ES6+的处理方式
   如果浏览器遇到无法认识的`ES6+`的语法，那么就会考虑使用`babel-loader`去转化成`ES5`的语法,但是这样做的话，由于现在大批量的浏览器已经在支持`ES6`的语法，`ES6`的API等内容在进行处理成`ES5`之后，会出现大量的代码，这对不需要转换的代码的浏览器非常繁重。同时`v8`是对`ES6`语法进行了优化，如果不使用`ES6`语法，可能效率也会比`ES6`.所以我们需要考虑要去兼容不同浏览器，提供出不同的方案。

```
    // 支持ES6的时候
    <script type="module" src="xxx"></script>
    // 不支持ES6的时候运行下面代码
    <script nomodule src="xxx"></script>
```
> 一般来说会将这两个通过webpack主动插入到`html`中，让浏览器自动去识别支不支持这个属性。但是现在在`Chrome`浏览器中，遇到了type="module"会出现跨域的情况

以上是针对于ES6语法，如果遇到ES6之后，无法通过babel进行编译的代码如：`async generator`，这个时候就需要去考虑`polyfill`
1. babel-polyfill 缺点就是包太大，捡芝麻，可能会掉了西瓜
2. https://cdn.polyfill.io/v2/polyfill.min.js?features=Map,Set 这个文件可以根据需求，根据浏览器是否支持来生成对应的代码




### 小总结一下
`webpack`在对于`SPA`比较核心的打包下四个包：**async异步导入包**、**common组件包**、**main逻辑核心包**、**runtime运行时所需要的包**


