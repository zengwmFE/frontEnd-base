var a = {
  _b: 1,
  c: 2,
}

// _b为私有属性，不能被外部所获取到，get ，无法获取property
var aStatic = new Proxy(a, {
  get: function (value) {
    return 1
  },
  has: function (val) {
    console.log
    return false
  },
  ownKeys: function (val) {
    console.log(val, '123')
    return Reflect.ownKeys(a)
  },
})

console.log(aStatic._b)

console.log('_b' in aStatic)
