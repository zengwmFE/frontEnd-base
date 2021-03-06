### Symbols 是什么

> Symbols 是新的原始数据类型(`primitive`).跟`Number`、`String`等一样

Symbols 通过一个`Symbol`函数来创建 `Symbol`.Symbols 没有字面量的创建，也不能通过 new 来创建。
所以为了协调所有的原始数据类型.`ES6`建议所有的原始数据类型的创建都通过函数来创建如：

```
var num = Number(1)
var sym = Symbol("a")
console.log(sym) // Symbol("a")

console.log(sym.toString()) => "Symbol('a')"
```

### Symbols 适合做什么

1. `Symbol`能用作对象的`key`
   `Symbol`能用作对象的 key，这意味着可以分配足够多的具有唯一性的`Symbols`到一个对象上，这些`key`不会和现有的字符串`key`值冲突

```
var a = {}

var foo = Symbol('foo')
var bar = Symbol('bar')
a['foo'] = 1

a['bar'] = 2

a[foo] = '我是个symbol的foo'
a[bar] = '我是个symbol的bar'

console.log(a.bar) //2
console.log(a[foo]) // 我是个symbol的foo

```

**以`Symbol`为 key 值的属性，无法被`Object.getOwnPropertyNames`以及`for...in,for...of ,for..await...in`来获取，只能通过`Object.getOwnPropertySymbols()`来获取**

2. 作为一个可替换字符串或者整型使用的唯一值

### Symbol 注意事项

- Symbols 绝不会与对象的字符串 key 冲突
- Symbols 只能通过现有的反射工具来获取，只能通过`Object.getOwnPropertySymbols`
- Symbols 不是私有的，Symbols 的值总能被`Object.getOwnPropertySymbols`获取的到
- 可以被枚举的`Symbols`的值是可以被复制到其他对象的
- Symbols 除了可以转换成`Boolean`外，无法转换成其他类型的原始类型
- Symbols 不总是唯一的，`Symbol.for`会返回一个不唯一的`Symbol`值

```
var localFooSymbol = Symbol('foo');
var globalFooSymbol = Symbol.for('foo');

console.log(Symbol.keyFor(localFooSymbol) === undefined); // true
console.log(Symbol.keyFor(globalFooSymbol) === 'foo'); // true
console.log(Symbol.for(Symbol.keyFor(globalFooSymbol)) === Symbol.for('foo')); // true
```

### Symbol 的方法和 API

除了使用`Symbol()`来创建一个函数，来使用`Symbol`，也能通过一些内置的方法来使用

1. Symbol.hasInstance -> 是实现了`instanceof`行为的`Symbol`

```
class MyClass {
  static [Symbol.hasInstance](lho) {
    return true
  }
}
console.log([] instanceof MyClass)

```

2. Symbol.iterator
   在 ES6 中，提供了一个新的模式`for...of`，该循环是调用`Symbol.iterator`作为右手操作数来取得当前值进行迭代的。

**可以赋予重写`for...of`的能力**

```
var arr = [1,2,3]
for(var value of arr){
  console.log(value)
}

// 没有for...of的实现

var myarr = arr[Symbol.iterator]();

while(iterator  = myarr.next()){
  if(iterator.done)  break;
  var value = iterator.value
  console.log(value)
} // 1,2,3
```

在下面的例子中，赋予了一个`class`拥有遍历的功能，不过具体的过程需要自己来实现

```
class myArr {
  *[Symbol.iterator]() {
    var i = 0
    while (this[i] !== undefined) {
      yield this[i]
      ++i
    }
  }
}

var fnArr = new myArr()

fnArr[0] = 'a'
fnArr[1] = 'b'

for (let fn of fnArr) {
  console.log(fn)
}

```

3. isConcatSpreadable
   可以控制一个数组对象在进行`concat`的时候，不会被展开

```
var a = [1, 2, 3]

var b = [4, 5, 6]

var c = [7, 8, 9]

b[Symbol.isConcatSpreadable] = false
var concatArr = a.concat(b, c)
console.log(concatArr)

[ 1,
  2,
  3,
  [ 4, 5, 6, [Symbol(Symbol.isConcatSpreadable)]: false ],
  7,
  8,
  9 ]

[Done] exited with code=0 in 0.196 seconds

<!-- [ 1,
  2,
  3,
  [ 4, 5, 6, [Symbol(Symbol.isConcatSpreadable)]: false ],
  7,
  8,
  9 ] -->

```

4. Symbol.unscopables -> 解决`with`

5. Symbol.match 允许可以重写 String.prototype.match

match 方法接受`string`或者正则，这样可以重写成符合对象的

6. Symbol.replace -> String.prototype.replace

```
class MyClass{
  [Symbol.replace](){

  }
}
```

7. Symbol.search -> String.prototype.search

```
class MyClass{
  [Symbol.search](){

  }
}
```

8. Symbol.split -> String.prototype.split

```
class MyClass{
  [Symbol.split](){

  }
}
```

9. toPrimitive 对象转基础对象会调用的一个函数,优先级要远远高于`valueOf`和`toString`

10. toStringTag Symbol 内置的一个方法

```
var a = Symbol('a')
a.toString() // 'Symbol'
```

如果一个`Symbol`直接使用 toString，它无法转换成对应的`[Object xxx]`这种形式的
所以`Symbol`使用了一个`toStringTag`方法，可以让我们自定义`Symbol`的`toString`的格式

```
class MySymbol{
  get [Symbol.toStringTag](){
    return 'doin'
  }
}

var mySymbol = new MySymbol()

Object.prototype.toString.call(mySymbol) // [object doin]
```

**注意：使用`Symbol.toStringTag`的时候，返回值不能为字符串之外的内容，否则就无法得到想要的结果。！！！**

```
var a = {
  get [Symbol.toStringTag]() {
    return 1
  },
}
console.log(Object.prototype.toString.call(a)) //[object Object]

var a = {
  get [Symbol.toStringTag]() {
    return '1'
  },
}
console.log(Object.prototype.toString.call(a)) //[object 1]
```
