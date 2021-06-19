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
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}
```

首先判断`target`是否是数组，并且判断是不是一个合格的索引，判断当前数组大小和传入的 index 大小，然后将值放入到数组里面，将`val`返回，然后判断传入的值是否在 target 数组里面，在的话直接赋值.然后获取`target.__ob__`,`__ob__`这个属性是在`Observer`的构造函数执行的时候初始化的，表示`Observer`的一个实例，如果它不存在，则说明他不是一个响应式对象，则直接赋值然后返回。不然就是使用`defineReactive`,去将这个变量再声明成响应式对象，然后直接使用`ob.dep.notify()`去进行手动依赖更新通知.

**在 defineReactive 判断了`childOb`，并调用了`childOb.dep.depend()`收集了依赖**，这就是为什么调用`ob.dep.notify()`能通知到`watcher`，从而使新添加得属性也能检测到变化
