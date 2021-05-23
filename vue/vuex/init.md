## Vuex 的初始化

当我们在代码中通过导入`vuex`的时候

```
export default {
  Store,
  install,
  version: '__VERSION__',
  mapState,
  mapMutations,
  mapGetters,
  mapActions,
  createNamespacedHelpers,
  createLogger
}

export {
  Store,
  install,
  mapState,
  mapMutations,
  mapGetters,
  mapActions,
  createNamespacedHelpers,
  createLogger
}
```

在`vuex`也存在了一个`install`方法，为了获取到`vue`的实例，便于进行操作

```
export function install (_Vue) {
  if (Vue && _Vue === Vue) {
    if (__DEV__) {
      console.error(
        '[vuex] already installed. Vue.use(Vuex) should be called only once.'
      )
    }
    return
  }
  Vue = _Vue
  applyMixin(Vue)
}
export default function (Vue) {
  const version = Number(Vue.version.split('.')[0])

  if (version >= 2) {
    Vue.mixin({ beforeCreate: vuexInit })
  } else {
    // override init and inject vuex init procedure
    // for 1.x backwards compatibility.
    const _init = Vue.prototype._init
    Vue.prototype._init = function (options = {}) {
      options.init = options.init
        ? [vuexInit].concat(options.init)
        : vuexInit
      _init.call(this, options)
    }
  }

  /**
   * Vuex init hook, injected into each instances init hooks list.
   */

  function vuexInit () {
    const options = this.$options
    // store injection
    if (options.store) {
      this.$store = typeof options.store === 'function'
        ? options.store()
        : options.store
    } else if (options.parent && options.parent.$store) {
      this.$store = options.parent.$store
    }
  }
}

```

因为平常大部分开发接触的`vue`版本都是`2.0`，可以看到`vue`调用了`mixin`，混入了`{beforeCreate:vuexInit}`这样在页面加载的时候就会调用`vuex`初始化的钩子，这个函数就是用来在`vue`实例里面增加一个`$store`的属性.

### Store 实例化

```
export default new Vuex.Store({
  modules: {
   login// for example
  },
  state,
  getters,
  mutations,
  actions,
})

```

在实际开发中，我们需要这样实例化一个`store`

`Store`的源代码位置在：`src\store.js`

```
export class Store {
  constructor (options = {}) {
    if (!Vue && typeof window !== 'undefined' && window.Vue) {
      install(window.Vue)
    }
    const {
      plugins = [],
      strict = false
    } = options

    // store internal state
    this._committing = false
    this._actions = Object.create(null)
    this._actionSubscribers = []
    this._mutations = Object.create(null)
    this._wrappedGetters = Object.create(null)
    this._modules = new ModuleCollection(options)
    this._modulesNamespaceMap = Object.create(null)
    this._subscribers = []
    this._watcherVM = new Vue()
    this._makeLocalGettersCache = Object.create(null)

    // bind commit and dispatch to self
    const store = this
    const { dispatch, commit } = this
    this.dispatch = function boundDispatch (type, payload) {
      return dispatch.call(store, type, payload)
    }
    this.commit = function boundCommit (type, payload, options) {
      return commit.call(store, type, payload, options)
    }

    // strict mode
    this.strict = strict

    const state = this._modules.root.state

    // init root module.
    // this also recursively registers all sub-modules
    // and collects all module getters inside this._wrappedGetters
    installModule(this, state, [], this._modules.root)

    // initialize the store vm, which is responsible for the reactivity
    // (also registers _wrappedGetters as computed properties)
    resetStoreVM(this, state)

    // apply plugins
    plugins.forEach(plugin => plugin(this))

    const useDevtools = options.devtools !== undefined ? options.devtools : Vue.config.devtools
    if (useDevtools) {
      devtoolPlugin(this)
    }
  }

}
```

大概可以分为：

1. 初始化模块
2. 安装模块
3. 初始化`store._vm`

### 初始化模块

`modules`出现是为了解决**单个状态树**在应用复杂的时候，内部的对象会非常的多而准备的，`vuex`可以将一部分的状态分割成`modules`，这一个`module`可以单独拥有`state`,`mutation`,`action`,`getter`这个几个属性

```
const moduleA = {
  state: { ... },
  mutations: { ... },
  actions: { ... },
  getters: { ... }
}

const moduleB = {
  state: { ... },
  mutations: { ... },
  actions: { ... },
  getters: { ... },
}

const store = new Vuex.Store({
  modules: {
    a: moduleA,
    b: moduleB
  }
})

store.state.a // -> moduleA 的状态
store.state.b // -> moduleB 的状态
```

这里面的`modules`也就是这棵树下面对应的子树,`vuex`需要对这个树进行构建，将`options`传入`Store`类

```
  this._modules = new ModuleCollection(options)
```

`ModuleCollection`实例化的过程，事实上就是执行了`register`方法，

```
  register (path, rawModule, runtime = true) {
    const newModule = new Module(rawModule, runtime)
    if (path.length === 0) {
      this.root = newModule
    } else {
      const parent = this.get(path.slice(0, -1))
      parent.addChild(path[path.length - 1], newModule)
    }

    // register nested modules
    if (rawModule.modules) {
      forEachValue(rawModule.modules, (rawChildModule, key) => {
        this.register(path.concat(key), rawChildModule, runtime)
      })
    }
  }
```

接手了 3 个参数`path`,`rawModule`,`runtime`

1. `path`标识的是路径，因为我们实例化一个`Store`的根本的目标是要去构建一个模块树，`path`代表是构建树的时候需要维护的路径
2. 定义原始模块的原始配置
3. 运行时模块的标识

#### 创建一个模块

```
 const newModule = new Module(rawModule, runtime)

 class Module{
   constructor (rawModule, runtime) {
    this.runtime = runtime
    // Store some children item
    this._children = Object.create(null)
    // Store the origin module object which passed by programmer
    this._rawModule = rawModule
    const rawState = rawModule.state

    // Store the origin module's state
    this.state = (typeof rawState === 'function' ? rawState() : rawState) || {}
  }
 }
```

首先定义了,`_rawModule`表示模块的配置，`_children`表示它的所有子模块，`state`表示了初始的所有状态
然后回到`ModuleCollect`

```
if (path.length === 0) {
      this.root = newModule
    } else {
      const parent = this.get(path.slice(0, -1))
      parent.addChild(path[path.length - 1], newModule)
    }
```

可以发现对`path`进行了判断，如果`path`为`0`的话，就证明当前这个模块是根模块`this.root`，后面那个`else`暂时不看时怎么执行的

```
<!--moduleA: {
  state: { ... },
  mutations: { ... },
  actions: { ... },
  getters: { ... },
} -->
if (rawModule.modules) {
      forEachValue(rawModule.modules, (rawChildModule, key) => {
        this.register(path.concat(key), rawChildModule, runtime)
      })
  }
```

接着判断了**原始模块中是否含有`modules`**,然后递归执行了`this.register`,传入了`path.concat(key)`,`rawChildModule`,这个时候，就能发现`path`开始有值了，然后重复构建了`module`，判断`path`,这下就会走

```
const parent = this.get(path.slice(0, -1))
parent.addChild(path[path.length - 1], newModule)
```

`slice`后面的参数，为负数时，需要从尾部开始算起的元素

```
get (path) {
  return path.reduce((module, key) => {
    return module.getChild(key)
  }, this.root)
}
getChild (key) {
    return this._children[key]
}
```

`this.get`通过父`path`找到子的`module`,通过`getChild`,`this._children`的`key`去获取到子模块的`module`,这样就能通过根模块的`key`去获取到子模块对应的`module`,同时又能通过`addChild`来添加一个子模块，这样一直执行了`register`，就可以得到一个模块树

#### 安装模块

```
const state = this._modules.root.state
installModule(this, state, [], this._modules.root)
```

初始化模块之后，执行`install`模块

```
function installModule (store, rootState, path, module, hot){

  const isRoot = !path.length
  const namespace = store._modules.getNamespace(path)
}
```

首先，通过`path`的长度判断是否是根模块，然后获取了模块的`namespaced`
可以看一下带一下例子，这个是带命名空间的

```
const store = new Vuex.Store({
  modules: {
    account: {
      namespaced: true,

      // 模块内容（module assets）
      state: () => ({ ... }), // 模块内的状态已经是嵌套的了，使用 `namespaced` 属性不会对其产生影响
      getters: {
        isAdmin () { ... } // -> getters['account/isAdmin']
      },
      actions: {
        login () { ... } // -> dispatch('account/login')
      },
      mutations: {
        login () { ... } // -> commit('account/login')
      },
    }
  }
})
```

`getNamespace`的代码位置`vuex\src\module\module-collection.js`

```
 getNamespace (path) {
    let module = this.root
    return path.reduce((namespace, key) => {
      module = module.getChild(key)
      return namespace + (module.namespaced ? key + '/' : '')
    }, '')
  }
```

生成了`getNamespace`，然后存入到`store._modulesNamespaceMap`中，这样能存在方便再次在这里寻找对应的模块.

```
if (module.namespaced) {
  store._modulesNamespaceMap[namespace] = module
}
```

接下来创建一个本地的上下文环境

```
 const local = module.context = makeLocalContext(store, namespace, path)
 function makeLocalContext (store, namespace, path) {
  const noNamespace = namespace === ''

  const local = {
    dispatch: noNamespace ? store.dispatch : (_type, _payload, _options) => {
      const args = unifyObjectStyle(_type, _payload, _options)
      const { payload, options } = args
      let { type } = args

      if (!options || !options.root) {
        type = namespace + type
        if (__DEV__ && !store._actions[type]) {
          console.error(`[vuex] unknown local action type: ${args.type}, global type: ${type}`)
          return
        }
      }

      return store.dispatch(type, payload)
    },

    commit: noNamespace ? store.commit : (_type, _payload, _options) => {
      const args = unifyObjectStyle(_type, _payload, _options)
      const { payload, options } = args
      let { type } = args

      if (!options || !options.root) {
        type = namespace + type
      }

      store.commit(type, payload, options)
    }
  }

  // getters and state object must be gotten lazily
  // because they will be changed by vm update
  Object.defineProperties(local, {
    getters: {
      get: noNamespace
        ? () => store.getters
        : () => makeLocalGetters(store, namespace)
    },
    state: {
      get: () => getNestedState(store.state, path)
    }
  })

  return local
}
```

在这个方法里面，可以看到`dispatch`以及`commit`，这里判断了这个模块是否是一个命名空间，如果不是的话，那么就会直接调用了`store.commit`，反正就，将`type`和`namespaced`进行拼接，然后去调用对应的`store`中的方法，这样也就对应了我们刚才创建的`_modulesNamespaceMap`里面的值

然后对于`getters`和`state`来说，如果是命名空间的话，就需要调用`makeLocalGetters`以及`getNestedState`

```
function makeLocalGetters (store, namespace) {
    const gettersProxy = {}
    const splitPos = namespace.length
    Object.keys(store.getters).forEach(type => {
      if (type.slice(0, splitPos) !== namespace) return
      const localType = type.slice(splitPos)
      Object.defineProperty(gettersProxy, localType, {
        get: () => store.getters[type],
        enumerable: true
      })
    })
    store._makeLocalGettersCache[namespace] = gettersProxy

  return store._makeLocalGettersCache[namespace]
}
```

匹配得到`localType`，通过`definedProperty`定义了`gettersProxy`,然后根据传入的`type`从`store`里面获取对应的`getters`:

```
store.getters[type]
```

同时将对应的`gettersProxy`和`namespace`存入到对应的`_makeLocalGettersCache`，然后将`gettersProxy`从`_makeLocalGettersCache`取出返回。

**看看 state**

```
function getNestedState (state, path) {
  return path.reduce((state, key) => state[key], state)
}
```

通过`reduce`找到对应`key`的`state`.接下来就会执行了

```
  module.forEachMutation((mutation, key) => {
    const namespacedType = namespace + key
    registerMutation(store, namespacedType, mutation, local)
  })

  module.forEachAction((action, key) => {
    const type = action.root ? key : namespace + key
    const handler = action.handler || action
    registerAction(store, type, handler, local)
  })

  module.forEachGetter((getter, key) => {
    const namespacedType = namespace + key
    registerGetter(store, namespacedType, getter, local)
  })

  module.forEachChild((child, key) => {
    installModule(store, rootState, path.concat(key), child, hot)
  })
```

1. 注册`mutation`,首先对于`module`进行遍历，然后将`namespace`和`key`进行合并，然后调用`registerMutation`

```
function registerMutation (store, type, handler, local) {
  const entry = store._mutations[type] || (store._mutations[type] = [])
  entry.push(function wrappedMutationHandler (payload) {
    handler.call(store, local.state, payload)
  })
}

```

这个方法实际上就是给`store`上的`_mutations`,添加了一个叫`wrappedMutationHandler`的回调函数.

2. 注册`action`.

3. 注册`getter`.

4. 循环遍历`store`下面的子模块，递归执行了`installModule`

子模块`installModule`和根模块的区别

```
  if (!isRoot && !hot) {
    const parentState = getNestedState(rootState, path.slice(0, -1))
    const moduleName = path[path.length - 1]
    store._withCommit(() => {

      Vue.set(parentState, moduleName, module.state)
    })
  }
```

通过`rootState`来找到对应的`path`的`state`

### 初始化 store.\_vm

```
 // initialize the store vm, which is responsible for the reactivity
// (also registers _wrappedGetters as computed properties)
  resetStoreVM(this, state)
```

可以看到注释：初始化`store vm`,来负责反应`state`的变化，同时将`_wrappedGetters`注册为`computed`属性

```
function resetStoreVM (store, state, hot) {
  const oldVm = store._vm

  // bind store public getters
  store.getters = {}
  store._makeLocalGettersCache = Object.create(null)
  const wrappedGetters = store._wrappedGetters
  const computed = {}
  forEachValue(wrappedGetters, (fn, key) => {
    computed[key] = partial(fn, store)
    Object.defineProperty(store.getters, key, {
      get: () => store._vm[key],
      enumerable: true // for local getters
    })
  })
  const silent = Vue.config.silent
  Vue.config.silent = true
  store._vm = new Vue({
    data: {
      $$state: state
    },
    computed
  })
  Vue.config.silent = silent

  // enable strict mode for new vm
  if (store.strict) {
    enableStrictMode(store)
  }

  if (oldVm) {
    if (hot) {
      store._withCommit(() => {
        oldVm._data.$$state = null
      })
    }
    Vue.nextTick(() => oldVm.$destroy())
  }
}
```

`resetStoreVM`的作用就是建立`getters`和`state`的联系，因为从设计上来说，`getters`的值就是应该直接依赖了`state`的值，而且能够将值缓存起来，且只有当它依赖值发生变化，才会重新计算。

```
 const wrappedGetters = store._wrappedGetters
  const computed = {}
  forEachValue(wrappedGetters, (fn, key) => {
    computed[key] = partial(fn, store)
    Object.defineProperty(store.getters, key, {
      get: () => store._vm[key],
      enumerable: true // for local getters
    })
  })
export function partial (fn, arg) {
  return function () {
    return fn(arg)
  }
}
store._wrappedGetters[type] = function wrappedGetter (store) {
  return rawGetter(
    local.state, // local state
    local.getters, // local getters
    store.state, // root state
    store.getters // root getters
  )
}
```

`partial`再这里就是执行了`fn(store)`,相当于执行了`wrappedGetter`，返回了`rawGetter`，这个`rawGetter`就是定义的`getter`函数

我们可以看到这里，引入了`vue`的实例:

```
store._vm = new Vue({
    data: {
      $$state: state
    },
    computed
  })
```

这里定义了一个`data`定义了`$$state`属性，而我们访问`store.state`，实际上会访问`Store`类上定义的`state`的`get`方法

```
get state () {
  return this._vm._data.$$state
}
 forEachValue(wrappedGetters, (fn, key) => {
    computed[key] = partial(fn, store)
    Object.defineProperty(store.getters, key, {
      get: () => store._vm[key],
      enumerable: true // for local getters
    })
  })
```

通过`object.defineProperty`,将`store.getters`
