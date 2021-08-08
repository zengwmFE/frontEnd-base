vue3使用lerna来实现多项目的分包的管理
* compiler-core 与平台不相关的编译器，编译代码到AST
* compiler-dom 针对于浏览器相关的编译器
这两个内容结合将AST转换成render函数

* compiler-sfc 编译单文件 拆分的过程
* Reactive 系统响应系统（mbox）
* runtime-core 与平台无关的运行时，如:API类\虚拟dom的渲染器，自定义渲染器
* runtime-dom 与平台相关，浏览器对应的运行时

