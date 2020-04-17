## AST

定义：

> It is a hierarchical program representation that presents source code structure according to the grammar of a programming language, each AST node corresponds to an item of a source code.(它是一种分层的程序表示，根据编程语言的语法来表示源代码结构，每个 AST 节点对应一个源代码项。)

看一段代码

```
function square(a,b){
	return a+b;
}
```

**AST 树**

```
{
  "type": "Program",
  "body": [
    {
      "type": "FunctionDeclaration",
      "id": {
        "type": "Identifier",
        "name": "square"
      },
      "expression": false,
      "generator": false,
      "async": false,
      "params": [
        {
          "type": "Identifier",
          "name": "a"
        },
        {
          "type": "Identifier",
          "name": "b"
        }
      ],
      "body": {
        "type": "BlockStatement",
        "body": [
          {
            "type": "ReturnStatement",
            "argument": {
              "type": "BinaryExpression",
              "left": {
                "type": "Identifier",
                "name": "a"
              },
              "operator": "+",
              "right": {
                "type": "Identifier",
                "name": "b"
              }
            }
          }
        ]
      }
    }
  ],
  "sourceType": "module"
}
```

一个编译器所做的事：

![](https://github.com/zengwmFE/frontEnd-base/blob/master/image/16750e43f17b9bab.png)

编译器最后会将高级语言转译为二进制代码。但是关注`AST`的时候，只需要知道:词法解析和语法解析

第一步，词法分析，也叫做扫描`scanner`，它读取代码，最后会按照预定的规则合成一个个的标识 tokens.同时它会移除空白符，注释等，最后整个代码将被分割成一个`tokens`列表（或者说是一维数组）如：

```
const a = 5;
// [{value: "a",type: "keyword"},{value: "a",type: "idetifier}]
```

第二步：语法分析，也叫解析器，他会把`tokens`列表数组转化成树形的表达形式。同时验证语法是否有错，如果有错的话，抛出语法错误。
也就是上面最长的那段代码了

第三步：代码生成。

---

<!-- AST 作用 过程 优点 哪些地方用了 如果能说缺点 改进方案  -->

模拟实现的工具：`babel`，生成代码需要经历的 3 个步骤

1. 词法解析
2. 语法解析
3. 代码生成

babel 提供了对应的工具：`@babel/parser`-（生成 AST）、`@babel/traverse`-（对 AST 树进行循环遍历）`@babel/generator`-代码生成

同时为了能够实现其他功能`babel`还提供了`@babel/types`，提供了对`AST`树的增删改查

#### 作用及使用地点

作用：AST 每个节点都对应代码里的一种结构，比如表达式，声明语句，赋值，函数等等。然后可以通过操作树的结构来最终在生成代码结构的时候，来改变我们的源代码；
使用地点：比如：vue 文件的解析，jsx 的解析，`babel`整个工具库的语法转换，webpack 中常见的代码压缩：`UglifyJS`

#### 优点

- 可以使用包含的每一个元素的属性和注释等信息编辑和增强一个`AST`.但是要直接操作源码，这样编辑和注释是不可能的，因为这样的话就应该要直接直接修改它.
- `AST`没有多余的标点符号和分割号（括号）.
- 由于编辑器要进行连续的分析，`ast`通常包含了关于程序额外信息，包括在源代码的位置，从而在源代码出错的时候，可以打印出有用的错误信息.
