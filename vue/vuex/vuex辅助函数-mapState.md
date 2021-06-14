## vuex 辅助函数

`vuex`提供了四个常用的辅助函数

1. mapState
2. mapGetters
3. mapActions
4. mapMutations

### mapState

`mapState(namespace?: string, map: Array<string> | Object<string | function>): Object`

1. 为组件创建计算属性以返回 Vuex store 中的状态
2. 第一个参数是可选的，可以是一个命名空间字符串,对象形式的第二个参数的成员可以是一个函数。

```
computed: mapState({
    // 箭头函数可使代码更简练
    count: state => state.count,

    // 传字符串参数 'count' 等同于 `state => state.count`
    countAlias: 'count',

    // 为了能够使用 `this` 获取局部状态，必须使用常规函数
    countPlusLocalState (state) {
      return state.count + this.localCount
    }
})
```

看下源代码(`vuex\src\helpers.js`)：

```
export const mapState = normalizeNamespace((namespace, states) => {
  const res = {}
  normalizeMap(states).forEach(({ key, val }) => {
    res[key] = function mappedState () {
      let state = this.$store.state
      let getters = this.$store.getters
      if (namespace) {
        const module = getModuleByNamespace(this.$store, 'mapState', namespace)
        if (!module) {
          return
        }
        state = module.context.state
        getters = module.context.getters
      }
      return typeof val === 'function'
        ? val.call(this, state, getters)
        : state[val]
    }
    // mark vuex getter for devtools
    res[key].vuex = true
  })
  return res
})
function normalizeNamespace (fn) {
  return (namespace, map) => {
    if (typeof namespace !== 'string') {
      map = namespace
      namespace = ''
    } else if (namespace.charAt(namespace.length - 1) !== '/') {
      namespace += '/'
    }
    return fn(namespace, map)
  }
}
function normalizeMap (map) {
  if (!isValidMap(map)) {
    return []
  }
  return Array.isArray(map)
    ? map.map(key => ({ key, val: key }))
    : Object.keys(map).map(key => ({ key, val: map[key] }))
}
```

`normalizeNamespace`,判断了`namespace`是否为`string`,这样的话就判断了他是不是真正的`namespace`，如果不是`string`,那么就判断他是一个`map`(也就是要获取`state`值得函数或者对象)，反之判断根据他是不是多重子模块,如：``

`mapState`是通过`normalizeNamespace`返回的函数，他接收了参数：`namespace`,`map`,`namespace`是命名空间，`map`是具体的对象，其实按照官网说明`namespace`是可以不传入的.而调用了`normalizeNamespace`之后，就是将`map`作为`state`传入，然后调用`normalizeMap`，将`map`变成以`{key,val:key}`这样的格式的数组。构建完成之后。执行循环，然后将`key`,以及`val`为`mappedState`作为`value`存入到`res`中

#### mappedState

```
res[key] = function mappedState () {
      let state = this.$store.state
      let getters = this.$store.getters
      if (namespace) {
        const module = getModuleByNamespace(this.$store, 'mapState', namespace)
        if (!module) {
          return
        }
        state = module.context.state
        getters = module.context.getters
      }
      return typeof val === 'function'
        ? val.call(this, state, getters)
        : state[val]
    }
```

首先获取了`$store.state`和`$store.getters`

**如果命名空间的时候**

然后根据命名空间名，获取了模块，获取模块对应的`state`和`getters`。然后通过判断我们书写的`mapState`的第二个参数，是函数的话，就执行这个函数，将`state`和`getters`传入，反之就返回`state[val]`

实例：

```
// 基于属性的访问
mapState({
    searchInput: state => state.yourModuleName.searchInput,
})

// 使用namespace访问
...mapState('yourModuleName',[
  'searchInput',
])
```
