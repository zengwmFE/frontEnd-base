## BFC

### 什么是 BFC

> `block format context`块级格式上下文，`bfc元素`就是页面中独立的元素，不会受到外界干扰或者影响到外部元素

### 生成一个 BFC 元素

1. 不是块级元素可以容纳块级元素得：inline-block ,table-cell,table-caption

2. 是块级元素可以容纳块级元素，且 overflow 不为 visible

3. float 不能 `none` 得元素
4. 绝对布局元素：position 不是`static`

### BFC 计算规则

1. BFC 在页面上是独立的，不受到外界干扰或者干扰外界
2. BFC 计算高度的时候，浮动子元素也会计算在其中
3. BFC 的区域不会与 float 的元素区域重叠
4. BFC 内部的元素会在垂直上进行放置
5. BFC 内部的元素的 margin 会发生重叠

### BFC 应用场景

1. 清除浮动，可以防止父元素高度丢失
