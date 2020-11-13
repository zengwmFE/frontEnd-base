## vue 源码目录设计

- compiler
- core
- platforms
- server
- sfc
- shared

### compiler

> `compiler`目录包含`vue`所有编译相关的代码，包含了把模板解析成`ast`语法树，`ast`语法树优化，代码生成等功能。

> 编译的工作可以在构建时做（借助`webpack`,`vue-loader`等辅助插件）；也可以在运行时做，使用包含构建功能的`vue.js`.显然编译是一项耗性能的工作，所以更推荐前者-离线编译

### core

> `core`目录包含了`Vue`的核心代码，包括内置组件，全局`API`,`Vue`实例化，观察者，虚拟`DOM`,工具函数

### platform

`vue`可以跑在`web`和`native`,这个文件代表了`vue`的入口

### server

Vue.js 2.0 支持了服务端渲染，所有服务端渲染相关的逻辑都在这个目录下

### sfc

正常来说`vue.js`会借助`webpack`构建，然后通过`.vue`来编写组件
这个目录代码逻辑会把`.vue`文件内容解析成一个`javascript`对象

### shared

工具方法，被服务端和浏览器端所共享
