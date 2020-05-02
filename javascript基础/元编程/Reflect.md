### Reflect 的定义

> 通过自省的方式来实现了反射，是一个内置的对象，它提供拦截`JavaScript`操作的方法。这些方法与`Proxy handlers`的方法相同。`Reflect`不是一个函数对象，因此它是不可以当作构造函数来调用的。

### API

- Reflect.apply 和 Function#apply 一致
- Reflect.construct(target,argumentsList )支持调用构造函数
- Reflect.defineProperty
- Reflect.getOwnPropertyDescriptor
- Reflect.deleteProperty 与 delete
- Reflect.getProperty
- Reflect.setPropertyOf
- Reflect.isExtensible
- Reflect.preventExtensions
- Reflect.get
- Reflect.set
- Reflect.has
- Reflect.ownKeys -> 对应着 getOwnPropertyNames 和 getOwnPropertySymbols 获取的值的集合
