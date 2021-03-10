## slot 插槽

插槽分为

1. 具名插槽
2. 作用域插槽

**具名插槽得用法**

```
<slot></slot> // 没有name的slot会带有隐含的名字default
<slot name="header"></slot>
<template v-slot:header>
    <h1>Here might be a page title</h1>
</template>
```

**作用域插槽**

```
<current-user v-slot="slotProps">
  {{ slotProps.user.firstName }}
</current-user>
<current-user v-slot:default="slotProps">
  {{ slotProps.user.firstName }}
</current-user>
```

### 提要

不同的编译标识对应着不同的方法
`src\core\instance\render-helpers\index.js`

```
export function installRenderHelpers (target: any) {
  target._o = markOnce
  target._n = toNumber
  target._s = toString
  target._l = renderList
  target._t = renderSlot
  target._q = looseEqual
  target._i = looseIndexOf
  target._m = renderStatic
  target._f = resolveFilter
  target._k = checkKeyCodes
  target._b = bindObjectProps
  target._v = createTextVNode
  target._e = createEmptyVNode
  target._u = resolveScopedSlots
  target._g = bindObjectListeners
  target._d = bindDynamicKeys
  target._p = prependModifier
}

```

### 具名插槽

🌰：

```
let AppLayout = {
  template: '<div class="container">' +
  '<header><slot name="header"></slot></header>' +
  '<main><slot>默认内容</slot></main>' +
  '<footer><slot name="footer"></slot></footer>' +
  '</div>'
}
let vm = new Vue({
  el: '#app',
  template: '<div>' +
  '<app-layout>' +
  '<h1 slot="header">{{title}}</h1>' +
  '<p>{{msg}}</p>' +
  '<p slot="footer">{{desc}}</p>' +
  '</app-layout>' +
  '</div>',
  data() {
    return {
      title: '我是标题',
      msg: '我是内容',
      desc: '其它信息'
    }
  },
  components: {
    AppLayout
  }
})
```

完成渲染之后，就会成为：

```
<div class="container">
  <header><h1>我是标题</h1></header>
  <main><p>我是内容</p></main>
  <p>其它信息</p>
</div>
```

## 编译

在`parser`阶段，会执行两个函数分别处理两种不同写法的`slot`

```
  processSlotContent(element)
  processSlotOutlet(element)
// handle content being passed to a component as slot,
// e.g. <template slot="xxx">, <div slot-scope="xxx">
function processSlotContent (el) {
  let slotScope
  if (el.tag === 'template') {
    // 是template，就要获取scope属性，然后给到el.slotScope
    slotScope = getAndRemoveAttr(el, 'scope')
    /* istanbul ignore if */
    el.slotScope = slotScope || getAndRemoveAttr(el, 'slot-scope')
  } else if ((slotScope = getAndRemoveAttr(el, 'slot-scope'))) {
    // 如果不是那么就需要获取slot-scope方法
    el.slotScope = slotScope
  }

  // slot="xxx"
  // 判断slot="header"这类情况，得到名字也就是header或者是一个'""'这样的
  const slotTarget = getBindingAttr(el, 'slot')
  if (slotTarget) {
    // 如果没有slotTarget的实际值，那么就是default
    el.slotTarget = slotTarget === '""' ? '"default"' : slotTarget
    el.slotTargetDynamic = !!(el.attrsMap[':slot'] || el.attrsMap['v-bind:slot'])
    // preserve slot as an attribute for native shadow DOM compat
    // only for non-scoped slots.
    if (el.tag !== 'template' && !el.slotScope) {
      addAttr(el, 'slot', slotTarget, getRawBindingAttr(el, 'slot'))
    }
  }
  // 判断v-slot的语法，
  // 2.6 v-slot syntax
  if (process.env.NEW_SLOT_SYNTAX) {
    if (el.tag === 'template') {
      // v-slot on <template>
      const slotBinding = getAndRemoveAttrByRegex(el, slotRE)
      if (slotBinding) {
        const { name, dynamic } = getSlotName(slotBinding)
        el.slotTarget = name
        el.slotTargetDynamic = dynamic
        el.slotScope = slotBinding.value || emptySlotScopeToken // force it into a scoped slot for perf
      }
    } else {
      // v-slot on component, denotes default slot
      const slotBinding = getAndRemoveAttrByRegex(el, slotRE)
      if (slotBinding) {
        // add the component's children to its default slot
        const slots = el.scopedSlots || (el.scopedSlots = {})
        const { name, dynamic } = getSlotName(slotBinding)
        const slotContainer = slots[name] = createASTElement('template', [], el)
        slotContainer.slotTarget = name
        slotContainer.slotTargetDynamic = dynamic
        slotContainer.children = el.children.filter((c: any) => {
          if (!c.slotScope) {
            c.parent = slotContainer
            return true
          }
        })
        slotContainer.slotScope = slotBinding.value || emptySlotScopeToken
        // remove children as they are returned from scopedSlots now
        el.children = []
        // mark el non-plain so data gets generated
        el.plain = false
      }
    }
  }
}
// handle <slot/> outlets
function processSlotOutlet (el) {
  if (el.tag === 'slot') {
    el.slotName = getBindingAttr(el, 'name')
  }
}
```

1. 是 template，就要获取 scope 属性，然后给到 el.slotScope
2. 如果不是那么就需要获取 slot-scope 方法
3. 判断 slot="header"这类情况，得到名字也就是 header 或者是一个'""'这样的
4. 如果没有 slotTarget 的实际值，那么就是 default
5. 接着判断 v-slot 的情况（Vue2.6 以上的版本）

-

```
el = {
  slotScope,
  slotTarget: header,content,footer等等
}
```

同样在`genData`方法里面

```
 // slot target
  // only for non-scoped slots
  if (el.slotTarget && !el.slotScope) {
    data += `slot:${el.slotTarget},`
  }
  // scoped slots
  if (el.scopedSlots) {
    data += `${genScopedSlots(el, el.scopedSlots, state)},`
  }
```

可以看到，这里明确的注释写清楚了，对非作用域插槽和作用域插槽进行处理,对于普通插槽来说也就是生成了一个`slot:{target}`诸如这样的 data，那么普通插槽在例子来说对应`header`就是`slot:header`

在 generate 中,执行了`genElement`

```
if (el.tag === 'slot') {
    return genSlot(el, state)
}
function genSlot (el: ASTElement, state: CodegenState): string {
  const slotName = el.slotName || '"default"'
  const children = genChildren(el, state)
  let res = `_t(${slotName}${children ? `,${children}` : ''}`
  const attrs = el.attrs || el.dynamicAttrs
    ? genProps((el.attrs || []).concat(el.dynamicAttrs || []).map(attr => ({
        // slot props are camelized
        name: camelize(attr.name),
        value: attr.value,
        dynamic: attr.dynamic
      })))
    : null
  const bind = el.attrsMap['v-bind']
  if ((attrs || bind) && !children) {
    res += `,null`
  }
  if (attrs) {
    res += `,${attrs}`
  }
  if (bind) {
    res += `${attrs ? '' : ',null'},${bind}`
  }
  return res + ')'
}

```

1. 首先对 slot 和 name，进行 res 的生成:`\_t(${slotName}${children ? `,${children}` : ''}`

生成的父组件

```
with(this){
  return _c('div',
    [_c('app-layout',
      [_c('h1',{attrs:{"slot":"header"},slot:"header"},
         [_v(_s(title))]),
       _c('p',[_v(_s(msg))]),
       _c('p',{attrs:{"slot":"footer"},slot:"footer"},
         [_v(_s(desc))]
         )
       ])
     ],
   1)}
```

然后后编译子组件里面的`slot`组件：`<slot name="header"></slot>`，在`processSlotOutlet`，可以看到对于 tag 为`slot`的内容有逻辑：

```
function processSlotOutlet (el) {
  if (el.tag === 'slot') {
    el.slotName = getBindingAttr(el, 'name')
  }
}
```

在这里直接获取到了绑定的`slot`名为`header`

#### 在 codegen 阶段

generate 函数中`genElement`

```
export function genElement (el: ASTElement, state: CodegenState): string {
if (el.tag === 'slot') {
    return genSlot(el, state)
  }
}
```

genSlot 函数就是为了生成一个

```
function genSlot (el: ASTElement, state: CodegenState): string {
  const slotName = el.slotName || '"default"'
  const children = genChildren(el, state)
  let res = `_t(${slotName}${children ? `,${children}` : ''}`
  const attrs = el.attrs || el.dynamicAttrs
    ? genProps((el.attrs || []).concat(el.dynamicAttrs || []).map(attr => ({
        // slot props are camelized
        name: camelize(attr.name),
        value: attr.value,
        dynamic: attr.dynamic
      })))
    : null
  const bind = el.attrsMap['v-bind']
  if ((attrs || bind) && !children) {
    res += `,null`
  }
  if (attrs) {
    res += `,${attrs}`
  }
  if (bind) {
    res += `${attrs ? '' : ',null'},${bind}`
  }
  return res + ')'
}
```

如果这个地方只是一个单纯的插槽，没有属性也没有`v-bind`的情况，那么`res`会比较简单，在刚才就介绍了如果`slotName`为空的时候，那么就会有个`default`的默认值，那么在这里渲染出来子组件的就是：

```
with(this) {
  return _c('div',{
    staticClass:"container"
    },[
      _c('header',[_t("header")],2),
      _c('main',[_t("default",[_v("默认内容")])],2),
      _c('footer',[_t("footer")],2)
      ]
   )
}
```

`_t`就是`renderSlot`函数，在编译的时候，对插槽进行处理，在`src/core/instance/render-heplpers/render-slot.js`

```
export function renderSlot (
  name: string,
  fallback: ?Array<VNode>, // 插槽的默认内容生成的vnode数组
  props: ?Object,
  bindObject: ?Object
): ?Array<VNode> {
  // name: header,default,footer
  const scopedSlotFn = this.$scopedSlots[name]
  let nodes
  if (scopedSlotFn) { // scoped slot
    props = props || {}
    if (bindObject) {
      props = extend(extend({}, bindObject), props)
    }
    nodes = scopedSlotFn(props) || fallback
  } else {
    nodes = this.$slots[name] || fallback
  }

  const target = props && props.slot
  if (target) {
    return this.$createElement('template', { slot: target }, nodes)
  } else {
    return nodes
  }
}
```

如果不是个`scope-slot`，也就符合我们子组件的`slot`，那么走的逻辑就是`nodes = this.$slots[name] || fallback`，那么这个`this.$slots`是从哪里来的呢？子组件的`init`时机是在执行父组件`patch`过程中的时候，那么这个时候，父组件已经编译完成了，在子组件`init`的过程中，会执行`initRender`函数:`src\core\instance\init.js`

```
export function initRender (vm: Component) {
  ...
  const options = vm.$options
  const parentVnode = vm.$vnode = options._parentVnode // the placeholder node in parent tree
  const renderContext = parentVnode && parentVnode.context
  vm.$slots = resolveSlots(options._renderChildren, renderContext)
  ...
}
```

可以看到这里是通过`resolveSlots`返回了`vm.$slots`，`resolveSlots`在`render-helpers/resolve-slots`

```
export function resolveSlots (
  children: ?Array<VNode>,
  context: ?Component
): { [key: string]: Array<VNode> } {
  if (!children || !children.length) {
    return {}
  }
  const slots = {}
  for (let i = 0, l = children.length; i < l; i++) {
    const child = children[i]
    const data = child.data
    // remove slot attribute if the node is resolved as a Vue slot node
    if (data && data.attrs && data.attrs.slot) {
      delete data.attrs.slot
    }
    // named slots should only be respected if the vnode was rendered in the
    // same context.
    if ((child.context === context || child.fnContext === context) &&
      data && data.slot != null
    ) {
      const name = data.slot
      const slot = (slots[name] || (slots[name] = []))
      if (child.tag === 'template') {
        slot.push.apply(slot, child.children || [])
      } else {
        slot.push(child)
      }
    } else {
      (slots.default || (slots.default = [])).push(child)
    }
  }
  // ignore slots that contains only whitespace
  for (const name in slots) {
    if (slots[name].every(isWhitespace)) {
      delete slots[name]
    }
  }
  return slots
}
```

函数接受了 2 个参数：1 个是父`node`的 children,在这里就是:

```
'<h1 slot="header">{{title}}</h1>' +
  '<p>{{msg}}</p>' +
  '<p slot="footer">{{desc}}</p>' +
```

第二个参数`context`是父`vnode`的上下文，也就是父组件的`vm`实例，这个函数的作用就是循环`children`，然后拿到每个`data`，判断属性上的`slot`是否存在，如果存在，就将他移除。然后获取到 data 内的`slot`，然后用插槽`key`，然后将`child`作为`value`放入到对应 name 的数组里面，在这里这个`value`可能会存在多个同名的插槽.然后就把他返回赋值给了`vm.$slots`。

接下来执行`renderSlot`的`nodes = this.$slots[name] || fallback`

```
const target = props && props.slot
  if (target) {
    return this.$createElement('template', { slot: target }, nodes)
  } else {
    return nodes
  }
```
