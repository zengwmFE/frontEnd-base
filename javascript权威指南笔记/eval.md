### eval
1. eval()只有一个参数，如果传入的参数不是字符串，他直接返回这个参数
```
eval(1) // 1
eval(function(){a = 1}) // function(){a = 1}
```
2. 如果参数是字符串的话，他会把字符串当成JavaScript代码进行编译（parse）,如果编译失败，则会抛出语法错误（SyntaxError）异常。如果编译成功，则会开始执行这个代码，并返回字符串中最后一个表达式或语句的值，如果最后一个表达式或语句没有值，则最终返回`undefined`。如果字符串抛出了一个异常，这个异常将把该调用传递给eval

### eval的作用域环境
关于`eval()`最重要的是，它使用了调用它的变量作用域。也就是说，它查找变量的值和定义新变量和函数的操作和局部作用域中的代码完全一样

```
function fun(){
    var x = 1;
    console.log(eval("x"))
}

var x = 2;
fun(); // 1 这个时候eval是在函数作用域中被调用的，所以它会去使用fun函数的作用域环境，首先找到x = 1

function fun(){
    var x = 1;
    console.log(window.eval("x")) 
}
var x = 2;
fun(); // 2 这个时候window调用了eval，所以eval使用的window的作用域
```

### 全局的eval()
当通过别名调用时，eval()会将其字符串当成顶层的全局代码来执行。执行的代码可能会定义新的全局变量和全局函数，或者给全局的变量赋值，但确不能使用或者修改主调函数中的局部变量

ECMAScript5是反对使用EvalError的，并且规范了eval()的行为，。“直接的eval”,当直接使用非限定的"eval"名称（eval看起来像是一个保留字）来调用eval函数时，通常被称为“直接eval”。直接调用eval()时，它总是在调用它的上下文作用域内执行。其他的间接调用则使用全局对象作为其上下文作用域，并且无法读写定义局部变量和函数

```
var geval = eval;

var x = 1;

function fn1(){
var x  = 2
geval("++x")
console.log(x) //2
}
fn1()
console.log(x) //2
```
证明eval改变的是全局对象的`x`
