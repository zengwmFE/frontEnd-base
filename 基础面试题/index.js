var a = {
  _b: 1,
  c: 2,
}

// _b为私有属性，不能被外部所获取到，get ，无法获取property
var aStatic = new Proxy(a, {
  get: function (value, prop) {
    console.log(value, prop)
    if (prop.startsWith('_') || !(prop in value)) {
      return undefined
    } else {
      return value[prop]
    }
  },
  has: function (val, prop) {
    return !prop.startsWith('_') && prop in val
  },
  ownKeys: function (val) {
    console.log(val, '123')
    return Reflect.ownKeys(a)
  },
})

console.log(aStatic.c)

console.log('_b' in aStatic)
