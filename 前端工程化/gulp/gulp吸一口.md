## gulp
核心包：`gulp-cli`,`gulp`
### 创建任务（task）
- 公开任务 从gulpfile中被导出，可以通过gulp命令调用
- 私有任务 被设计为在内部使用，通常作为`series()`或者`parallel()`组合的组成部分

```
const { series } = require('gulp')
function build(cb) {
  console.log('这是一个build函数')
  cb()
}
function clean(cb) {
  console.log('这是一个clean函数')
  cb()
}
exports.build = build
exports.default = series(build, clean)

```
可以通过`series`内置函数来执行，串行执行两个任务，同样也可以直接导出一个任务，单独让`gulp`进行执行

`gulp --task`用来执行任务，我们可以得到的是:

```
Starting 'default'...
Starting 'build'...
这是一个build函数
Finished 'build' after 679 μs
Starting 'clean'...
这是一个clean函数

```
就证明了这些任务的确是串行执行的

`gulp build`用来执行单个任务

```
$ gulp build
Starting 'build'...
这是一个build函数

```

来试一下同步执行的任务:`parallel`，将`series`替换成`parallel`

```
 gulp --tasks
Starting 'default'...
Starting 'build'...
Starting 'clean'...
这是一个build函数
这是一个clean函数
```

#### 任意嵌套
这些任务可以使用`series`或者`parallel`，来实现任意的组合，包括任意深度:

```
parallel(clean, series(build, parallel(build1, build2)))
```


### 处理文件
`gulp`暴露了2个方法来处理文件，`src`和`dest`

```
const { src, dest } = require('gulp')

function build() {
  return src('src/*.js').pipe(dest('dist/'))
}

exports.default = build

```
pipe方法用来连接转换流或者可写流，以这里为例，`src`接受了路径，然后读取匹配文件生成Node流
dest方法接收一个输出目录作为参数，同样还会产生一个Node流，被成为终止流，当接受到管道`pipeline`中传输得文件时，它会将文件内容及文件属性写入到指定目录中。

`src`也可以放在管道中间，想流中添加文件，新加入得文件，仅对后续得转换有用

### glob详解
在src中我们用了类似`src/*.js`，那么这个`*`代表得意思是什么

#### 一个星号
如`*.js`匹配任意数量得字符，包括零个匹配。主要用于单机目录下得文件
可以匹配类似`index.js`得文件，但是不能匹配类似`script/index.js`或者`script/aaa/index`得文件

#### 两个星号
主要用于匹配嵌套目录下得文件，如
`script/**/*.js`可以用来匹配`script`文件夹下面得所有`js`。这里是任意层

#### 取反

`['script/**/*.js', '!scripts/vendor/']`表示不去匹配`scripts/vendor`里面得任何文件


### 插件
就相当于一个流水线中不同的工人做的事情，有的组装，有的喷漆，有的分拣，有的装盒
```
gulp-babel
gulp-rename
gulp-uglify
```
### 监听
```
const { src, dest, watch } = require('gulp')
const babel = require('gulp-babel')
const uglify = require('gulp-uglify')
const rename = require('gulp-rename')
function build() {
  return src('src/*.js')
    .pipe(babel({ presets: ['env'] }))
    .pipe(src('test/*.js'))
    .pipe(dest('dist/'))
    .pipe(uglify())
    .pipe(rename({ extname: '.min.js' }))
    .pipe(dest('dist/'))
}

function fs() {
  console.log('js改变了')
}
watch('src/*.js', fs)
exports.default = build

```