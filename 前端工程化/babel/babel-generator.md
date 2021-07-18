### generate
generate过程主要是来将AST处理生成目标代码和sourcemap的过程

generate是把AST字符打印成字符串，是一个从根节点递归打印的过程，根据不同的AST做不同的处理。然后同时将在这里被省略的分隔符之类的重新打印出来
如`whileStatement`:就是先打印了一个while，然后打印一个空格'('然后把`test`条件打印出来，接着打印了`)`之后在针对`block`块进行打印

```typescript
export function WhileStatement(node:Object){
    this.word("while")
    this.space()
    this.token("(")
    this.print(node.test,node)
    this.token(")")
    this.printBlock(node)
}
```

### sourcemap

babel 对源码进行了修改，生成的目标代码可能改动很大，如果直接调试目标代码，可能很难定位到源码。所以需要一种自动关联源码的方式，就是 sourcemap。

一般使用sourcemap主要有2个目的：
1. 调试代码时定位到源码
主流的浏览器都支持在文件的末尾阶段增加一个sourcemap的注释
```javascript
//# sourceMappingURL=http://example.com/path/to/your/sourcemap.map
```
这样调试工具（浏览器、开发工具等）就能解析`sourcemap`,关联到源码。同样的断点调试、错误堆栈等都会对应到相应源码

2. 线上报错定位到源码
开发时会使用 sourcemap 来调试，但是生产可不会，要是把 sourcemap 传到生产算是大事故了。但是线上报错的时候确实也需要定位到源码，这种情况一般都是单独上传 sourcemap 到错误收集平台。
