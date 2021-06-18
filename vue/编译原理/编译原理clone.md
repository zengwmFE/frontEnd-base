```
export const createCompiler = createCompilerCreator(function baseCompile(
  template: string,
  options: CompilerOptions
): CompiledResult {
  const ast = parse(template.trim(), options);
  console.log("parse", ast);
  if (options.optimize !== false) {
    optimize(ast, options);
  }
  console.log("optimize", ast);
  const code = generate(ast, options);
  console.log("generate", ast);
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns,
  };
});
```

这段代码就告诉了我们对应生成`render`和`staticRenderFns`的方法

1. 看到`parse`方法，可以看到，这里使用了`parseHTML`的过程，将整个`HTML`进行遍历

- 根据开头是否是`<`,来判断是注释，`IE条件注释`
- `Doctype`
- 结束符号
- 开始符号，如果是开始符号的话，就会去解析这个`HTML`，得到对应的`tagName`,起始位置`start`，接着又根据了`dynamicArgAttribute`匹配了是不是`vue`的指令如：`v-if`,`v-model`,`@click`,`:xxx="xxx"` ,将对应的标签放入到`attrs`
- 对文本内容的处理:`{{text}}`

处理完之后就需要对我们之前就构建完的`AST`将我们刚才获取到的`attrs`,`tag`等等放入到已经构建好的`AST`中:

```
export function createASTElement (
  tag: string,
  attrs: Array<ASTAttr>,
  parent: ASTElement | void
): ASTElement {
  return {
    type: 1,
    tag,
    attrsList: attrs,
    attrsMap: makeAttrsMap(attrs),
    rawAttrsMap: {},
    parent,
    children: []
  }
}
```

执行完了`parse`之后，也就生成了第一版的`ast`,打印看一下`parse ast`的结果，可以看到是以下的值

```
{
attrs: [{…}]
attrsList: [{…}]
attrsMap: {id: "root"}
children: (3) [{…}, {…}, {…}]
end: 75
parent: undefined
plain: false
rawAttrsMap: {id: {…}}
start: 0
tag: "div"
type: 1
}

```

第二步`optimize`执行得时候,我们可以看到在`children`节点下面得文本节点增加了一个属性`isStatic`

```
function markStatic(node: ASTNode) {
  node.static = isStatic(node);
  if (node.type === 1) {
    // do not make component slot content static. this avoids
    // 1. components not able to mutate slot nodes
    // 2. static slot content fails for hot-reloading
    if (
      !isPlatformReservedTag(node.tag) &&
      node.tag !== "slot" &&
      node.attrsMap["inline-template"] == null
    ) {
      return;
    }
    for (let i = 0, l = node.children.length; i < l; i++) {
      const child = node.children[i];
      markStatic(child);
      if (!child.static) {
        node.static = false;
      }
    }
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        const block = node.ifConditions[i].block;
        markStatic(block);
        if (!block.static) {
          node.static = false;
        }
      }
    }
  }
}
function isStatic (node: ASTNode): boolean {
  if (node.type === 2) { // expression
    return false
  }
  if (node.type === 3) { // text
    return true
  }
  return !!(node.pre || (
    !node.hasBindings && // no dynamic bindings
    !node.if && !node.for && // not v-if or v-for or v-else
    !isBuiltInTag(node.tag) && // not a built-in
    isPlatformReservedTag(node.tag) && // not a component
    !isDirectChildOfTemplateFor(node) &&
    Object.keys(node).every(isStaticKey)
  ))
}
```

1. 对这个节点得子节点进行深度遍历，来递归判断内部节点得情况，如果子节点中有一个节点他不是静态节点，那么他的父节点就不是静态节点
2. 然后判断了`ifCondition`，也就是判断了`v-if`里面是不是静态节点，如果静态节点里面都是静态节点，那么父节点就是静态节点

```
<div v-if="status">
  <span>1</span>
  <span>2</span>
</div>

```

这样就会这个节点打上`isStatic`的节点，这样当`dom diff`的时候，就只需要比较`status`的情况
`isStatic`:对文本类型是否是动态节点以及动态绑定，`v-if/v-for/v-else`，`组件`等各种情况进行了判断这个节点是否是一个静态节点

### generate 生成代码

根据`AST`的属性，去拼接代码

```
installRenderHelpers (target: any) {
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
export function renderStatic (
  index: number,
  isInFor: boolean
): VNode | Array<VNode> {
  const cached = this._staticTrees || (this._staticTrees = [])
  let tree = cached[index]
  // if has already-rendered static tree and not inside v-for,
  // we can reuse the same tree.
  if (tree && !isInFor) {
    return tree
  }
  // otherwise, render a fresh tree.
  tree = cached[index] = this.$options.staticRenderFns[index].call(
    this._renderProxy,
    null,
    this // for render fns generated for functional component templates
  )
  markStatic(tree, `__static__${index}`, false)
  return tree
}
```

首先将这个内容存放入到`cache`内，如果有缓存的话，那么就不会继续创建，而是取出来直接使用，否则就会给他们打上静态标签。

最终生成：

```
function render() {
  with(this) {
    return _c('div', {
      attrs: {
        "id": "app"
      }
    }, [_c('div', [_v(_s(msg))]), _c('span', [_v("测试")])])
  }
}
```
