## babel的探索之路
babel的用途
> 转译esNext、typescript、flow等之后到目标环境能够支持的js，而且还能针对目标环境不支持的`api`进行polyfill.
同时babel7还支持了`preset-env`,可以指定target来进行按需转换，转换更加精准、产物更小

### 特殊用途
1. 函数插桩
2. Taro小程序框架的实现
3. 自动国际化
4. default import 转换成 named import 

### 代码的静态分析

1. linter工具就是分析AST结构，对代码规范进行规范
2. api自动生成文档，可以提取源码中的注释，然后进行生成文档
3. type checker会根据AST中提取的或者推导的类型，对AST进行类型是否一直的检查，从而减少运行时因类型导致的错误
4. 压缩混淆工具，这个也是分析代码结构，进行删除死代码，变量名混淆，变量折叠等各种编译优化，生成体积更小，性能更优的代码。
5. js解释器，除了对AST进行各种信息的提取和检查以外，还能够直接执行AST

### babel编译流程
babel实现了源到源的转换，是一个javascript 转义器，整体编译流程分为3步：
1. parser:通过parser把源码转成抽象语法树
2. transform: 遍历AST,调用各种transform插件对AST进行增删改
3. generator: 把转换成的AST打印成目标代码，并生成sourcemap

分成这三步的原因：
源码是按照一定语法来组织的字符串，人能够认识，但是计算机并不认识，想让计算机认识就要转成一种数据结构，通过不同的对象来保存不同的数据，并且按照依赖关系组织起来，这种数据数据结构就是抽象语法树（因为这个数据结构省略了一些无具体意义的分隔符：`;`,`{,}`），有了这个AST就能够让计算器理解源码字符串中的意思了，而理解是能够进行转换的前提，所以编译第一步需要把源码parser成AST

当转换成AST之后，就可以通过修改AST的方式来修改代码，这样就能对AST进行增删改

能把转换之后的AST重新组装成需要执行的代码字符串供编译器或者浏览器执行

#### parser过程
parser过程的目的是把源码字符转换成机器能够理解的AST,这个过程分为词法分析(分词)，语法分析
词法分析
比如：`let name='111'`这样一段源码，我们要先把它分成一个个不能在细分的单词`token`,也就是`let`、`name`、`=`、`111`,
然后要对这些`token`进行递归的组装，这个过程是词法分析，按照不同的语法分析，将一组单词合成对象

这样得到的树结果就是
```
        VariableDeclarator(let)
        ----               ----
        |                     |
    Identifier(name)        Literal(111)


```
#### transform
transform阶段是对parser生成的AST进行了处理，会进行AST的遍历，遍历的过程中处理到不同的AST节点会调用注册的相应的visitor函数，visitor函数里可以对AST节点进行增删改，返回新的AST(可以指定是否继续遍历新生成的AST)

#### generate
generate阶段会把目标代码字符串，并且生成sourcemap，不同的AST对应的不同结构的字符串。

### 常见的AST节点
1. Literal(字面量)包括如numberLiteral,booleanLiteral
2. Identifier(标识符)变量名，属性名，参数名等各种声明或者引用的名字都是Identifier
3. Statement(语句)

```javascript
break;
continue
return
debugger
throw new Error()
{}
try{}catch(){}finally{}
for...in
for
do...while
switch
with
label:
```
4. Declaration(声明语句)
```javascript
const a = 1;
function b(){}
class C {}

import d from 'e';

export default e = 1;
export {e};
export * from 'e';
```
5. Expression（表达式）
expression和statement的区别是，express一般都有返回值
```javascript
[1,2,3]
a = 1
1+2
-1
function(){}
()=>{}
class{}
a;
this;
super;
a::b
```
5. class

6. Modules
ES module是语法级别的模块规范，所以也有专门的AST节点

named import 

```javascript
import {cd} from 'xxx'
```
default import 

```javascript
import a from 'xxx'
```
namespaced import 

```javascript
import * as a from 'xxx'
```
这三个都是`importDeclaration`，但是对应了不一样的`module`类型：`importSpecifier`,`importDefaultSpecifier`,`importNamespaceSpecifier`

export 也是有三个类型: `ExportDefaultDeclaration`,`ExportNamedDeclaration`,`ExportAllDeclaration`

7. Program&Directive
program是代表整个程序的节点，它有body属性代表程序体，存放statement数组，就是具体执行的语句的集合，还有`directive`属性，存放`Directive`节点，比如：`use strict;`这个指令会使用`Directive`节点来表示

8. File&Comment
注释分为块注释和行注释，对应`commentBlock`和`commentBlock`节点

### AST的公共属性

- type: AST节点的类型
- start end loc：start和end代表了该节点对应的源码字符串的开始和结束下标，不区分行列。而loc属性是一个对象，有line和column属性分别记录开始和结束行号
- leadingComments,innerComments,trailingComments: 表示开始的注释，中间的注释，结尾的注释，因为每个节点中都可以存在注释
- extra:记录一些额外的信息，用于处理一个特殊情况，比如StringLiteral修改value只是值的修改，而修改extra.raw则可以连同但双引号都给替换