## props

在初始化`props`之前，要对`props`进行一次`normalize`，它发生在`mergeOptions`得时候在`core\util\options.js`，然后再`normalizeProps`进行一次

```
function normalizeProps (options: Object, vm: ?Component) {
  const props = options.props
  if (!props) return
  const res = {}
  let i, val, name
  if (Array.isArray(props)) {
    i = props.length
    while (i--) {
      val = props[i]
      if (typeof val === 'string') {
        name = camelize(val)
        res[name] = { type: null }
      } else if (process.env.NODE_ENV !== 'production') {
        warn('props must be strings when using array syntax.')
      }
    }
  } else if (isPlainObject(props)) {
    for (const key in props) {
      val = props[key]
      name = camelize(key)
      res[name] = isPlainObject(val)
        ? val
        : { type: val }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `Invalid value for option "props": expected an Array or an Object, ` +
      `but got ${toRawType(props)}.`,
      vm
    )
  }
  options.props = res
}
```

`mergeOptions`的功能主要是处理定义组件的对象`options`，然后挂载到全局属性`this.$options`，这个函数主要是对人工写的`props`的格式进行标准化成对象。因为**`props`除了能写成对象，还能被定义成数组**

1. 当 props 是一个数组的时候，内部属性必须是字符串，否则就报错。而且对里面的属性转成驼峰式，同时设置`type`为空，
