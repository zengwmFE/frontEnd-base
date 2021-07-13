### loader
loader是文件加载器，能够加载资源文件，并对这些文件进行一些处理，比如编译，压缩等等，并最终打包到指定的文件中，处理一个文件能够使用多个`loader`,`loader`的执行顺序和配置中的顺序是相反的（**从右往左执行**）
> **原因：**是因为`webpack`采用的是`compose`，类似于a(b)的时候，它会从从右到左的：a->b的执行
也就是说loader的执行接收前一个执行的`loader`的返回值作为参数，最后执行的`loader`会 返回此模块的**此模块的javascript源码**

1. `loader`就是一个简单的函数
2. 一个`loader`的职责是单一的，只能进行一种转化，如果一个源文件需要多个转化才能正常使用，那就要借助多个`loader`，如`sass和lless`文件的执行

#### loader-utils

官方提供的可以通过`loaderUtils.getOptions(this)`来获取webpack的配置参数，然后进行自己的处理

#### loader的异常处理和结果的回调处理
1. 可以直接通过`throw`来抛出错误
2. 通过`this.callback`传递错误（同步处理方式）
```
this.callback({error,content,sourceMap,meta})
// error可以为null，表示没有错误
```

3. `this.async`来处理`异步loader`

#### loader缓存的开启

webpack默认开启了`loader`的缓存
可以使用`this.cachable(false）`关掉缓存

#### pitch钩子
在`loader`文件中，`pitch`钩子的注册，可以让这个函数在所有的`loader`前被调用
1. `data`设置的值，可以在`loader`里面获取到,在每个`loader`里面都可以通过`this.data`获取到这些值
```
module.exports.pitch = (remaining, preceding, data) => {
    data.value = "bajiu"
}

module.export = function(data){
console.log('data',this.data.value) // bajiu
} 
```


#### 手动实现一个loader

```
const Spritesmith = require('spritesmith')
const fs = require('fs')
const path = require('path')
module.exports = function(source){
    // 合成图片是一个异步的过程，所以需要使用this.async()
    const callback = this.async()
    const imgs = source.match(/url\((\S*)\?__sprite/g)
    const matchImgs = []
    for(let i=0;i<imgs.length;i++){
        const img = imgs[i].match(/url\((\S*)\?__sprite/)[1]
        console.log(img)
        matchImgs.push(path.join(__dirname,img))
    }
    Spritesmith.run({
        src: matchImgs
    },(err,result)=>{
        console.log(result)
        fs.writeFileSync(path.join(process.cwd(),'dist/sprite.jpg' ),result.image)
        source = source.replace(/url\((\S*)\?__sprite/g,(match)=>{
            return `url("dist/sprite.jpg"`
        })
        callback(null,source)
    })
}
```