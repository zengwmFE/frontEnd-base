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
