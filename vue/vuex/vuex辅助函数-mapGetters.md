## vuex 辅助函数-mapGetters

`vuex`提供了四个常用的辅助函数

1. mapState
2. mapGetters
3. mapActions
4. mapMutations

### mapGetters

- `mapGetters(namespace?: string, map: Array<string> | Object<string>): Object`

> 为组件创建计算属性以返回 getter 的返回值。
> 第一个参数是可选的，可以是一个命名空间字符串

官方实例：

```
// map为Array
computed: {
  // 使用对象展开运算符将 getter 混入 computed 对象中
    ...mapGetters([
      'doneTodosCount',
      'anotherGetter',
      // ...
    ])
}

// map为Object
...mapGetters({
  // 把 `this.doneCount` 映射为 `this.$store.getters.doneTodosCount`
  doneCount: 'doneTodosCount'
})

```

看一下源码实现

```
export const mapGetters = normalizeNamespace((namespace, getters) => {
  const res = {}
  normalizeMap(getters).forEach(({ key, val }) => {
    // The namespace has been mutated by normalizeNamespace
    val = namespace + val
    res[key] = function mappedGetter () {
      if (namespace && !getModuleByNamespace(this.$store, 'mapGetters', namespace)) {
        return
      }
      return this.$store.getters[val]
    }
    // mark vuex getter for devtools
    res[key].vuex = true
  })
  return res
})
```

和`mapState`不同的地方是`mapGetters`采用的是在`this.$store.getters`取得值
