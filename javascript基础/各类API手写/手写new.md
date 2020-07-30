//new 得原理，手动实现 new

1. 创建一个空对象，构造函数中的 this 指向这个空对象
2. 这个新对象被执行 [[原型]] 连接
3. 执行构造函数方法，属性和方法被添加到 this 引用的对象中
4. 如果构造函数中没有返回其它对象，那么返回 this，即创建的这个的新对象，否则，返回构造函数中返回的对象。

```
function myNew() {
  var newObject = new Object
  var Constructor = [].shift.call(arguments)
  Object.setPrototypeOf(newObject,Constructor.prototype)
  // newObject.__proto__ = Constructor.prototype
  var ret = Constructor.apply(newObject,arguments)
  return typeof ret==='object' ? ret : newObject
}

function testClass(name,age) {
  this.name = name;
  this.age = age
  // return 1
  return {a:1}
}

var a = myNew(testClass,'jack',15)
// console.log(a.age) // 15
console.log(a) // {a:1}
```
