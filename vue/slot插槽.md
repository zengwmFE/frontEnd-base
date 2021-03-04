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

后编译子组件里面的`slot`组件：`<slot name="header"></slot>`,也就是以这个来编译的话,`el.scopedSlots`就是存在了，

```
function genScopedSlots (
  el: ASTElement,
  slots: { [key: string]: ASTElement },
  state: CodegenState
): string {
  // by default scoped slots are considered "stable", this allows child
  // components with only scoped slots to skip forced updates from parent.
  // but in some cases we have to bail-out of this optimization
  // for example if the slot contains dynamic names, has v-if or v-for on them...
  let needsForceUpdate = el.for || Object.keys(slots).some(key => {
    const slot = slots[key]
    return (
      slot.slotTargetDynamic ||
      slot.if ||
      slot.for ||
      containsSlotChild(slot) // is passing down slot from parent which may be dynamic
    )
  })

  // #9534: if a component with scoped slots is inside a conditional branch,
  // it's possible for the same component to be reused but with different
  // compiled slot content. To avoid that, we generate a unique key based on
  // the generated code of all the slot contents.
  let needsKey = !!el.if

  // OR when it is inside another scoped slot or v-for (the reactivity may be
  // disconnected due to the intermediate scope variable)
  // #9438, #9506
  // TODO: this can be further optimized by properly analyzing in-scope bindings
  // and skip force updating ones that do not actually use scope variables.
  if (!needsForceUpdate) {
    let parent = el.parent
    while (parent) {
      if (
        (parent.slotScope && parent.slotScope !== emptySlotScopeToken) ||
        parent.for
      ) {
        needsForceUpdate = true
        break
      }
      if (parent.if) {
        needsKey = true
      }
      parent = parent.parent
    }
  }

  const generatedSlots = Object.keys(slots)
    .map(key => genScopedSlot(slots[key], state))
    .join(',')

  return `scopedSlots:_u([${generatedSlots}]${
    needsForceUpdate ? `,null,true` : ``
  }${
    !needsForceUpdate && needsKey ? `,null,false,${hash(generatedSlots)}` : ``
  })`
}
```
