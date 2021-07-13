## webpack运行流程

1. compiler webpack的运行入口，compiler对象代表了完整的webpack环境配置，这个对象在启动webpack时被一次性建立，并配置好所有可操作的设置，包括`options`,`loader`,`plugin`.当在webpack环境应用一个插件时，插件将在`apply`方法的参数获取到compiler属性，这样就可以访问到webpack的主流程环境
2. compilation 对象代表了一次资源的构建。当运行webpack开发环境中间件时，每当检测到一个文件变化时，就会创建一个新的compilation,从而生成一组新的编译资源，一个compilation对象表现了当前的模块资源，编译生成资源，变化的文件，以及被跟踪依赖的状态信息。compilation对象也提供了很多关键步骤的回调。比如（`assets`）.以供插件做自定义处理时选择使用
3. chunk 用于生成chunk的类，对于构建时需要的chunk对象由compilation创建后保存管理（webpack中最核心的负责编译的compiler和负责创建bundles的compilation都是Tapable的实例）
4. Module，用于代码模块的基础类，衍生出很多子类用于处理不同的情况(如：`normalModule`)关于代码模块的所有信息都会存在`Module`实例中，例如`dependencies`用来存放代码模块的依赖等
    - 当一个`Module`实例被创建后，比较重要的一步是执行`compilation.buildModule`这个方法，它会调用`Module`实例的`build`方法来创建`Module`实例需要的一些东西，然后调用自身`runloaders`，`runloader`：就会通过 `loader-runner`执行对应的`loaders`,将代码源码内容交给配置中对应的`loader`处理后，在把处理后生成的结果保存下来
5. Parser，其中相对复杂的一部分，基于acorn来分析AST语法树，解析出代码模块的依赖
6. Dependencies，解析时用于保存代码对应的依赖使用的对象，Module实例的build方法在执行完对应的`loader`时，处理完模块自身的转换后，继续调用`Parser`的实例来解析自身依赖的模块，解析后的结果存放在`Module.dependencies`中，首先保存的是依赖的路径，后续会经由`compilation.processModuleDependencies`方法，然后再去处理各个依赖模块，递归的去建立整个依赖
7. Template 生成最终代码要使用到的代码模版

### 生成源码小分析：
首先观察源码会发现，生成后的源码类似于

```
(function(modules){})({
    './src/index': 123,
    './src/test': 456
})
```
就是一个IIFE，然后将模块依赖通过参数传入，模块依赖是以`{key:value}`的格式传入到`modules`，`key`就是依赖的路径，然后`value`就是对应解析出来的源码

