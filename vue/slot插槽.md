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
