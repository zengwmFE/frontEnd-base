## props

在初始化`props`之前，要对`props`进行一次`normalize`，它发生在`mergeOptions`得时候在`core\util\options.js`，然后再`normalizeProps`进行一次

```
function normalizeProps (options: Object, vm: ?Component) {
  const props = options.props
  if (!props) return
  const res = {}
  let i, val, name
  if (Array.isArray(props)) {
    i = props.length
    while (i--) {
      val = props[i]
      if (typeof val === 'string') {
        name = camelize(val)
        res[name] = { type: null }
      } else if (process.env.NODE_ENV !== 'production') {
        warn('props must be strings when using array syntax.')
      }
    }
  } else if (isPlainObject(props)) {
    for (const key in props) {
      val = props[key]
      name = camelize(key)
      res[name] = isPlainObject(val)
        ? val
        : { type: val }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `Invalid value for option "props": expected an Array or an Object, ` +
      `but got ${toRawType(props)}.`,
      vm
    )
  }
  options.props = res
}
```

`mergeOptions`的功能主要是处理定义组件的对象`options`，然后挂载到全局属性`this.$options`，这个函数主要是对人工写的`props`的格式进行标准化成对象。因为**`props`除了能写成对象，还能被定义成数组**

1. 当 props 是一个数组的时候，内部属性必须是字符串，否则就报错。而且对里面的属性转成驼峰式，同时设置`type`为空
2. 当 props 是一个对象的时候，就会将属性转成驼峰

也就是说如果是数组：`['name','age']`就会被转成

```
options = {
  name: {
    type: null
  },
  age: {
    type: null
  }
}


```

如果是对象，

```
props = {
  name: String,
  age: Number
}
```

也会被转成：

```
options = {
  name: {
    type: String
  },
  age: {
    type: Number
  }
}
```

### Props 的初始化

```

function initProps (vm: Component, propsOptions: Object) {
  const propsData = vm.$options.propsData || {}
  const props = vm._props = {}
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  const keys = vm.$options._propKeys = []
  const isRoot = !vm.$parent
  // root instance props should be converted
  if (!isRoot) {
    toggleObserving(false)
  }
  for (const key in propsOptions) {
    keys.push(key)
    const value = validateProp(key, propsOptions, propsData, vm)
    /* istanbul ignore else */
    defineReactive(props, key, value)
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    if (!(key in vm)) {
      proxy(vm, `_props`, key)
    }
  }
  toggleObserving(true)
}
```

这里循环执行了：

1. 调用 defineReactive，定义好`getter`和`setter`，为之后的依赖收集和派发更新做准备
2. 同时判断了当前属性是否在`vm`中，如果不在，那么调用 proxy，将这个属性，从`_props`挂到`vm`下，便于访问

上面讲的是符合`validateProp`规范的，利用`validateProp`对`props`进行了判断,方法被定义在了`core\util\props.js`:

```
export function validateProp (
  key: string,
  propOptions: Object,
  propsData: Object,
  vm?: Component
): any {
  const prop = propOptions[key]
  const absent = !hasOwn(propsData, key)
  let value = propsData[key]
  // boolean casting
  const booleanIndex = getTypeIndex(Boolean, prop.type)
  if (booleanIndex > -1) {
    if (absent && !hasOwn(prop, 'default')) {
      value = false
    } else if (value === '' || value === hyphenate(key)) {
      // only cast empty string / same name to boolean if
      // boolean has higher priority
      const stringIndex = getTypeIndex(String, prop.type)
      if (stringIndex < 0 || booleanIndex < stringIndex) {
        value = true
      }
    }
  }
  // check default value
  if (value === undefined) {
    value = getPropDefaultValue(vm, prop, key)
    // since the default value is a fresh copy,
    // make sure to observe it.
    const prevShouldObserve = shouldObserve
    toggleObserving(true)
    observe(value)
    toggleObserving(prevShouldObserve)
  }
  if (
    process.env.NODE_ENV !== 'production' &&
    // skip validation for weex recycle-list child component props
    !(__WEEX__ && isObject(value) && ('@binding' in value))
  ) {
    assertProp(prop, key, value, vm, absent)
  }
  return value
}

```

`validateProps`主要是做了 3 件事：

1. 处理了`Boolean`的数据
2. 处理默认数据
3. props 断言

#### 处理 Boolean 数据

```
  const booleanIndex = getTypeIndex(Boolean, prop.type)
  if (booleanIndex > -1) {
    if (absent && !hasOwn(prop, 'default')) {
      value = false
    } else if (value === '' || value === hyphenate(key)) {
      // only cast empty string / same name to boolean if
      // boolean has higher priority
      const stringIndex = getTypeIndex(String, prop.type)
      if (stringIndex < 0 || booleanIndex < stringIndex) {
        value = true
      }
    }
  }
```

首先通过`getTypeIndex`的返回值判断是这个值是否是一个`Boolean`类型

#### 处理默认数据

```
if (value === undefined) {
    value = getPropDefaultValue(vm, prop, key)
    // since the default value is a fresh copy,
    // make sure to observe it.
    const prevShouldObserve = shouldObserve
    toggleObserving(true)
    observe(value)
    toggleObserving(prevShouldObserve)
  }
```

在很多情况下，我们并没有设置一个`default`的属性：

```
props: {
  name: String,
  age: {
    type: Boolean
  }
}
```

例如这些情况，vue 需要自动匹配上一个合适的 value 值，可以看到这个`getPropDefaultValue`就是获取默认值的：

```
function getPropDefaultValue (vm: ?Component, prop: PropOptions, key: string): any {
  // no default, return undefined
  if (!hasOwn(prop, 'default')) {
    return undefined
  }
  const def = prop.default
  // the raw prop value was also undefined from previous render,
  // return previous default value to avoid unnecessary watcher trigger
  if (vm && vm.$options.propsData &&
    vm.$options.propsData[key] === undefined &&
    vm._props[key] !== undefined
  ) {
    return vm._props[key]
  }
  // call factory function for non-Function types
  // a value is Function if its prototype is function even across different execution context
  return typeof def === 'function' && getType(prop.type) !== 'Function'
    ? def.call(vm)
    : def
}
```

在这里可以看到，判断了有没有定义`default`，没有定义，那么就直接返回`undefined`,结合之前的`Boolean`，那么就可以知道，除了`Boolean`其他类型，如果没有传入，在没有`default`的情况下，就会被赋值成`undefined`。如果上一次渲染的值就是`undefined`的时候，那么就直接返回上一次给的值。避免不必要的`watcher`触发。要么就根据`def`是函数以及判断类型不是`Function`，去执行`def.call(vm)`还是`def`

因为在类型为`Array`或者`Object`等情况时，可以写成:

```
props: {
  type: Array,
  default: ()=>[]
}
```

这个时候需要去执行这个`def`而得到`[]`这个默认值

#### props 断言

```
if (
    process.env.NODE_ENV !== 'production' &&
    // skip validation for weex recycle-list child component props
    !(__WEEX__ && isObject(value) && ('@binding' in value))
  ) {
    assertProp(prop, key, value, vm, absent)
  }

  function assertProp (
  prop: PropOptions,
  name: string,
  value: any,
  vm: ?Component,
  absent: boolean
) {
  if (prop.required && absent) {
    warn(
      'Missing required prop: "' + name + '"',
      vm
    )
    return
  }
  if (value == null && !prop.required) {
    return
  }
  let type = prop.type
  let valid = !type || type === true
  const expectedTypes = []
  if (type) {
    if (!Array.isArray(type)) {
      type = [type]
    }
    for (let i = 0; i < type.length && !valid; i++) {
      const assertedType = assertType(value, type[i])
      expectedTypes.push(assertedType.expectedType || '')
      valid = assertedType.valid
    }
  }

  if (!valid) {
    warn(
      getInvalidTypeMessage(name, value, expectedTypes),
      vm
    )
    return
  }
  const validator = prop.validator
  if (validator) {
    if (!validator(value)) {
      warn(
        'Invalid prop: custom validator check failed for prop "' + name + '".',
        vm
      )
    }
  }
}
```

就是针对于不同情况去，进行警告信息

### Props 更新

当父组件传递给子组件的`props`的值发生改变的时候，子组件对应的值也会发生改变，同时触发子组件的重新渲染

#### 子组件重新更新

子组件的 props，是在父组件进行声明，然后在父组件进行更改的，在更改的时候，就会触发父组件的重新渲染，那么他是怎么从父组件的重新渲染，从而通知到子组件的 props 的更新的。

在父组件的更新的最后，会执行`patch`，然后执行`patchVnode`去，这个过程是一个递归的过程，当遇到是组件`vnode`的时候，会执行组件更新过程中的`prepatch`钩子函数,

```
if (isDef(data) && isDef((i = data.hook)) && isDef((i = i.prepatch))) {
      i(oldVnode, vnode);
}
```

`prepatch`函数调用了`updateChildComponent`：

```
  prepatch (oldVnode: MountedComponentVNode, vnode: MountedComponentVNode) {
    const options = vnode.componentOptions
    const child = vnode.componentInstance = oldVnode.componentInstance
    updateChildComponent(
      child,
      options.propsData, // updated props
      options.listeners, // updated listeners
      vnode, // new parent vnode
      options.children // new children
    )
  },

```

来更新子组件，可以有`vnode.componentOptions.propsData`这个跟更新`props`有关，那么就需要着重看一下这个值是什么！在创建`vnode`的时候（`createComponent`）,会将`propsData`传入`VNode`的构造函数

```
 const vnode = new VNode(
    `vue-component-${Ctor.cid}${name ? `-${name}` : ''}`,
    data, undefined, undefined, undefined, context,
    { Ctor, propsData, listeners, tag, children },
    asyncFactory
  )

// class Vnode

 this.componentOptions = componentOptions
```

也就是说这个`componentOptions`存在有一个`propsData`存放了更新的`propsData`,那他要怎样根据父组件更新的 props 来通知到

```
// updateChildComponent函数 core\instance\lifecycle.js
  // update props
  if (propsData && vm.$options.props) {
    toggleObserving(false)
    const props = vm._props
    const propKeys = vm.$options._propKeys || []
    for (let i = 0; i < propKeys.length; i++) {
      const key = propKeys[i]
      const propOptions: any = vm.$options.props // wtf flow?
      props[key] = validateProp(key, propOptions, propsData, vm)
    }
    toggleObserving(true)
    // keep a copy of raw propsData
    vm.$options.propsData = propsData
  }
```
