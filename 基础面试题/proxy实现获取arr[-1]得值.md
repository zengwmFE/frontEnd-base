// 在某些编程语言中，可以通过负数下标
// js 不行，通过 proxy 来实现获取数组下标

```
var a = [1, 2, 3]
let p = new Proxy(a, {
  get: function (oTarget, sKey) {
    if (sKey < 0) {
      return Reflect.get(oTarget, Number(oTarget.length) + Number(sKey))
    } else {
      return Reflect.get(oTarget, sKey)
    }
  },
})
console.log(p[-1])
console.log(p[-2])
console.log(p[-3])
```

思路 proxy 重写数组得表现形式，然后通过 Reflect 反射出对应得值
