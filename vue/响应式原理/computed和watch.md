### computed 属性

计算属性得初始化在 Vue 实例初始化阶段的 initState 函数中

```
if (opts.computed) initComputed(vm, opts.computed)
```

initComputed 的定义在：

```
const computedWatcherOptions = { computed: true }
function initComputed (vm: Component, computed: Object) {
  const watchers = vm._computedWatchers = Object.create(null)
  // computed properties are just getters during SSR
  const isSSR = isServerRendering()

  for (const key in computed) {
    const userDef = computed[key]
    const getter = typeof userDef === 'function' ? userDef : userDef.get
    if (!isSSR) {
      // create internal watcher for the computed property.
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
      )
    }

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    if (!(key in vm)) {
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      }
    }
  }
}
```

首先看一下我们正常使用 computed 的用法,结合用法来分析源码：

```
var vm = new Vue({
  el: '#example',
  data: {
    message: 'Hello'
  },
  computed: {
    // 计算属性的 getter
    reversedMessage: function () {
      // `this` 指向 vm 实例
      return this.message.split('').reverse().join('')
    },

  }
})
```

#### 解析过程

函数首先创建`_computedWatchers`为空对象，然后将所有`computed`对象做遍历，拿到计算属性中函数或者变量，得到`userRef`或者变量的`get`属性，然后判断了是否是`ssr`,不是的话的就需要实例化`Watcher`,这个 watcher 和渲染的`watcher`有很大的区别，我们看到最后将`computedWatcherOptions`传入

接着判断了，computed 属性在`vm`是否存在，在之前的分析中，我们知道是将`vm.computed.xxx`赋值给`vm`，则调用`defineComputed(vm,key,user)`

```
export function defineComputed (
  target: any,
  key: string,
  userDef: Object | Function
) {
  const shouldCache = !isServerRendering()
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef)
    sharedPropertyDefinition.set = noop
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop
    sharedPropertyDefinition.set = userDef.set || noop
  }
  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}
```

这段代码主要是使用`Object.defineProperty`给计算属性对应的 key 添加了`getter`和`setter`,正常来说，`setter`需要是拥有`set`属性的时候才有，否则就会是一个空函数。

#### get

在 userRef 是一个函数的时候，getter 就会是`createComputedGetter`

```
function createComputedGetter (key) {
  return function computedGetter () {
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate()
      }
      if (Dep.target) {
        watcher.depend()
      }
      return watcher.value
    }
  }
}
```

可以看到是返回了一个`computedGetter`，在函数里面获取了`watcher.value`

在这里我们可以看到这里都是用`computedWatcher`而不是`watcher`，那么这两个有什么区别呢？
例子：

```
var vm = new Vue({
  data: {
    firstName: 'Foo',
    lastName: 'Bar'
  },
  computed: {
    fullName: function () {
      return this.firstName + ' ' + this.lastName
    }
  }
})
```

可以在`computedWatcher`的构造过程就能看到，构造 computedWatcher 有点不一样

```
 this.value = this.lazy ? undefined : this.get();
```

因为

```
const computedWatcherOptions = { lazy: true }
```

在这里，computedWatcherOptions 的`lazy`属性被定义成了 true，所以`watcher`的 value 值是个`undefined`

**当我们访问 fullName**，就会触发计算属性对应的`watcher`

```
if (Dep.target) {
  watcher.depend()
}
 if (watcher.dirty) {
    watcher.evaluate()
  }
```

在之前的操作中，我们可以总结到`watcher`的`depend`是调用了`Watcher`类的`addDep`

```
 addDep (dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }
```

即将这个进行了依赖收集，即**渲染 watcher**订阅了`computedWatcher`的变化,接着进行了`watcher.evaluate()`，得到` this.value = this.get();`，最后返回了`watcher.value`,也就是得到了`computed`的值

前面讲的是`getter的过程`，那么再讲讲 setter 的过程
当我们修改了`computed`的 key 值时候，就会通知订阅了他的`watcher`的更新,然后执行`watch`的`update`

```
update() {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true;
    } else if (this.sync) {
      this.run();
    } else {
      queueWatcher(this);
    }
  }
```

如果`this.lazy`,则表示当前是一个懒加载模式，正常来说我们例子都是走的同步的，所以会执行`this.run`

```
 run() {
    if (this.active) {
      const value = this.get();
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value;
        this.value = value;
        if (this.user) {
          try {
            this.cb.call(this.vm, value, oldValue);
          } catch (e) {
            handleError(
              e,
              this.vm,
              `callback for watcher "${this.expression}"`
            );
          }
        } else {
          this.cb.call(this.vm, value, oldValue);
        }
      }
    }
  }
```

在这里 run 函数会重新计算，`value !== this.value`，比较新旧值，如果发生了变化则调用`this.cb.call(this.vm, value, oldValue)`，这个`cb`就是`this.dep.notify()`,即触发了渲染`watcher`重新渲染

有个注意的点，在每次执行`notify`的时候，会将`this.dirty`这个属性置为`true`,这样也就能让

```
if (watcher.dirty) {
    watcher.evaluate()
  }
```

这句能生效,获取到这一次的`value`

```
  evaluate() {
    this.value = this.get();
    this.dirty = false;
  }
```

### watch

侦听属性的初始化也是发生在 Vue 的实例初始化阶段`initState`:

```
if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
function initWatch (vm: Component, watch: Object) {
  for (const key in watch) {
    const handler = watch[key]
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
  }
}
```

首先遍历`watch`，得到每个 watch 属性，如果他是一个数组，那么就需要循环进行创建`watcher`,反之则直接创建：

```
export function isPlainObject (obj: any): boolean {
  return _toString.call(obj) === '[object Object]'
}
function createWatcher (
  vm: Component,
  expOrFn: string | Function,
  handler: any,
  options?: Object
) {
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  if (typeof handler === 'string') {
    handler = vm[handler]
  }
  return vm.$watch(expOrFn, handler, options)
}
```

在这里调用了`$watch`方法，来注册监听，这种全局方法一般是通过`mixin`注册的，我们可以在`stateMixin`找到这个方法

```
\core\instance\state.js
Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    const vm: Component = this
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options)
    }
    options = options || {}
    options.user = true
    const watcher = new Watcher(vm, expOrFn, cb, options)
    if (options.immediate) {
      try {
        cb.call(vm, watcher.value)
      } catch (error) {
        handleError(error, vm, `callback for immediate watcher "${watcher.expression}"`)
      }
    }
    return function unwatchFn () {
      watcher.teardown()
    }
  }

```

在这里判断了`cb`是否是`object`,因为`$watch`作为一个全局方法，使的用户在外部也能正常使用，所以需要在这里进行一次`createWatcher`,然后`const watcher = new Watcher(vm, expOrFn, cb, options)`初始化了一个`watcher`,所以当我们数据发生改变的时候，就会执行 watcher 的`update`，也就是`this.run`方法，也就是调用了回调函数，返回`newValue`和`oldValue`
在最后处理中，可以看到判断了`options.immediate`，如果是`true`这直接回调用`cb.call(vm.watcher.value)`，获取了值。然后再最后执行了`unwatchFn`,执行`watcher.teardown`来实现对这个监听进行移除

### watcher options

```
if (options) {
      this.deep = !!options.deep;
      this.user = !!options.user;
      this.lazy = !!options.lazy;
      this.sync = !!options.sync;
      this.before = options.before;
    } else {
      this.deep = this.user = this.lazy = this.sync = false;
    }
```

`watcer`总共有 4 种配置选项

#### deep

通常需要对对象进行深层次的侦测的时候，就需要对`deep`设置为`true`:

```

    let vm = new Vue({
      el: '#app',
      data(){
        return {
          message: {
            name: 'hello zeng'
          }
        }
      },
      watch: {
        message: {
          handler(newValue){
            console.log(newValue)
          }
        }
      }
    })

    vm.message.name = 'hello ming'
```

可以看到这个时候`handler`里面是不会打印出来的：这里是因为在设置了`watcher`的时候，仅仅是对`message`的设置了`getter`和`set`，所以当更改了`name`的时候，只能触发`name`的`setter`,但是，因为没有对应可以通知的对象，所以也就无法触发回调函数,其实我们知道增加一个`deep:true`就能实现深层次的监听

```
 message: {
          deep: true,
          handler(newValue){
            console.log(newValue)
          }
  }
```

来看下`watch`里面对这里的处理：

```
if (this.deep) {
    traverse(value);
}
```

`traverse`代码被定义在:`core\observer\traverse.js`

```
export function traverse (val: any) {
  _traverse(val, seenObjects)
  seenObjects.clear()
}
function _traverse (val: any, seen: SimpleSet) {
  let i, keys
  const isA = Array.isArray(val)
  if ((!isA && !isObject(val)) || Object.isFrozen(val) || val instanceof VNode) {
    return
  }
  if (val.__ob__) {
    const depId = val.__ob__.dep.id
    if (seen.has(depId)) {
      return
    }
    seen.add(depId)
  }
  if (isA) {
    i = val.length
    while (i--) _traverse(val[i], seen)
  } else {
    keys = Object.keys(val)
    i = keys.length
    while (i--) _traverse(val[keys[i]], seen)
  }
}
```

在这里对对象进行了一个深层递归访问了，在进行了遍历，就是使用了属性的`getter`，也就触发了依赖收集。在这里往`seenObjects`内添加了子对象的`depId`,利用`Set`属性唯一性的原则，首先避免了重复添加，也可以避免重复访问

#### user

这个变量用来判断是否是用户主动通过`this.$watch`来创建一个`watch`属性，这个属性就是防止了用户使用这个方法的时候报错，所以增加了了容错处理

#### sync watcher

在响应式对象发生变化时，就会触发响应式对象得`setter`，就会触发`dep.notify()`,也就会派发更新,执行`update`

```
update() {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true;
    } else if (this.sync) {
      this.run();
    } else {
      queueWatcher(this);
    }
  }
```

如果我们没有设置`sync`和`lazy`为 false 得时候，就会执行`queueWatcher`,将这个放入到`queue`,等到`nextTick`得时候就会执行之前所有的更新。但是如果设置了`sync`就会直接执行`this.run`进行更新的派发
