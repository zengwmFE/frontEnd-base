### Prototype

Javascript 中的对象都有一个特殊的`[[Prototype]]`内置属性，其实就是对其他对象的引用

#### [[Prototype]]有什么用呢？

> 当试图引用对象的属性的时候，就会触发`[[Get]]`操作，比如(xxx.a),对于默认的`[[Get]]`操作来说，第一步会检查对象本身是否有这个属性，如果有的话就使用它，如果这个属性不在对象身上的，就会继续访问对象的`[[Prototype]]`链

```
var anotherObject = {
  a:2
}
var myObject = Object.create(anotherObject)
myObject.a //2
```

- `myObject`对象的`[[Prototype]]`关联到了`anotherObject`。显然`myObject.a`是并不存在，但是尽管如此，属性访问仍然成功能找到`a`的值
- 如果`anotherObject`也找不到`a`的话，就会继续沿着原型链去查找`a`，直到查询到了这个值，如果查询了整条原型链，都没有找到值的话，`[[Get]]`就会返回`undefined`

其实`for...in`遍历对象时和查找`[[Prototype]]`链相似

####  [[Prototype]]的尽头

> 所有的普通的`[[Prototype]]`链最终都会指向内置的`Object.prototype`

#### 属性设置和屏蔽

下面这段代码，在给对象设置新属性或者修改已有的属性值

```
myObject.foo = "bar"
```

如果`foo`不在`myObject`上层

- 如果`myObject`中包含名为`foo`的普通数据访问属性，这条赋值语句只会修改已有的属性值
- 如果`foo`不直接存在于`myObject`中，`[[Prototype]]`就会被遍历，类似`[[Get]]`操作，如果原型链上找不到`foo`，`foo`就会被直接添加到`myObject`上

---

如果`foo`在`myObject`的上层

1. 如果在`[[Prototype]]`链上存在`foo`的普通数据访问属性并且没有被标记为只读`(writable:false)`,那么它会直接在`myObject`中添加一个名为`foo`的新属性，他是一个屏蔽属性
2. 如果在`[[Prototype]]`链上存在`foo`，但是它被标记为只读(`writable: false`)，那么就无法修改已有属性或者在`myObject`上创建`屏蔽属性`。如果在严格模式下，代码就会抛出错误。
3. 如果在`[[Prototype]]`链上层存在`foo`，但是它是一个`setter`，那就一定会调用这个`setter`，`foo`不会被添加到`myObject`，也不会重新定义`foo`这个`setter`