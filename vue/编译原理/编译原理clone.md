```
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  const ast = parse(template.trim(), options)
  if (options.optimize !== false) {
    optimize(ast, options)
  }
  const code = generate(ast, options)
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
```

这段代码就告诉了我们对应生成`render`和`staticRenderFns`的方法

1. 看到`parse`方法，可以看到，这里使用了`parseHTML`的过程，将整个`HTML`进行遍历

- 根据开头是否是`<`,来判断是注释，`IE条件注释`
- `Doctype`
- 结束符号
- 开始符号，如果是开始符号的话，就会去解析这个`HTML`，得到对应的`tagName`,起始位置`start`，接着又根据了`dynamicArgAttribute`匹配了是不是`vue`的指令如：`v-if`,`v-model`,`@click`,`:xxx="xxx"` ,将对应的标签放入到`attr`
- 对文本内容的处理:`{{text}}`

处理完之后就需要对我们之前就构建完的`AST`:

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

这也就是为什么`Vue`生成的`AST`只有这些数据
