### this 的含义

> **this 实际上是在函数被调用时发生的绑定**，它指向什么完全取决于函数在哪里被调用

### 调用位置

在理解 this 的绑定过程之前，首先要理解**调用位置**：调用位置就函数在代码中被调用的位置（而不是声明的位置）。但是很多的代码会隐藏函数的真正的调用的位置，所以说，最重要的是要分析调用栈

### 绑定规则

1. 默认绑定

虽然 this 的绑定规则完全取决于调用位置，但是只有在函数运行在非 strict mode 下，默认绑定才能绑定到全局对象；在严格模式下，调用函数才不会影响默认绑定

```
function foo(){
  console.log(this.a)
}
var a = 2;
(function(){
  "use strict"
  foo(); //2
})
```

2. 隐式绑定

> 另一条需要考虑的规则是调用位置是否有上下文对象，或者说被某个对象有用或者调用

```
function foo(){
  console.log(this.a)
}
var obj = {
  a: 2,
  foo: foo
}
obj.foo() //2
```

2.1 隐式丢失

> 一个最常用的 this 绑定问题就是被隐式绑定的函数会丢失绑定对象，从而绑定到全局对象或者 undefined 上，取决于是否是严格模式

```
function foo(){
  console.log(this.a)
}
var obj = {
  b: 2,
  foo: foo,
}
var a = 'oops,global'
setTimeout(obj.foo,100)
```

为什么丢失掉了？因为 setTimeout 这个函数使用一个变量`fn`来接收`obj.foo`,这样在执行`fn`，相当于在 window 环境下调用了`fn`，所以 this 指向 window 或者 undefined.

3. 显式绑定

- call 和 apply

- bind

- new 绑定

绑定优先级：

> new > bind> 隐式绑定> 默认绑定

4. 被忽略的 this
   > 如果把 null 或者 undefined 作为 this 的绑定对象传入`call`、`apply`或者`bind`,这些值在调用的时候会被忽略掉，实际应用的是默认绑定规则。

```
function foo(){
console.log(this.a)
}
var a = 2;
foo.call(null) // 2
```

5. 更安全的 this
   > 在 JavaScript 中创建一个空对象最简单的方法都是`Object.create(null)`.`Object.create(null)`和`{}`很像，但是并不会创建`Object.prototype`这个委托，所以它要比`{}`更加的空

```
var obj__empty = Object.create(null)
{}// No properties
```

6. 间接引用

```
function foo(){
  console.log(this.a)
}
var a = 2;
var o = {a:3,foo: foo}
var p = P{a:4}
o.foo() // 3
(p.a = o.a)();
```

#### 问题

箭头函数和普通函数的区别

1. 没有 this 值
   > 箭头函数没有 this 值，所以需要通过查找作用域链来确定函数的 this 的值
2. 没有 arguments
3. 不能被 new 关键字调用
   javaScript 函数有两个内部的方法`[[Call]]`和`[[Construct]]`
   在通过 new 调用函数时，执行`[[Construct]]`方法，创建一个实例对象，然后再执行函数体。将 this 绑定到实例上。
   当直接调用的时候，执行`[[Call]]`方法，直接执行函数体

   由于箭头函数没有`[[Construct]]`，不能被用作构造函数，如果通过 new 的方式调用，会报错

4. 没有 new.target 属性

`new.target` 是 ES6 新增的属性，用于判断当前函数是否是被`new`或者`Reflect.constructor`调用，如果是返回`undefined`

5. 没有原型
   不能使用 new 调用箭头函数，所以就没有构建原型的需求。
6. 没有 super
