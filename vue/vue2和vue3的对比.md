## Vue3 beta 新优势
#### optionsAPI -> composition API

> https://vue-composition-api-rfc.netlify.app

举个简单的例子

1. 声明变量

```
const { reactive } = Vue
var App = {
  template: `
    <div>
         {{message}}
    </div>`,
  setup() {
  	const state = reactive({message: "Hello World!!!"})
	return {
		...state
	}
  }
}
Vue.createApp().mount(App, '#app')
```

2. 双向绑定

```
const { reactive } = Vue
let App = {
  template: `
    <div>
        <input v-model="state.value"/>{{state.value}}
    </div>`,
  setup() {
    const state = reactive({ value: '' })
    return { state }
  }
}
Vue.createApp().mount(App, '#app')

```

- setup
  > **被诟病得地方，内容要写在这个地方**。setup 实际上是一个组件的入口，它运行在组件被实例化时候，props 属性被定义之后，实际上等价于 vue2 版本的 beforeCreate 和 Created 这两个生命周期
- reactive
  > 创建一个响应式得状态，几乎等价于 vue2.x 中的 Vue.observable() API，为了避免于 rxjs 中得 observable 混淆进行了重命名

3. 观察属性

```
import { reactive, watchEffect } from 'vue'

const state = reactive({
  count: 0,
})

watchEffect(() => {
  document.body.innerHTML = `count is ${state.count}`
})
return {...state}
```

> watchEffect 和 2.x 中的 watch 选项类似，但是它不需要把被依赖的数据源和副作用回调分开。组合式 API 同样提供了一个 watch 函数，其行为和 2.x 的选项完全一致。

5. ref
   > vue3 允许用户创建单个的响应式对象

```
const App = {
  template: `
      <div>
        {{value}}
      </div>`,
  setup() {
    const value = ref(0)
    return { value }
  }
}
Vue.createApp().mount(App, '#app')
```

6. 计算属性

```
setup() {
  const state = reactive({
    count: 0,
    double: computed(() => state.count * 2),
   })

  function increment() {
    state.count++
  }

  return {
    state,
    increment,
  }
},
```

7. 生命周期的变更
   vue2|vue3
   --|:--:|
   beforeCreate|setup|
   created|setup|
   beforeMount|onBeforeMount|
   mounted|onMounted|
   beforeUpdate|onBeforeUpdate|
   updated|onUpdated|
   beforeDestroy|onBeforeUnmount|
   destroyed|onUnmounted|
   errorCaptured|onErrorCaptured|

生命周期使用举例：

```
import { onMounted } from 'vue'

export default {
  setup() {
    onMounted(() => {
      console.log('component is mounted!')
    })
  },
}
```

#### performance 优化

- 重构了虚拟 DOM，保持兼容性，使 dom 脱离模板渲染，提升性能
- 优化了模板编译过程，增加 patchFlag，遍历节点的时候，会跳过静态节点
- 高效的组件初始化
- 组件 upload 的过程性能提升 1.3~2 倍
- SSR 速度提升 2~3 倍

**vue3.0如何实现的 domdiff和vDOM的优化**
1. 编译模板的静态标记
举例：
```
<div id="app">
    <p>周一呢</p>
    <p>明天就周二了</p>
    <div>{{week}}</div>
</div>
```
在vue2会被解析成一下代码
```
function render() {
  with(this) {
    return _c('div', {
      attrs: {
        "id": "app"
      }
    }, [_c('p', [_v("周一呢")]), _c('p', [_v("明天就周二了")]), _c('div', [_v(
      _s(week))])])
  }
}
```
可以看出，两个`p`标签是完全静态的，以至于在后续的渲染中，其实没有任何变化的，但是在`vue2.x`中依然会使用`_c`新建成一个vdom，在`diff`的时候仍然需要去比较，这样就造成了一定量的性能消耗

在vue3中
```
import { createVNode as _createVNode, toDisplayString as _toDisplayString, openBlock as _openBlock, createBlock as _createBlock } from "vue"

export function render(_ctx, _cache) {
  return (_openBlock(), _createBlock("div", { id: "app" }, [
    _createVNode("p", null, "周一呢"),
    _createVNode("p", null, "明天就周二了"),
    _createVNode("div", null, _toDisplayString(_ctx.week), 1 /* TEXT */)
  ]))
}

```
只有当`_createVNode`的第四个参数不为空的时候，这时，才会被遍历，而静态节点就不会被遍历到

同时发现了在`vue3`最后一个非静态的节点编译后：出现了`/* TEXT */`，这是为了标记当前内容的类型以便进行`diff`，如果不同的标记，只需要去比较对比相同的类型。这就不会去浪费时间对其他类型进行遍历了

```
export const enum PatchFlags {
  
  TEXT = 1,// 表示具有动态textContent的元素
  CLASS = 1 << 1,  // 表示有动态Class的元素
  STYLE = 1 << 2,  // 表示动态样式（静态如style="color: red"，也会提升至动态）
  PROPS = 1 << 3,  // 表示具有非类/样式动态道具的元素。
  FULL_PROPS = 1 << 4,  // 表示带有动态键的道具的元素，与上面三种相斥
  HYDRATE_EVENTS = 1 << 5,  // 表示带有事件监听器的元素
  STABLE_FRAGMENT = 1 << 6,   // 表示其子顺序不变的片段（没懂）。 
  KEYED_FRAGMENT = 1 << 7, // 表示带有键控或部分键控子元素的片段。
  UNKEYED_FRAGMENT = 1 << 8, // 表示带有无key绑定的片段
  NEED_PATCH = 1 << 9,   // 表示只需要非属性补丁的元素，例如ref或hooks
  DYNAMIC_SLOTS = 1 << 10,  // 表示具有动态插槽的元素
}

```

如果存在两种类型，那么只需要对这两个值对应的`patchflag`进行位晕眩
如：`TEXT`和`PROPS`

```
TEXT: 1 ,PROPRS: 1<<3 => 8

那么对1和8进行按位与运算得到=>9
```


2.事件储存
> 绑定的事件会缓存在缓存中

```
<div id="app">
  <button @click="handleClick">周五啦</button>
</div>

```
经过转换=>
```
import { createVNode as _createVNode, openBlock as _openBlock, createBlock as _createBlock } from "vue"

export function render(_ctx, _cache) {
  return (_openBlock(), _createBlock("div", { id: "app" }, [
    _createVNode("button", {
      onClick: _cache[1] || (_cache[1] = ($event, ...args) => (_ctx.handleClick($event, ...args)))
    }, "周五啦")
  ]))
}

```
在代码中可以看出在绑定点击事件的时候，会生成并缓存了一个内联函数在cache中，变成了一个静态的节点

3. 静态提升
```
<div id="app">
    <p>周一了</p>
    <p>周二了</p>
    <div>{{week}}</div>
    <div :class="{red:isRed}">周三呢</div>
</div>
```

转换成=>
```
import { createVNode as _createVNode, toDisplayString as _toDisplayString, openBlock as _openBlock, createBlock as _createBlock } from "vue"

const _hoisted_1 = { id: "app" }
const _hoisted_2 = /*#__PURE__*/_createVNode("p", null, "周一了", -1 /* HOISTED */)
const _hoisted_3 = /*#__PURE__*/_createVNode("p", null, "周二了", -1 /* HOISTED */)

export function render(_ctx, _cache) {
  return (_openBlock(), _createBlock("div", _hoisted_1, [
    _hoisted_2,
    _hoisted_3,
    _createVNode("div", null, _toDisplayString(_ctx.week), 1 /* TEXT */),
    _createVNode("div", {
      class: {red:_ctx.isRed}
    }, "周三呢", 2 /* CLASS */)
  ]))
}
```
在这里可以看出来将一些静态的节点放放在了`render`函数的外部，这样就避免了每次`render`都会去生成一次静态节点

---


#### 提供了tree shaking

- 打包的时候自动去除没用到的 vue 模块

#### 更好的 ts 支持

- 类型定义提示
- tsx 支持
- class 组件的支持

### 全家桶修改

vite 的使用，放弃原来vue2.x使用的 webpack

> https://github.com/vitejs/vite

1. 开发服务器启动后不需要进行打包操作
2. 可以自定义开发服务器:`const {createSever} = require('vite')`
3. 热模块替换的性能和模块数量无关，替换变快，即时热模块替换
4. 生产环境和 rollup 捆绑

### 源码修改

#### vue2和vue3响应式对比
vue2.x 使用的是defineProperty，有两个难解决的问题
1. 只能做第一层属性的响应，再往深处就无法实现了
2. 数组问题：defineProperty无法检测数组长度的变化，准确的是说，是无法检测通过改变`length`的方法而增加的长度无法检测到
```
length的属性被初始化成为了
enumberable: false
configurable: false
writable: true
所以说直接去删除或者修改length属性是不行的
var a = [1,2,3]
Object.defineProperty(a,'length',{
   enumberable: true,
configurable: true,
writable: true ,
})
=> Uncaught TypeError: Cannot redefine property: length
```

vue3 使用的是Proxy和Reflect，直接代理整个对象

```
function reactive(data) {
    if (typeof data !== 'object' || data === null) {
        return data
    }
    const observed = new Proxy(data, {
        get(target, key, receiver) {
            // Reflect有返回值不报错
            let result = Reflect.get(target, key, receiver)

            // 多层代理
            return typeof result !== 'object' ? result : reactive(result) 
        },
        set(target, key, value, receiver) {
            effective()
            // proxy + reflect
            const ret = Reflect.set(target, key, value, receiver)
            return ret
        },

        deleteProperty(target,key){
            const ret = Reflect.deleteProperty(target,key)
            return ret
        }

    })
    return observed
}
```

**总结：**
1. Object.defineProperty 只能劫持对象的属性，而 Proxy 是直接代理对象,由于 Object.defineProperty 只能对属性进行劫持，需要遍历对象的每个属性。而 Proxy 可以直接代理对象。
2. Object.defineProperty 对新增属性需要手动进行 Observe， 由于 Object.defineProperty 劫持的是对象的属性，所以新增属性时，需要重新遍历对象，对其新增属性再使用 Object.defineProperty 进行劫持。 也正是因为这个原因，使用 Vue 给 data 中的数组或对象新增属性时，需要使用 vm.$set 才能保证新增的属性也是响应式的。
3. Proxy 支持 13 种拦截操作，这是 defineProperty 所不具有的新标准性能红利
4. Proxy 作为新标准，长远来看，JS 引擎会继续优化 Proxy，但 getter 和 setter 基本不会再有针对性优化。
5. Proxy 兼容性差 目前并没有一个完整支持 Proxy 所有拦截方法的 Polyfill 方案
