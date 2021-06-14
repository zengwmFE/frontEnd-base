## vuex 辅助函数-mapMutations

`vuex`提供了四个常用的辅助函数

1. mapState
2. mapGetters
3. mapActions
4. mapMutations

### mapMutations

示例：

```
 methods: {
    ...mapMutations([
      'increment', // 将 `this.increment()` 映射为 `this.$store.commit('increment')`

      // `mapMutations` 也支持载荷：
      'incrementBy' // 将 `this.incrementBy(amount)` 映射为 `this.$store.commit('incrementBy', amount)`
    ]),
    ...mapMutations({
        account: (commit, account) => {
                commit("account", account)
        },
      }),
    ...mapMutations({
      add: 'increment' // 将 `this.add()` 映射为 `this.$store.commit('increment')`
    })
  }
```

`mapMutations(namespace?: string, map: Array<string> | Object<string | function>): Object`

- 创建组件方法提交 mutation

1. 第一个参数是可选的，可以是一个命名空间字符串
2. 对象形式的第二个参数的成员可以是一个函数。function(commit: function, ...args: any[])

```
export const mapMutations = normalizeNamespace((namespace, mutations) => {
  const res = {}
  normalizeMap(mutations).forEach(({ key, val }) => {
    res[key] = function mappedMutation (...args) {
      // Get the commit method from store
      let commit = this.$store.commit
      if (namespace) {
        const module = getModuleByNamespace(this.$store, 'mapMutations', namespace)
        if (!module) {
          return
        }
        commit = module.context.commit
      }
      return typeof val === 'function'
        ? val.apply(this, [commit].concat(args))
        : commit.apply(this.$store, [val].concat(args))
    }
  })
  return res
})
```

1. 首先将所有得`mutaions`获取到`{key,val:key}`类似于这样得格式得数组，进行循环
2. 然后从`this.$store`获取到`commit`这个方法，如果是一个命名空间的`module`,那么就会通过`getModuleByNamespace`获取对应的`module`
3. 最后执行对应`store`内的`commit`

- 如果`val`是`function`(示例第二种情况)，传入的是 2 个值，一个`commit`,一个为`参数`,所以这就是为什么能获取到`commit`同时将自己的载荷`payload`传入的原因
- 如果不是`function`那么走的就是`commit.apply(this.$store, [val].concat(args))`,然后提交改变了`state`
