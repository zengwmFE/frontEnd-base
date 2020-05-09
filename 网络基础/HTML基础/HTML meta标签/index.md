## meta 标签

### 位置

> 他位于`<head>`和`title`标签之间

### 作用

- 定义页面的编码语言
- 搜索引擎优化
- 自动刷新页面，并指向新的页面
- 控制页面缓冲
- 响应式布局等等

**在 HTML5 出现之前，meta 属性只有两个属性，分别是：name 和 http-equiv 属性**
meta 属性一般是以键值对来出现的
`name:content`

```
<meta name="参数" content="参数值" />
```

**使用方案**

1. keywords(关键字)
   > 为搜索引擎提供关键字列表

```
<meta name="keywords" content="我是一个关键字列表">
```

2. Descriptor 简介
   > 简单描述页面的内容

```
<meta name="Descriptor" content="我这是一个简介">
```

3. robots
   > robots 属性用来告诉搜索引擎哪些需要索引

```
<meta name="robots" content="">
```

content 的参数值有：`all,none,index,onindex,follow,nofollow`，默认值为`all`
`all`表示所有的页面中的文件，所有的链接可以被检索。`none`表示文件不可以，链接也不能被检索
`index`文件可以被检索。`follow`链接可以被检索.`noindex`文件不能被检索，链接可以.`nofollow`链接不能被检索，文件可以

4. author 作者

> 标注网页的作者是谁

5. generator
   > 说明网站是用什么编辑器生成的

```
<meta name="generator" content="vscode">
```

6. revisit-after 网站重访

```
<meta name="revisit-after" content="1days"/>
```

### http-equiv

该属性类似于`HTTP`头部信息

## HTML5 新增

### viewport

> 能优化移动端浏览器显示

```
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
```

- width:viewport 视图的宽度
- height-viewport 视图的宽度
- user-scalable 的高度
- initial-scale 初始化比例
- maximum-scale 最大比例
- minimum-scale 最小比例

### format-detection（忽略手机号码和邮箱）

> 忽略电话号码和邮箱显示

```
<meta name="format-detecetion" content="telephone=no">
<meta name="format-detecetion" content="email=no">
// 也可以放在一起显示
<meta name="format-detection" content="telephone=no,email=no">
```

### http-equiv="X-UA-Compatible" 优先显示`IE最新版本`和`Chrome`

```
<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
// 使用低版本
<meta http-equiv="X-UA-Compatible" content="IE=IE7"> // 使用IE显示
```

### 浏览器内核控制：

```
 <meta name="renderer" content="webkit|ie-comp|ie-stand">
```

### 转码声明

```
<meta http-equiv="Cache-Control" content="no-siteapp" />
```
