### plugin

> `plugin` 是 `webpack` 中非常重要和功能， `plugin` 提供了 `loaders` 无法做到的事，包括环境变量的增加，代码压缩和打包的优化等等。

#### 一个 `plugin` 应该至少具有以下内容

1. 一个JS的类或者一个函数
2. 在原型上有一个apply的函数，负责在webpack在编译的时候，执行该函数
3. apply需要有一个compiler的参数，便于plugin能获取到编译过程中的一些资源
4. 使用compiler提供的hooks，注册一个回调函数（想要知道具体可以看文章内的关于Tapable的介绍）
5. 必须调用webpack回调函数提供的 callback，即回调的第二个参数，必须在回调代码执行的最后调用，否则下一个plugin无法继续进行
6. 绑定的回调函数除了有callback这个参数，还需要一个非常重要的compilation，负责当前的模块资源，编译生成资源，变化的文件，以及跟踪以来的状态信息

**总结**
继承自 `tapable` 的两个实例: `compiler` 和 `compilation` ， `webpack` 为了区分两者的工作范围， `compiler` 主要负责的是**源码编译**，而 `compilation` 负责**文件输出**

#### 自定义实现一个简单的plugin

当然 `plugin` 没有 `loader` 那么方便，可以直接脱离 `webpack` 执行（ `loader` 可以使用 `loader-runner` ），所以要创建一个 `plugin` 需要依赖 `webpack` 的 `plugins` 数组

```
// webpack.dev.js
const simpleWebpackPlugin = require('../plugins/simple-webpack-plugin.js')
plugins: [
    new simpleWebpackPlugin({name: '新建Plugin'})
  ],
```

```

module.exports = class SimpleWebpackPlugin{
    constructor(options) {
        this.options = options;
    }
    apply(compiler) {
        const options = this.options
        compiler.hooks.emit.tapAsync('SimpleWebpackPlugin', (compilation, callback) => {
            compilation.assets['readme.txt'] = {
                source:function(){
                    return options.name
                },
                size:function(){
                    return 6
                }
            }
            callback()
        })
    }
}
```

在这里我们最后使用 `complation` 的**生成文件的过程**，最后可以在打包的 `dist` 文件中生成一个 `readme.text` 文件，并被写入: `新建Plugin`
