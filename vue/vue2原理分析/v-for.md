#### vue使用v-for遍历对象时，是按什么顺序遍历的？如何保证顺序？
先贴上`v-for`的源码
```
import { isObject, isDef, hasSymbol } from 'core/util/index'
 
/**
 * Runtime helper for rendering v-for lists.
 */
export function renderList (
  val: any,
  render: (
    val: any,
    keyOrIndex: string | number,
    index?: number
  ) => VNode
): ?Array<VNode> {
  let ret: ?Array<VNode>, i, l, keys, key
  if (Array.isArray(val) || typeof val === 'string') {
    ret = new Array(val.length)
    for (i = 0, l = val.length; i < l; i++) {
      ret[i] = render(val[i], i)
    }
  } else if (typeof val === 'number') {
    ret = new Array(val)
    for (i = 0; i < val; i++) {
      ret[i] = render(i + 1, i)
    }
  } else if (isObject(val)) {
    if (hasSymbol && val[Symbol.iterator]) {
      ret = []
      const iterator: Iterator<any> = val[Symbol.iterator]()
      let result = iterator.next()
      while (!result.done) {
        ret.push(render(result.value, ret.length))
        result = iterator.next()
      }
    } else {
      keys = Object.keys(val)
      ret = new Array(keys.length)
      for (i = 0, l = keys.length; i < l; i++) {
        key = keys[i]
        ret[i] = render(val[key], key, i)
      }
    }
  }
  if (!isDef(ret)) {
    ret = []
  }
  (ret: any)._isVList = true
  return ret
}
```
如果遍历的内容为`object`的时候
1. 首先判断当前是否支持`Symbol`,且当前值内部有`Symbol.iterator`这个属性的时候，就会执行`iterator.next()`来进行遍历
2. 如果不支持`Symbol`或者不支持`Symbol.iterator`，就会通过`Object.keys`获取对象的`key`,然后循环这个长度

在这里我们可以看到它定义了`let ret: ?Array<VNode>`的一个数组，当循环的时候会将`render`返回的值按照顺序存入`ret`