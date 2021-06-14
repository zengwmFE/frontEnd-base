## vuex 辅助函数-mapMutations

`vuex`提供了四个常用的辅助函数

1. mapState
2. mapGetters
3. mapActions
4. mapMutations

### mapActions

示例：

```
// Array
 ...mapActions([
      'increment', // 将 `this.increment()` 映射为 `this.$store.dispatch('increment')`

      // `mapActions` 也支持载荷：
      'incrementBy' // 将 `this.incrementBy(amount)` 映射为 `this.$store.dispatch('incrementBy', amount)`
    ]),
    // Object
    ...mapActions({
      add: 'increment' // 将 `this.add()` 映射为 `this.$store.dispatch('increment')`
    })
```

看下源码实现：

```
export const mapActions = normalizeNamespace((namespace, actions) => {
  const res = {}
  normalizeMap(actions).forEach(({ key, val }) => {
    res[key] = function mappedAction (...args) {
      // get dispatch function from store
      let dispatch = this.$store.dispatch
      if (namespace) {
        const module = getModuleByNamespace(this.$store, 'mapActions', namespace)
        if (!module) {
          return
        }
        dispatch = module.context.dispatch
      }
      return typeof val === 'function'
        ? val.apply(this, [dispatch].concat(args))
        : dispatch.apply(this.$store, [val].concat(args))
    }
  })
  return res
})

```

1. 我们知道`actions`是用来派发`mutations`的，所以肯定是需要一个`dispatch`，可以来自于**根**也可以是**子模块**
2. 在这里判断跟`mutation`是一样的，也是分为`fun`和其他类型，作为处理
