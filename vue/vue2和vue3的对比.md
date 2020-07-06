## Vue3 beta

### 亮点

#### composition API

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

- 优于 vue2.x
- 重构了虚拟 DOM，保持兼容性，使 dom 脱离模板渲染，提升性能
- 优化了模板编译过程，增加 patchFlag，遍历节点的时候，会跳过静态节点
- 拥有高效的组件初始化
- 组件 upload 的过程性能提升 1.3~2 倍
- SSR 速度提升 2~3 倍

#### tree shaking support

- 打包的时候自动去除没用到的 vue 模块

#### 更好的 ts 支持

- 类型定义提示
- tsx 支持
- class 组件的支持

### 全家桶修改

vite 的使用，放弃原来使用的 webpack

> https://github.com/vitejs/vite

1. 开发服务器启动后不需要进行打包操作
2. 可以自定义开发服务器:`const {createSever} = require('vite')`
3. 热模块替换的性能和模块数量无关，替换变快，即时热模块替换
4. 生产环境和 rollup 捆绑

### 源码修改

defineProperty 和 Proxy 得比较

1. Object.defineProperty 只能劫持对象的属性，而 Proxy 是直接代理对象
   由于 Object.defineProperty 只能对属性进行劫持，需要遍历对象的每个属性。而 Proxy 可以直接代理对象。
2. Object.defineProperty 对新增属性需要手动进行 Observe， 由于 Object.defineProperty 劫持的是对象的属性，所以新增属性时，需要重新遍历对象，对其新增属性再使用 Object.defineProperty 进行劫持。 也正是因为这个原因，使用 Vue 给 data 中的数组或对象新增属性时，需要使用 vm.\$set 才能保证新增的属性也是响应式的。
3. Proxy 支持 13 种拦截操作，这是 defineProperty 所不具有的新标准性能红利
4. Proxy 作为新标准，长远来看，JS 引擎会继续优化 Proxy，但 getter 和 setter 基本不会再有针对性优化。
5. Proxy 兼容性差 目前并没有一个完整支持 Proxy 所有拦截方法的 Polyfill 方案
