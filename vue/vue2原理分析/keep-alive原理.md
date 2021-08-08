### keep-alive 的官方文档
keep-alive保存的是`vnode`，利用LRU缓存的方法
- Props
  - include 字符串或正则表达式，只有名称匹配的组件会被匹配
  - exclude 字符串或正则表达式。任何名称匹配的组件都不会被缓存。
  - max 数字。最多可以缓存多少组件实例

> keep-alive 包裹动态组件时，会缓存**不活动的组件实例**

当在组件内部发生切换时，`activated`和`deactivated`两个生命周期会被触发

### keep-alive 的实现

```
const patternTypes: Array<Function> = [String, RegExp, Array] // 接收：字符串，正则，数组

export default {
  name: 'keep-alive',
  abstract: true, // 抽象组件，是一个抽象组件：它自身不会渲染一个 DOM 元素，也不会出现在父组件链中。

  props: {
    include: patternTypes, // 匹配的组件，缓存
    exclude: patternTypes, // 不去匹配的组件，不缓存
    max: [String, Number], // 缓存组件的最大实例数量, 由于缓存的是组件实例（vnode），数量过多的时候，会占用过多的内存，可以用max指定上限
  },

  created() {
    // 用于初始化缓存虚拟DOM数组和vnode的key
    this.cache = Object.create(null)
    this.keys = []
  },

  destroyed() {
    // 销毁缓存cache的组件实例
    for (const key in this.cache) {
      pruneCacheEntry(this.cache, key, this.keys)
    }
  },

  mounted() {
    // prune 削减精简[v.]
    // 去监控include和exclude的改变，根据最新的include和exclude的内容，来实时削减缓存的组件的内容
    this.$watch('include', (val) => {
      pruneCache(this, (name) => matches(val, name))
    })
    this.$watch('exclude', (val) => {
      pruneCache(this, (name) => !matches(val, name))
    })
  },
}

```

#### render 函数

1. 会在 keep-alive 组件内部去写自己的内容，所以可以去获取默认 slot 的内容，然后根据这个去获取组件
2. keep-alive 只对第一个组件有效，所以获取第一个子组件。
3. 和 keep-alive 搭配使用的一般有：`动态组件`和`router-view`

```
  render () {
    //
    function getFirstComponentChild (children: ?Array<VNode>): ?VNode {
      if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const c = children[i]
      if (isDef(c) && (isDef(c.componentOptions) || isAsyncPlaceholder(c))) {
        return c
      }
    }
    }
    }
    const slot = this.$slots.default // 获取默认插槽
    const vnode: VNode = getFirstComponentChild(slot)// 获取第一个子组件
    const componentOptions: ?VNodeComponentOptions = vnode && vnode.componentOptions // 组件参数
    if (componentOptions) { // 是否有组件参数
      // check pattern
      const name: ?string = getComponentName(componentOptions) // 获取组件名
      const { include, exclude } = this
      if (
        // not included
        (include && (!name || !matches(include, name))) ||
        // excluded
        (exclude && name && matches(exclude, name))
      ) {
        // 如果不匹配当前组件的名字和include以及exclude
        // 那么直接返回组件的实例
        return vnode
      }

      const { cache, keys } = this

      // 获取这个组件的key
      const key: ?string = vnode.key == null
        // same constructor may get registered as different local components
        // so cid alone is not enough (#3269)
        ? componentOptions.Ctor.cid + (componentOptions.tag ? `::${componentOptions.tag}` : '')
        : vnode.key

      if (cache[key]) {
        // LRU缓存策略执行
        vnode.componentInstance = cache[key].componentInstance // 组件初次渲染的时候componentInstance为undefined

        // make current key freshest
        remove(keys, key)
        keys.push(key)
        // 根据LRU缓存策略执行，将key从原来的位置移除，然后将这个key值放到最后面
      } else {
        // 在缓存列表里面没有的话，则加入，同时判断当前加入之后，是否超过了max所设定的范围，如果是，则去除
        // 使用时间间隔最长的一个
        cache[key] = vnode
        keys.push(key)
        // prune oldest entry
        if (this.max && keys.length > parseInt(this.max)) {
          pruneCacheEntry(cache, keys[0], keys, this._vnode)
        }
      }
      // 将组件的keepAlive属性设置为true
      vnode.data.keepAlive = true // 作用：判断是否要执行组件的created、mounted生命周期函数
    }
    return vnode || (slot && slot[0])
  }
```

步骤总结：

1. 获取 keep-alive 下第一个子组件的实例对象，通过他去获取这个组件的组件名
2. 通过当前组件名去匹配原来 include 和 exclude，判断当前组件是否需要缓存，不需要缓存，直接返回当前组件的实例 vNode
3. 需要缓存，判断他当前是否在缓存数组里面，存在，则将他原来位置上的 key 给移除，同时将这个组件的 key 放到数组最后面（LRU）
4. 不存在，将组件 key 放入数组，然后判断当前 key 数组是否超过 max 所设置的范围，超过，那么削减未使用时间最长的一个组件的 key 值
5. 最后将这个组件的 keepAlive 设置为 true

### keep-alive 本身的创建过程和 patch 过程

> patch [v.]打补丁
> 缓存渲染的时候，会根据 vnode.componentInstance（首次渲染 vnode.componentInstance 为 undefined） 和 keepAlive 属性判断不会执行组件的 created、mounted 等钩子函数，而是对缓存的组件执行 patch 过程：**直接把缓存的 DOM 对象直接插入到目标元素中，完成了数据更新的情况下的渲染过程**。

#### 首次渲染

- 组件的首次渲染：判断组件的 abstract 属性，才往父组件里面挂载 DOM

```
// core/instance/lifecycle
function initLifecycle (vm: Component) {
  const options = vm.$options

  // locate first non-abstract parent
  let parent = options.parent
  if (parent && !options.abstract) { // 判断组件的abstract属性，才往父组件里面挂载DOM
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent
    }
    parent.$children.push(vm)
  }

  vm.$parent = parent
  vm.$root = parent ? parent.$root : vm

  vm.$children = []
  vm.$refs = {}

  vm._watcher = null
  vm._inactive = null
  vm._directInactive = false
  vm._isMounted = false
  vm._isDestroyed = false
  vm._isBeingDestroyed = false
}
```

- 判断当前 keepAlive 和 componentInstance 是否存在来判断是否要执行组件 prepatch 还是执行创建 componentInstance

```
// core/vdom/create-component
init (vnode: VNodeWithData, hydrating: boolean): ?boolean {
    if (
      vnode.componentInstance &&
      !vnode.componentInstance._isDestroyed &&
      vnode.data.keepAlive
    ) { // componentInstance在初次是undefined!!!
      // kept-alive components, treat as a patch
      const mountedNode: any = vnode // work around flow
      componentVNodeHooks.prepatch(mountedNode, mountedNode) // prepatch函数执行的是组件更新的过程
    } else {
      const child = vnode.componentInstance = createComponentInstanceForVnode(
        vnode,
        activeInstance
      )
      child.$mount(hydrating ? vnode.elm : undefined, hydrating)
    }
  },
```

prepatch 操作就不会在执行组件的`mounted`和`created`生命周期函数，而是直接将 DOM 插入

### LRU (least recently used)缓存策略

LRU 缓存策略：从内存中找出最久未使用的数据并置换新的数据.
LRU（Least rencently used）算法根据数据的历史访问记录来进行淘汰数据，其核心思想是“如果数据最近被访问过，那么将来被访问的几率也更高”。
最常见的实现是使用一个链表保存缓存数据，详细算法实现如下：

1. 新数据插入到链表头部
2. 每当缓存命中（即缓存数据被访问），则将数据移到链表头部
3. 链表满的时候，将链表尾部的数据丢弃。
