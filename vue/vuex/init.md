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
