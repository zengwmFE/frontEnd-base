### API

在官方文档中我们看到，又分为 4 种

1. 构造器选项

- state
- mutations
- actions
- getters
- modules
- plugins
- strict
- devtool

2. 实例属性

- state
- getters

3. 实例方法

- commit
- dispatch
- replaceState
- watch
- subscribe
- 等等

4. 辅助函数

- mapState
- mapGetters
- mapActions
- mapMutations

### 数据存储

#### mutations

在`strict`模式下，`vuex`只允许我们通过提交`mutation`的形式去修改`state`

```
mutations: {
 // 提交荷载
 increment (state, payload) {
  state.count += payload.amount
 }
}
```

`mutations`的注册在`installModule`

```
module.forEachMutation((mutation, key) => {
    const namespacedType = namespace + key
    registerMutation(store, namespacedType, mutation, local)
})

function registerMutation (store, type, handler, local) {
  const entry = store._mutations[type] || (store._mutations[type] = [])
  entry.push(function wrappedMutationHandler (payload) {
    handler.call(store, local.state, payload)
  })
}
```

`registerMutation`这个函数循环调用，然后将获取对应的`namespace`的`mutations`，最后将一个函数`wrappedMutationHandler`放入到`mutations`，传入 2 个参数`local.state`和`payload`，而这就是为什么

```
mutations: {
 // 提交荷载
 increment (state, payload) {
  state.count += payload.amount
 }
}
```

这段实例代码，可以获取到`state`，而且还有一个`payload`的载荷对象，是通过柯里化来实现的。

#### mutations 的提交

`vuex`提供了一个`commit`方法，让可以提交`mutation`

```
store.commit('increment', 10)
```

来看下`commit`怎么实现提交`mutation`

```
 commit (_type, _payload, _options) {
    // check object-style commit
    const {
      type,
      payload,
      options
    } = unifyObjectStyle(_type, _payload, _options)

    const mutation = { type, payload }
    const entry = this._mutations[type]
    this._withCommit(() => {
      entry.forEach(function commitIterator (handler) {
        handler(payload)
      })
    })

    this._subscribers
      .slice() // shallow copy to prevent iterator invalidation if subscriber synchronously calls unsubscribe
      .forEach(sub => sub(mutation, this.state))
  }
```

首先对我们输入的`_type`、`_payload`,`_options`进行标准化，然后合成一个`mutaion`对象，然后从`this._mutation`去除对应的`entry`然后在`this._withCommit`调用，将`payload`传入。
我们看到这个地方执行的方式是一个同步的操作，即直接执行了`handler(payload)`,可以见得，在`mutation`里面是不支持异步操作。

#### action 的转发

在实际的开发中，大部分情况是会在`action`里面处理异步：
`vuex`允许我们通过`dispatch`来分发`action`，`action`的注册

```
  module.forEachAction((action, key) => {
    const type = action.root ? key : namespace + key
    const handler = action.handler || action
    registerAction(store, type, handler, local)
  })
  function registerAction (store, type, handler, local) {
  const entry = store._actions[type] || (store._actions[type] = [])
  entry.push(function wrappedActionHandler (payload) {
    let res = handler.call(store, {
      dispatch: local.dispatch,
      commit: local.commit,
      getters: local.getters,
      state: local.state,
      rootGetters: store.getters,
      rootState: store.state
    }, payload)
    if (!isPromise(res)) {
      res = Promise.resolve(res)
    }
    if (store._devtoolHook) {
      return res.catch(err => {
        store._devtoolHook.emit('vuex:error', err)
        throw err
      })
    } else {
      return res
    }
  })
}
```

跟`mutation`基本是一直的，不同的是，在回调函数`wrappedActionHandler`,注册的回调函数进行了判断是否是`promise`，如果不是`promise`，那么他会使用一个`Promise.resolve`来返回`res`,注册完了，看一下触发

```
dispatch (_type, _payload) {
    // check object-style dispatch
    const {
      type,
      payload
    } = unifyObjectStyle(_type, _payload)

    const action = { type, payload }
    const entry = this._actions[type]
      this._actionSubscribers
        .slice() // shallow copy to prevent iterator invalidation if subscriber synchronously calls unsubscribe
        .filter(sub => sub.before)
        .forEach(sub => sub.before(action, this.state))
    const result = entry.length > 1
      ? Promise.all(entry.map(handler => handler(payload)))
      : entry[0](payload)

    return new Promise((resolve, reject) => {
      result.then(res => {
          this._actionSubscribers
            .filter(sub => sub.after)
            .forEach(sub => sub.after(action, this.state))
        resolve(res)
      }
    })
  }
```

可以看到这个地方判断了，`entry`的长度，如果长度大于就会使用`Promise.all`来处理所有的函数，刚才我们说到了，entry 里面的回调函数事实上是返回了一个`Promise`，也就能当所有的`action`共同执行完之后，然后执行其他的逻辑，也就保证了异步操作，能在`action`书写的原因
