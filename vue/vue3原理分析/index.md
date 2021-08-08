## vue3 的变更点

### Proxy

为什么要做这些优化

1. 充分利用起来 js 新特性的性能优化的亮点 ，拦截整个对象，好处：这样就不用去遍历整个对象的 key

缺点：

1. 深度嵌套对象，不能够识别
2. 数组会导致多次的`get` ，`set`

```javascript
var a = {
  a: 1,
  b: 2,
};

var p = new Proxy(a, {
  get(target, key, receiver) {
    console.log("get 获取值");
    return Reflect.get(target, key, receiver);
  },
  set(target, key, value, receiver) {
    console.log("set 设置值");
    return Reflect.set(target, key, value, receiver);
  },
});
```

这样就能直接进行设置值了

### vue 架构设计

由于`vue2`很多`Api`是挂载到 vue 的实例上面的，导致 vue 无法进行 tree shaking。所以 vue 提供了`runtime`以及`runtime+compiler`的包。
基于这一点,vue3 中进行了分包，分模块，即衍生出了`compositionApi`

### vue3 优化

vue2 编译时，静态节点优化/正则匹配（回溯）

vue3

1. 静态节点（静态节点提升 ）
2. 静态节点字符串化,如果同时遇到很多的静态节点的话，vue3 在编译的时候，会直接把这部分静态节点当成字符串一起创建，然后进行节点提升
3. 动态 blockTree/动态标记
4. 状态机的编译模式,省去了大量的回溯的时间，直接由状态机，从分完词的数组进行选择，来进行状态的转换，实现 AST->render

不像之前的`vue2`的语法，如果再次进行语法扩展，难度高，需要在正则的匹配项上面继续增加一种匹配方式，影响大

#### 动态 blockTree/动态标记

```html
<div id="app">
  <p>周一了</p>
  <p>周二了</p>
  <div> <!-- 节点1 -->
    <div>
      <p class="aaa">{{a}}</p>
    </div>
    <div>
      <p class="bbb">{{state}}</p>
    </div>
  </div>
</div>
```
节点1不为静态节点，那么进行domdiff的时候，就要去一步一步比较内部里面的动态节点，还要去一个一个比较`attribute`.`vue3`做出优化：
1. _createElementBlock创建一个为blockTree，同时在根创建了一个为`dynamicChildren`的内容来保存这些为`blockTree`的节点
2. _createElementVNode("p", _hoisted_4, _toDisplayString(_ctx.a), 1 /* TEXT */)，最后这个`1`(patchFlag)告诉这个节点属于`blockTree`

```
export const enum PatchFlags {
  TEXT = 1,
  CLASS = 1 << 1,
  STYLE = 1 << 2,
  PROPS = 1 << 3,
  FULL_PROPS = 1 << 4,
  HYDRATE_EVENTS = 1 << 5,
  STABLE_FRAGMENT = 1 << 6,
  KEYED_FRAGMENT = 1 << 7,
  UNKEYED_FRAGMENT = 1 << 8,
  NEED_PATCH = 1 << 9,
  DYNAMIC_SLOTS = 1 << 10,
  DEV_ROOT_FRAGMENT = 1 << 11,
  HOISTED = -1,
  BAIL = -2

}

```
当`patchFlag`大于0的时候，就会被认为是一个`blockTree`,然后存放到`dynamicChildren`。
当`domDiff`的时候，就会直接从`dynamicChildren`中进行循环遍历，然后反馈到原节点 

```
const vnode = {
    dynamicChildren: [
        {tag: 'p',children: ctx.a,patchFlag: 1},
        {tag: 'p',children: ctx.state,patchFlag: 1}
    ]
}
```
但是如果遇到`v-for`或者`v-if`,由于无法定位到那个被去除了，就只能通过回退到`domdiff`来判断那个子节点发生了删除



**vue3 使用 lerna 用不同的包来管理多个项目**
