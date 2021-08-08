## v-model

`v-mode`即可以作用于普通表单元素，又可以作用于组件上。

### 普通表单元素

🌰

```
let vm = new Vue({
  el: '#app',
  template: '<div>'
  + '<input v-model="message" placeholder="edit me">' +
  '<p>Message is: {{ message }}</p>' +
  '</div>',
  data() {
    return {
      message: ''
    }
  }
})
```

在这里当输入数据的时候，`message`同时也会改变的

#### 分析

首先在编译阶段，首先是`parse`阶段，`v-model`会被当做普通指令解析到`el.directives`中，然后在`codegen`阶段，获取所有表单上的元素` const dirs = genDirectives(el, state)`

```
function genDirectives (el: ASTElement, state: CodegenState): string | void {
  const dirs = el.directives
  if (!dirs) return
  let res = 'directives:['
  let hasRuntime = false
  let i, l, dir, needRuntime
  for (i = 0, l = dirs.length; i < l; i++) {
    dir = dirs[i]
    needRuntime = true
    const gen: DirectiveFunction = state.directives[dir.name]
    if (gen) {
      // compile-time directive that manipulates AST.
      // returns true if it also needs a runtime counterpart.
      needRuntime = !!gen(el, dir, state.warn)
    }
    if (needRuntime) {
      hasRuntime = true
      res += `{name:"${dir.name}",rawName:"${dir.rawName}"${
        dir.value ? `,value:(${dir.value}),expression:${JSON.stringify(dir.value)}` : ''
      }${
        dir.arg ? `,arg:${dir.isDynamicArg ? dir.arg : `"${dir.arg}"`}` : ''
      }${
        dir.modifiers ? `,modifiers:${JSON.stringify(dir.modifiers)}` : ''
      }},`
    }
  }
  if (hasRuntime) {
    return res.slice(0, -1) + ']'
  }
}
```

这个方法就是对`el.directive`进行遍历，然后使用`const gen: DirectiveFunction = state.directives[dir.name]`,来看一下这个方法是哪里来的：
在 generate 方法内调用了 genElement，而这个 state 也就是我们前面的 state，那么`directive`的方法就是从 options 来的

```
 const state = new CodegenState(options)
const code = ast ? genElement(ast, state) : '_c("div")'
```

继续往下找`generate`的调用位置,`createCompiler`就是传入`options`的地方:`src\platforms\web\server\compiler.js`

```

export const baseOptions: CompilerOptions = {
  expectHTML: true,
  modules,
  directives,
  isPreTag,
  isUnaryTag,
  mustUseProp,
  canBeLeftOpenTag,
  isReservedTag,
  getTagNamespace,
  staticKeys: genStaticKeys(modules)
}
const { compile, compileToFunctions } = createCompiler(baseOptions)

// src\platforms\web\compiler\options.js
import model from './model'
import text from './text'
import html from './html'

export default {
  model,
  text,
  html
}
这里代表的就是：`v-model`,`v-text`,`v-html`
```

那么对于`v-model`,就应该是：`model`

```
export default function model (
  el: ASTElement,
  dir: ASTDirective,
  _warn: Function
): ?boolean {
  warn = _warn
  const value = dir.value
  const modifiers = dir.modifiers
  const tag = el.tag
  const type = el.attrsMap.type

  if (process.env.NODE_ENV !== 'production') {
    // inputs with type="file" are read only and setting the input's
    // value will throw an error.
    if (tag === 'input' && type === 'file') {
      warn(
        `<${el.tag} v-model="${value}" type="file">:\n` +
        `File inputs are read only. Use a v-on:change listener instead.`,
        el.rawAttrsMap['v-model']
      )
    }
  }

  if (el.component) {
    genComponentModel(el, value, modifiers)
    // component v-model doesn't need extra runtime
    return false
  } else if (tag === 'select') {
    genSelect(el, value, modifiers)
  } else if (tag === 'input' && type === 'checkbox') {
    genCheckboxModel(el, value, modifiers)
  } else if (tag === 'input' && type === 'radio') {
    genRadioModel(el, value, modifiers)
  } else if (tag === 'input' || tag === 'textarea') {
    genDefaultModel(el, value, modifiers)
  } else if (!config.isReservedTag(tag)) {
    genComponentModel(el, value, modifiers)
    // component v-model doesn't need extra runtime
    return false
  }

  // ensure runtime directive metadata
  return true
}
```

在这里它对于不同的表单元素，采取了不同的措施,我们这里来说：`genDefaultModel(el, value, modifiers)`

```
function genDefaultModel (
  el: ASTElement,
  value: string,
  modifiers: ?ASTModifiers
): ?boolean {
  const type = el.attrsMap.type

  // warn if v-bind:value conflicts with v-model
  // except for inputs with v-bind:type

  const { lazy, number, trim } = modifiers || {}
  const needCompositionGuard = !lazy && type !== 'range'
  const event = lazy
    ? 'change'
    : type === 'range'
      ? RANGE_TOKEN
      : 'input'

  let valueExpression = '$event.target.value'
  if (trim) {
    valueExpression = `$event.target.value.trim()`
  }
  if (number) {
    valueExpression = `_n(${valueExpression})`
  }

  let code = genAssignmentCode(value, valueExpression)
  if (needCompositionGuard) {
    code = `if($event.target.composing)return;${code}`
  }

  addProp(el, 'value', `(${value})`)
  addHandler(el, event, code, null, true)
  if (trim || number) {
    addHandler(el, 'blur', '$forceUpdate()')
  }
}
export function genAssignmentCode (
  value: string,
  assignment: string
): string {
  const res = parseModel(value)
  if (res.key === null) {
    return `${value}=${assignment}`
  } else {
    return `$set(${res.exp}, ${res.key}, ${assignment})`
  }
}

```

`v-model`支持 3 个修饰符：`trim`,`number`,`lazy`,然后根据` let valueExpression = '$event.target.value'`，去调用了`genAssignmentCode`,根据是否是对象，返回了`${value}=${assignment}`或者`$set(${res.exp}, ${res.key}, ${assignment})`两个表达式，等待执行。这是 code:`if($event.target.composing)return;message=$event.target.value`。然后执行`addProp`，给`input`添加了一个`value`的属性,执行了`addHandler`绑定添加了一个为`input`的事件并当 input 的时候触发回调调用了`if($event.target.composing)return;message=$event.target.value`，这这就是`v-model`在 input 上的实现

### 组件

```
// 子组件
let Child = {
  template: '<div>'
  + '<input :value="value" @input="updateValue">' +
  '</div>',
  props: ['value'],
  methods: {
    updateValue(e) {
      this.$emit('input', e.target.value)
    }
  }
}
// 父组件
let vm = new Vue({
  el: '#app',
  template: '<div>' +
  '<child v-model="message"></child>' +
  '<p>Message is: {{ message }}</p>' +
  '</div>',
  data() {
    return {
      message: ''
    }
  },
  components: {
    Child
  }
})
```

组件`v-model`的使用方法：

1. 父组件在引用子组件的地方增加`v-model`关联的数据,
2. 子组件定义于一个`value`的`prop`，并且在`input`的回调函数中，通过`this.$emit('input',e.target.value)`派发了一个事件

跟表单元素的`v-model`一样，代码在`src\platforms\web\compiler\directives\model.js`

```
else if (!config.isReservedTag(tag)) {
    genComponentModel(el, value, modifiers)
    // component v-model doesn't need extra runtime
    return false
}
/**
 * Cross-platform code generation for component v-model
 */
export function genComponentModel (
  el: ASTElement,
  value: string,
  modifiers: ?ASTModifiers
): ?boolean {
  const { number, trim } = modifiers || {}

  const baseValueExpression = '$$v'
  let valueExpression = baseValueExpression
  if (trim) {
    valueExpression =
      `(typeof ${baseValueExpression} === 'string'` +
      `? ${baseValueExpression}.trim()` +
      `: ${baseValueExpression})`
  }
  if (number) {
    valueExpression = `_n(${valueExpression})`
  }
  const assignment = genAssignmentCode(value, valueExpression)

  el.model = {
    value: `(${value})`,
    expression: JSON.stringify(value),
    callback: `function (${baseValueExpression}) {${assignment}}`
  }
}

```

在这里生成了一个`el.model`

```
el.model = {
  value: '(message)',
  expression: 'message',
  callback: `function($$v){message=$$v}`
}

```

在生成完之后，在`const dirs = genDirectives(el, state)`,就会针对于组件

```
 // component v-model
  if (el.model) {
    data += `model:{value:${
      el.model.value
    },callback:${
      el.model.callback
    },expression:${
      el.model.expression
    }},`
  }
```

在这里就会生成一个 data

```
model: {
  value: '(message)',
  callback: 'function($$v){message=$$v}',
  expression: 'message'
}
```

然后对组件进行生成代码`genComponent`就能得到：

```
function genComponent (
  componentName: string,
  el: ASTElement,
  state: CodegenState
): string {
  const children = el.inlineTemplate ? null : genChildren(el, state, true)
  return `_c(${componentName},${genData(el, state)}${
    children ? `,${children}` : ''
  })`
}
```

生成的 render 函数：

```
with(this){
  return _c('div',[_c('child',{
    model:{
      value:(message),
      callback:function ($$v) {
        message=$$v
      },
      expression:"message"
    }
  }),
  _c('p',[_v("Message is: "+_s(message))])],1)
}
```

接下来就进入了组件的 vnode 的创建阶段了，来看看`createComponent`方法,在这个方法里面对于`data.model`属性进行判断然后执行`transformModel`方法：

```
// createComponent
 if (isDef(data.model)) {
    transformModel(Ctor.options, data);
  }

function transformModel(options, data: any) {
  const prop = (options.model && options.model.prop) || "value";
  const event = (options.model && options.model.event) || "input";
  (data.attrs || (data.attrs = {}))[prop] = data.model.value;
  const on = data.on || (data.on = {});
  const existing = on[event];
  const callback = data.model.callback;
  if (isDef(existing)) {
    if (
      Array.isArray(existing)
        ? existing.indexOf(callback) === -1
        : existing !== callback
    ) {
      on[event] = [callback].concat(existing);
    }
  } else {
    on[event] = callback;
  }
}

```

**在前面说到了,`on`属性就是代表，这个组件有效的属性，`transformModel`就给`props`添加了一个为我们这个`v-model`属性得值，然后回调函数为`el.model.callback`，在我们这里就相当于添加了一个为`(message)`得`props`,然后在 on 里面添加了一个事件`message`**

```
  const prop = (options.model && options.model.prop) || "value";
  const event = (options.model && options.model.event) || "input";
```

在这里可以知道，可以自定义组件`event`事件名称和`props`属性名称来使子组件使用`emit`方法，实现父子通信

```
let Child = {
  template: '<div>'
  + '<input :value="msg" @input="updateValue" placeholder="edit me">' +
  '</div>',
  props: ['msg'],
  model: {
    prop: 'msg',
    event: 'change'
  },
  methods: {
    updateValue(e) {
      this.$emit('change', e.target.value)
    }
  }
}
<child v-model="message"></child>
```
