## event

```
let Child = {
  template: '<button @click="clickHandler($event)">' +
  'click me' +
  '</button>',
  methods: {
    clickHandler(e) {
      console.log('Button clicked!', e)
      this.$emit('select')
    }
  }
}

let vm = new Vue({
  el: '#app',
  template: '<div>' +
  '<child @select="selectHandler" @click.native.prevent="clickHandler"></child>' +
  '</div>',
  methods: {
    clickHandler() {
      console.log('Child clicked!')
    },
    selectHandler() {
      console.log('Child select!')
    }
  },
  components: {
    Child
  }
})
```

在`parse`阶段中，会执行`processAttrs`方法，它得定义在`src\compiler\parser\index.js`

```
function processAttrs (el) {
  const list = el.attrsList
  let i, l, name, rawName, value, modifiers, syncGen, isDynamic
  for (i = 0, l = list.length; i < l; i++) {
    name = rawName = list[i].name
    value = list[i].value
    if (dirRE.test(name)) {
      // mark element as dynamic
      el.hasBindings = true
      // modifiers
      modifiers = parseModifiers(name.replace(dirRE, ''))
      // support .foo shorthand syntax for the .prop modifier
      if (process.env.VBIND_PROP_SHORTHAND && propBindRE.test(name)) {
        (modifiers || (modifiers = {})).prop = true
        name = `.` + name.slice(1).replace(modifierRE, '')
      } else if (modifiers) {
        name = name.replace(modifierRE, '')
      }
      if (bindRE.test(name)) { // v-bind
        name = name.replace(bindRE, '')
        value = parseFilters(value)
        isDynamic = dynamicArgRE.test(name)
        if (isDynamic) {
          name = name.slice(1, -1)
        }
        if (modifiers) {
          if (modifiers.prop && !isDynamic) {
            name = camelize(name)
            if (name === 'innerHtml') name = 'innerHTML'
          }
          if (modifiers.camel && !isDynamic) {
            name = camelize(name)
          }
          if (modifiers.sync) {
            syncGen = genAssignmentCode(value, `$event`)
            if (!isDynamic) {
              addHandler(...)
              if (hyphenate(name) !== camelize(name)) {
                addHandler(...)
              }
            } else {
              // handler w/ dynamic event name
              addHandler(...)
            }
          }
        }
        if ((modifiers && modifiers.prop) || (
          !el.component && platformMustUseProp(el.tag, el.attrsMap.type, name)
        )) {
          addProp(el, name, value, list[i], isDynamic)
        } else {
          addAttr(el, name, value, list[i], isDynamic)
        }
      } else if (onRE.test(name)) { // v-on
        name = name.replace(onRE, '')
        isDynamic = dynamicArgRE.test(name)
        if (isDynamic) {
          name = name.slice(1, -1)
        }
        addHandler(el, name, value, modifiers, false, warn, list[i], isDynamic)
      } else { // normal directives
        name = name.replace(dirRE, '')
        // parse arg
        const argMatch = name.match(argRE)
        let arg = argMatch && argMatch[1]
        isDynamic = false
        if (arg) {
          name = name.slice(0, -(arg.length + 1))
          if (dynamicArgRE.test(arg)) {
            arg = arg.slice(1, -1)
            isDynamic = true
          }
        }
        addDirective(el, name, rawName, value, arg, isDynamic, modifiers, list[i])
        if (process.env.NODE_ENV !== 'production' && name === 'model') {
          checkForAliasModel(el, value)
        }
      }
    } else {
      addAttr(el, name, JSON.stringify(value), list[i])
      // #6887 firefox doesn't update muted state if set via attribute
      // even immediately after element creation
      if (!el.component &&
          name === 'muted' &&
          platformMustUseProp(el.tag, el.attrsMap.type, name)) {
        addProp(el, name, 'true', list[i])
      }
    }
  }
}
function parseModifiers (name: string): Object | void {
  const match = name.match(modifierRE)
  if (match) {
    const ret = {}
    match.forEach(m => { ret[m.slice(1)] = true })
    return ret
  }
}
```

对标签属性进行处理，判断当前是指令的话：`dirRE.test(name)`，就会首先通过`parseModified`解析出修饰符，然后判断`onRE.test(name)`或者是`bindRE.test(name)`中的事件，就会使用`addHandler`

```
export function addHandler (
  el: ASTElement,
  name: string,
  value: string,
  modifiers: ?ASTModifiers,
  important?: boolean,
  warn?: ?Function,
  range?: Range,
  dynamic?: boolean
) {
  modifiers = modifiers || emptyObject
  // 1. 根据modified修饰符然后对事件名进行处理
  if (modifiers.right) {
    if (dynamic) {
      name = `(${name})==='click'?'contextmenu':(${name})`
    } else if (name === 'click') {
      name = 'contextmenu'
      delete modifiers.right
    }
  } else if (modifiers.middle) {
    if (dynamic) {
      name = `(${name})==='click'?'mouseup':(${name})`
    } else if (name === 'click') {
      name = 'mouseup'
    }
  }

  // check capture modifier
  if (modifiers.capture) {
    delete modifiers.capture
    name = prependModifierMarker('!', name, dynamic)
  }
  if (modifiers.once) {
    delete modifiers.once
    name = prependModifierMarker('~', name, dynamic)
  }
  if (modifiers.passive) {
    delete modifiers.passive
    name = prependModifierMarker('&', name, dynamic)
  }
// 2. 判断是否是原生事件
  let events
  if (modifiers.native) {
    delete modifiers.native
    events = el.nativeEvents || (el.nativeEvents = {})
  } else {
    events = el.events || (el.events = {})
  }

  const newHandler: any = rangeSetItem({ value: value.trim(), dynamic }, range)
  if (modifiers !== emptyObject) {
    newHandler.modifiers = modifiers
  }
  // 3. 对事件名进行分类，存放到集合中
  const handlers = events[name]
  if (Array.isArray(handlers)) {
    important ? handlers.unshift(newHandler) : handlers.push(newHandler)
  } else if (handlers) {
    events[name] = important ? [newHandler, handlers] : [handlers, newHandler]
  } else {
    events[name] = newHandler
  }

  el.plain = false
}
```

主要是做了以上三件事

所以说在例子内组件`child`得事件对象会有两种：

```
el.events = {
  select: {
    value: 'selectHandler($event)'
  }
}

// 原生事件：
el.nativeEvents = {
  click:{
    value: 'clickHandler($event)',
    modifiers: {
      prevent: true,
    }
  }
}
```

### codegen 阶段处理事件

然后在`codegen`代码生成阶段，会在`genData`函数会根据 AST 元素节点上的 events 和 nativeEvents 生成的 data 数据,代码在：`src\compiler\codegen\index.js`

```
 // event handlers
  if (el.events) {
    data += `${genHandlers(el.events, false)},`
  }
  if (el.nativeEvents) {
    data += `${genHandlers(el.nativeEvents, true)},`
  }


export function genHandlers (
  events: ASTElementHandlers,
  isNative: boolean
): string {
  const prefix = isNative ? 'nativeOn:' : 'on:'
  let staticHandlers = ``
  let dynamicHandlers = ``
  for (const name in events) {
    const handlerCode = genHandler(events[name])
    if (events[name] && events[name].dynamic) {
      dynamicHandlers += `${name},${handlerCode},`
    } else {
      staticHandlers += `"${name}":${handlerCode},`
    }
  }
  staticHandlers = `{${staticHandlers.slice(0, -1)}}`
}
```

在这里，`genhandlers`对我们前面的`events`进行遍历，然后调用`genHandler(events[name])`

```
function genHandler (handler: ASTElementHandler | Array<ASTElementHandler>): string {
  if (!handler) {
    return "function(){}";
  }

  if (Array.isArray(handler)) {
    return `[${handler.map((handler) => genHandler(handler)).join(",")}]`;
  }

  const isMethodPath = simplePathRE.test(handler.value);
  const isFunctionExpression = fnExpRE.test(handler.value);
  const isFunctionInvocation = simplePathRE.test(
    handler.value.replace(fnInvokeRE, "")
  );

  /**
   *
   * click:{
    value: 'clickHandler($event)',
    modifiers: {
      prevent: true,
    }
  }
  */

  if (!handler.modifiers) {
    if (isMethodPath || isFunctionExpression) {
      return handler.value;
    }
    /* istanbul ignore if */
    if (__WEEX__ && handler.params) {
      return genWeexHandler(handler.params, handler.value);
    }
    return `function($event){${
      isFunctionInvocation ? `return ${handler.value}` : handler.value
    }}`; // inline statement
  } else {
    let code = "";
    let genModifierCode = "";
    const keys = [];
    for (const key in handler.modifiers) {
      if (modifierCode[key]) {
        genModifierCode += modifierCode[key];
        // left/right
        if (keyCodes[key]) {
          keys.push(key);
        }
      } else if (key === "exact") {
        const modifiers: ASTModifiers = (handler.modifiers: any);
        genModifierCode += genGuard(
          ["ctrl", "shift", "alt", "meta"]
            .filter((keyModifier) => !modifiers[keyModifier])
            .map((keyModifier) => `$event.${keyModifier}Key`)
            .join("||")
        );
      } else {
        keys.push(key);
      }
    }
    if (keys.length) {
      code += genKeyFilter(keys);
    }
    // Make sure modifiers like prevent and stop get executed after key filtering
    if (genModifierCode) {
      code += genModifierCode;
    }
    const handlerCode = isMethodPath
      ? `return ${handler.value}.apply(null, arguments)`
      : isFunctionExpression
      ? `return (${handler.value}).apply(null, arguments)`
      : isFunctionInvocation
      ? `return ${handler.value}`
      : handler.value;
    /* istanbul ignore if */
    if (__WEEX__ && handler.params) {
      return genWeexHandler(handler.params, code + handlerCode);
    }
    return `function($event){${code}${handlerCode}}`;
  }
}
```

这里的逻辑

1. 如果不存在事件，那么就返回一个空函数
2. 如果传入的 event 是一个数组，那么需要对里面的所有内容循环进行设置
3. 如果他没有修饰符`modifiers`,那么就会跟据他是否被调用返回一个函数包裹`value`,也就是：`function($event){selectHandler($event)}`或者是`selectHandler($event)`
4. 如果存在修饰符`modifiers`，那么就需要根据`modifierCode`匹配出对应的函数，然后和`handler.value`，进行拼接起来

```
const modifierCode: { [key: string]: string } = {
  stop: "$event.stopPropagation();",
  prevent: "$event.preventDefault();",
  self: genGuard(`$event.target !== $event.currentTarget`),
  ctrl: genGuard(`!$event.ctrlKey`),
  shift: genGuard(`!$event.shiftKey`),
  alt: genGuard(`!$event.altKey`),
  meta: genGuard(`!$event.metaKey`),
  left: genGuard(`'button' in $event && $event.button !== 0`),
  middle: genGuard(`'button' in $event && $event.button !== 1`),
  right: genGuard(`'button' in $event && $event.button !== 2`),
};
const genGuard = (condition) => `if(${condition})return null;`;
```

所以在`genHandler`中得到了类似`select:function($event){selectHandler($event)}`，然后可以看到`const prefix = isNative ? "nativeOn:" : "on:";`

```
if (dynamicHandlers) {
    return prefix + `_d(${staticHandlers},[${dynamicHandlers.slice(0, -1)}])`;
  } else {
    return prefix + staticHandlers;
  }
```

最后构建完，在例子中可以得到：

```
{
  on:{
    select:function($event){selectHandler($event)}
  },
  nativeOn:{
    click:function($event){$event.preventDefault();clickHandler($event)}
  }
}
```

这样就构建了一个`boundles`等待着执行

### 原生 DOM 事件

在`patch`过程中的创建阶段和更新阶段都会执行`updateDOMListeners`:

```
function updateDOMListeners (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
    return
  }
  const on = vnode.data.on || {}
  const oldOn = oldVnode.data.on || {}
  target = vnode.elm
  normalizeEvents(on)
  updateListeners(on, oldOn, add, remove, createOnceHandler, vnode.context)
  target = undefined
}


```

1. target 是当前`vnode`对应的 DOM 对象
2. `normalizeEvents`主要是对`v-model`相关的处理
3. `updateListeners(on, oldOn, add, remove, createOnceHandler, vnode.context)`

```
// core\vdom\helpers\update-listeners.js
export function updateListeners (
  on: Object,
  oldOn: Object,
  add: Function,
  remove: Function,
  createOnceHandler: Function,
  vm: Component
) {
  let name, def, cur, old, event
  for (name in on) {
    def = cur = on[name]
    old = oldOn[name]
    event = normalizeEvent(name)
    /* istanbul ignore if */
    if (__WEEX__ && isPlainObject(def)) {
      cur = def.handler
      event.params = def.params
    }
    if (isUndef(cur)) {
      。。。
    } else if (isUndef(old)) {
      if (isUndef(cur.fns)) {
        cur = on[name] = createFnInvoker(cur, vm)
      }
      if (isTrue(event.once)) {
        cur = on[name] = createOnceHandler(event.name, cur, event.capture)
      }
      add(event.name, cur, event.capture, event.passive, event.params)
    } else if (cur !== old) {
      old.fns = cur
      on[name] = old
    }
  }
  for (name in oldOn) {
    if (isUndef(on[name])) {
      event = normalizeEvent(name)
      remove(event.name, oldOn[name], event.capture)
    }
  }
}
```

根据事件名的一些特殊标识（addHandler 加入的）来判断出事件中是否有：`once`，`capture`，`passive`等修饰符

处理完事件后，又对事件回调函数做处理

```
for (name in on) {
    def = cur = on[name]
    old = oldOn[name]
    event = normalizeEvent(name)
    /* istanbul ignore if */
    if (__WEEX__ && isPlainObject(def)) {
      cur = def.handler
      event.params = def.params
    }
    if (isUndef(cur)) {
      ...
    } else if (isUndef(old)) {
      if (isUndef(cur.fns)) {
        cur = on[name] = createFnInvoker(cur, vm)
      }
      if (isTrue(event.once)) {
        cur = on[name] = createOnceHandler(event.name, cur, event.capture)
      }
      add(event.name, cur, event.capture, event.passive, event.params)
    } else if (cur !== old) {
      old.fns = cur
      on[name] = old
    }
  }
```

在这里主要是遍历`on`然后通过`add`来添加事件监听，遍历`oldOn`通过`remove`来移除事件的监听。
在遍历`on`的时候，调用了`normalizeEvent`对`on`里面的`key`值

```
function add (
  name: string,
  handler: Function,
  capture: boolean,
  passive: boolean
) {
  if (useMicrotaskFix) {
    const attachedTimestamp = currentFlushTimestamp
    const original = handler
    handler = original._wrapper = function (e) {
      if (

        e.target === e.currentTarget ||
        e.timeStamp >= attachedTimestamp ||

        e.timeStamp <= 0 ||
        // #9448 bail if event is fired in another document in a multi-page
        // electron/nw.js app, since event.timeStamp will be using a different
        // starting reference
        e.target.ownerDocument !== document
      ) {
        return original.apply(this, arguments)
      }
    }
  }
  target.addEventListener(
    name,
    handler,
    supportsPassive
      ? { capture, passive }
      : capture
  )
}

function remove (
  name: string,
  handler: Function,
  capture: boolean,
  _target?: HTMLElement
) {
  (_target || target).removeEventListener(
    name,
    handler._wrapper || handler,
    capture
  )
}
```

可以看到`add`是通过`addEventListener`来实现事件的绑定，`remove`通过`removeEventListener`的`API`

### 自定义事件

如果要在组件上使用原生事件，就必须要加上`native`,在普通元素上使用`.native`
所以需要在组件相关的代码上找对应的事件的痕迹：

```

export function createComponent (
  Ctor: Class<Component> | Function | Object | void,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag?: string
): VNode | Array<VNode> | void {
  ...
  const listeners = data.on
  data.on = data.nativeOn

  if (isTrue(Ctor.options.abstract)) {
    const slot = data.slot
    data = {}
    if (slot) {
      data.slot = slot
    }
  }
  installComponentHooks(data)

  // return a placeholder vnode
  const name = Ctor.options.name || tag
  const vnode = new VNode(
    `vue-component-${Ctor.cid}${name ? `-${name}` : ''}`,
    data, undefined, undefined, undefined, context,
    { Ctor, propsData, listeners, tag, children },
    asyncFactory
  )
  if (__WEEX__ && isRecyclableComponent(vnode)) {
    return renderRecyclableComponentTemplate(vnode)
  }

  return vnode
}

```

在这里`const listeners = data.on`以及将`data.on = data.nativeOn`,这样所有的自定义事件都在`listeners`传入到组件内了，`listeners`作为`VNode`的`componentOptions`被传入了实例中，而在组件初始化的过程中，会执行`initInternalComponent`:

```
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {


  const vnodeComponentOptions = parentVnode.componentOptions
  opts._parentListeners = vnodeComponentOptions.listeners


}
```

然后在`initEvent`得过程中，会处理`listeners`

```
export function initEvents (vm: Component) {
  vm._events = Object.create(null)
  vm._hasHookEvent = false
  // init parent attached events
  const listeners = vm.$options._parentListeners
  if (listeners) {
    updateComponentListeners(vm, listeners)
  }
}


export function updateComponentListeners (
  vm: Component,
  listeners: Object,
  oldListeners: ?Object
) {
  target = vm
  updateListeners(listeners, oldListeners || {}, add, remove, createOnceHandler, vm)
  target = undefined
}
```

在这里调用了`updateListeners`

```
export function updateListeners (
  on: Object,
  oldOn: Object,
  add: Function,
  remove: Function,
  createOnceHandler: Function,
  vm: Component
) {
  let name, def, cur, old, event
  for (name in on) {
    def = cur = on[name]
    old = oldOn[name]
    event = normalizeEvent(name)
    /* istanbul ignore if */
    if (__WEEX__ && isPlainObject(def)) {
      cur = def.handler
      event.params = def.params
    }
    if (isUndef(cur)) {
     ...
    } else if (isUndef(old)) {
      if (isUndef(cur.fns)) {
        cur = on[name] = createFnInvoker(cur, vm)
      }
      if (isTrue(event.once)) {
        cur = on[name] = createOnceHandler(event.name, cur, event.capture)
      }
      add(event.name, cur, event.capture, event.passive, event.params)
    } else if (cur !== old) {
      old.fns = cur
      on[name] = old
    }
  }
  for (name in oldOn) {
    if (isUndef(on[name])) {
      event = normalizeEvent(name)
      remove(event.name, oldOn[name], event.capture)
    }
  }
}
```

首先对新的事件集合`on`进行遍历,对不在老得集合得事件，执行`add(event.name, cur, event.capture, event.passive, event.params)`，同时对`oldOn`判断是否在新的事件集合中，然后对不在得事件进行移除`remove(event.name, oldOn[name], event.capture)`，所以重要得还是这两个方法：`add`以及`remove`

```
function add (event, fn, once) {
  if (once) {
    target.$once(event, fn)
  } else {
    target.$on(event, fn)
  }
}

function remove (event, fn) {
  target.$off(event, fn)
}
```

在`updateComponentListeners`中可以知道，target 也就是`vm`,

```
export function eventsMixin (Vue: Class<Component>) {
  const hookRE = /^hook:/
  Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    const vm: Component = this
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$on(event[i], fn)
      }
    } else {
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      if (hookRE.test(event)) {
        vm._hasHookEvent = true
      }
    }
    return vm
  }

  Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this
    function on () {
      vm.$off(event, on)
      fn.apply(vm, arguments)
    }
    on.fn = fn
    vm.$on(event, on)
    return vm
  }

  Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
    const vm: Component = this
    // all
    if (!arguments.length) {
      vm._events = Object.create(null)
      return vm
    }
    // array of events
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$off(event[i], fn)
      }
      return vm
    }
    // specific event
    const cbs = vm._events[event]
    if (!cbs) {
      return vm
    }
    if (!fn) {
      vm._events[event] = null
      return vm
    }
    // specific handler
    let cb
    let i = cbs.length
    while (i--) {
      cb = cbs[i]
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1)
        break
      }
    }
    return vm
  }

  Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    let cbs = vm._events[event]
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      const args = toArray(arguments, 1)
      const info = `event handler for "${event}"`
      for (let i = 0, l = cbs.length; i < l; i++) {
        invokeWithErrorHandling(cbs[i], vm, args, vm, info)
      }
    }
    return vm
  }
}
```

用户自己定义得方法可以利用得这几个 API 进行事件通信

这里是一个事件中心得实现，把所有的事件用`vm._events`储存起来，当执行`vm.$on(event,fn)`，就会按照事件的名称把回调函数存储起来` (vm._events[event] || (vm._events[event] = [])).push(fn)`,然后当我们执行`$emit`的时候，就会将`_events`里面存储的对应的`event`名字的回调函数，拿出来全部执行。然后当执行`vm.$off`就会移除对应的事件名，和指定的`fn`,而`$once`就是在调用了一次`$once`了之后，执行了一次`$off`移除了对应的回调函数，保证了回调函数，只会执行一次
