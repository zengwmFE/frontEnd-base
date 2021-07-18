## transform 流程

babel 会递归遍历 AST，遍历过程中处理到不同的 AST 会调用不同的 visitor 函数来实现 transform，这是 visitor 模式的应用

### visitor 模式

> 访问者模式：当被操作的对象结构相对稳定，而操作对象的逻辑经常发生变化的时候，通过分离逻辑和对象结构，使得他们能独立扩展。

对应到`babel-traverse`中的实现，就是 AST 和 visitor 分离，在`traverse`遍历 AST 的时候，调用注册的 visitor 来对其进行处理。这样 AST 结构相对固定的时候，遍历算法也是固定的，但是 visitor 可以通过插件独立扩展功能

### 路径和作用域

babel AST 只包含了源码的一些信息，所以要操作 AST 的时候，要拿到节点的父节点的信息，并且也需要对 AST 增删改的方法，那么这些内容就在`path`对象中

```javascript
module.exports = function({types,template}){
    return {
        visitor: {
            CallExpression(path,state){
               ...
            }
        }
    }
}
```

#### path 的属性和方法

常用属性

```javascript
    node
    parent
    parentPath
    scope
    hub
    container（不常用）
    key （不常用）
    listKey （不常用）
```

- node 当前节点
- parent 父节点
- parentPath 父 AST 节点的 path
- path.scope 作用域
- path.hub 可以通过 path.hub.file 拿到最外层 File 对象，path.hub.getScope 拿到最外层作用域，path.hub.getCode 拿到源码字符串

常用方法：

- inList 判断节点是否在数组中，如果 container 为数组，也就是有 listKey 的时候，返回 true
- get(key)获取某个属性的 path
- set(key,value)设置某个属性的值
- getSibling(key) 获取某个下标的兄弟节点
- getNextSibling() 获取下一个兄弟节点
- getPrevSibling() 获取上一个兄弟节点
- getAllPrevSiblings() 获取之前的所有兄弟节点
- getAllNextSiblings() 获取之后的所有兄弟节点
- find(callback) 从当前节点到根节点来查找节点（包括当前节点），调用 callback（传入 path）来决定是否终止查找
- findParent(callback) 从当前节点到根节点来查找节点（不包括当前节点），调用 callback（传入 path）来决定是否终止查找
- isXxx(opts)(比如 isJsxElement) 判断当前节点是否是某个类型，可以传入属性和属性值进一步判断，比如
- assertXxx(opts) 同 isXxx，但是不返回布尔值，而是抛出异常
- insertBefore(nodes) 在之前插入节点，可以是单个节点或者节点数组
- insertAfter(nodes) 在之后插入节点，可以是单个节点或者节点数组
- replaceWith(replacement) 用某个节点替换当前节点
- replaceWithMultiple(nodes) 用多个节点替换当前节点
- replaceWithSourceString(replacement) 解析源码成 AST，然后替换当前节点
- remove() 删除当前节点
- traverse(visitor, state) 遍历当前节点的子节点，传入 visitor 和 state（state 是不同节点间传递数据的方式）
- skip() 跳过当前节点的子节点的遍历
- stop() 结束所有遍历

#### 作用域 path.scope

scope 是作用域信息，javascript 中能生成作用域的就是模块、函数、块等，而且作用域之间会形成嵌套关系，也就是作用域链。babel 在遍历的过程中会生成作用域链保存在 path.scope 中。

**path.scope.binding,path.scope.reference 重点**
作用域中保存的是声明的变量和对应的值，每一个声明都叫做一个`binding`（绑定）
比如：

```javascript
const a = 1;
```

他的`binding`

```javascript
bindings: {
    a: {
        constant: true,
        constantViolations: [],
        identifier: {type: 'Identifier', ...}
        kind:'const',
        path: {node,...}
        referenced: false
        referencePaths: [],
        references: 0,
        scope: ...
    }
}
```

#### node链，block链，scope链
从某一个节点出发有3条链，path和path.parent串联起来的AST node 链，path.scope和path.scope.parent串联起来的scope链，path.scope.block和path.scope.parentBlock串联起来的块ASTblock链


#### state
state是遍历过程中AST节点的之间传递数据的方式，插件的visitor,第二个参数就是state，插件可以从state中拿到opts，也就是插件的配置项，也可以拿到file对象，file中有一些文件级别的信息

```javascript
state: {
    file
    opts
}
```

#### AST的别名
遍历的时候指定visitor处理的AST,有的时候需要对多个节点进行处理，babel支持指定多个AST类型，也可以通过别名指定一系列的类型：

```
  // 单个 AST 类型
  FunctionDeclaration(path, state) {},
  // 多个 AST 类型
  'FunctionDeclaration|VariableDeclaration'(path, state) {}
  // AST 类型别名
  Declaration(){}
```
