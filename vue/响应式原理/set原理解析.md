### set

在对一个响应式对象，直接添加属性的时候，无触发 setter,在 vue 中，增加了`this.$set`方法
初始化：

```
Vue.set = set
```

set 源码在:`core\observer\index.js`

```
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }

  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__ // 判断当前对象target是否是一个响应式数据
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}
```

首先判断`target`是否是数组，并且判断是不是一个合格的索引，判断当前数组大小和传入的 index 大小，然后将值放入到数组里面，将`val`返回，然后判断传入的值是否在 target 数组里面，在的话直接赋值.然后获取`target.__ob__`,`__ob__`这个属性是在`Observer`的构造函数执行的时候初始化的，表示`Observer`的一个实例，如果它不存在，则说明他不是一个响应式对象，则直接赋值然后返回。不然就是使用`defineReactive`,去将这个变量再声明成响应式对象，然后直接使用`ob.dep.notify`去进行依赖更新通知.

**在 defineReactive 判断了`childOb`，并调用了`childOb.dep.depend()`收集了依赖**，这就是为什么调用`ob.dep.notify()`能通知到`watcher`，从而使新添加得属性也能检测到变化

### 数组

数组有 2 种情况，Vue 是无法检测到以下变动得数组

1. 当你利用索引直接设置一个项时，例如：vm.items[indexOfItem] = newValue
2. 当直接修改数组的长度时，vm.items.length = newLength

对象和数组在进行 set 得情况是不一样得，在前面也能看出来

```
 target.splice(key, 1, val)
```

调用了`splice`来是这个数组变成一个响应式得.

分析一下`splice`是如何将添加的元素也变成响应式的

```
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0
    def(value, '__ob__', this) // __ob__属性的定义，定义成响应式对象
    if (Array.isArray(value)) {
      if (hasProto) {
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
      this.observeArray(value)
    } else {
      this.walk(value)
    }
  }
}
```

在通过`observer`观察对象的时候，会实例化`Observer`,首先在这里看到定义了`__ob__`的函数。同时还判断了`value`是否是`Array`,然后根据`hasProto`，来区别调用`protoAugment`和`copyAugment`,这个`hasProto`实际上就是判断对象是否存在`__proto__`。

```
function protoAugment (target, src: Object) {
  target.__proto__ = src
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}
```

1. protoAugment 直接将 src 给了`target`的原型对象
2. copyAugment 循环了 keys,然后使用`def`定义 target 的属性值，def 是通过`defineProperty`
   因为现代浏览器大部分都是会走向`protoAugment`,那么事实上是指向了`arrayMethods`

```
//\core\observer\array.js
const arrayProto = Array.prototype
export const arrayMethods = Object.create(arrayProto)

const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  const original = arrayProto[method]
  def(arrayMethods, method, function mutator (...args) {
    const result = original.apply(this, args)
    const ob = this.__ob__
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    if (inserted) ob.observeArray(inserted)
    // notify change
    ob.dep.notify()
    return result
  })
})

```

在这里`arrayMethods`继承了`Array`，然后对数组中所有能改变数组自身的方法进行了重写，保持了他们能按照原有方法执行的前提，给`push,unshift,splice`这三个能增加数组长度的方法，获取了要插入的值，并把这个插入的值变成响应式对象，他执行`ob.dep.notify()`去通知依赖，这就是为什么使用`splice`方法能检测到数组的改变
