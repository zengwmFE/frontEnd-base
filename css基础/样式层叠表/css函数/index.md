## CSS 函数

1. attr() 获取属性函数

```
// html
<div class="tooltip" data-tooltip="我是小明啊" data-direction="down">
      down
 </div>

// css
 .tooltip::after {
   content: attr(data-tooltip);
}
```

可以获取指定元素上的属性

2. calc() 计算函数
   > 可以在 css 计算样式表达式

**运算规则**

- 使用"+"、"-"、"\*"、"/" 四则运算
- 可以使用百分比、px、em、rem 等单位
- 表达式中有"+"、"-"时，其前后必须要有空格，否则会被视为无效
- 表达式中有"\*"和"/"可以没有空格，但是建议保留空格

3. filter()
   在 css 中用来做各种滤镜的

```
.element{
  filter: function
}
```

**filter 支持的函数：**

- grayscale 灰度

```
.tooltip {
    color: red;
    filter: grayscale(80%);
}
```

取值为`0%~100%`，网站实例用途：使整个站点都蒙上灰色，来纪念一些伤心的时间。

- opacity 透明度

```
.tooltip {
  color: red;
  filter: opacity(50%);
  opacity: 0.1;
}
```

该值和 opacity 的取舍为：哪个属性的值要更小，在实际渲染的时候取哪个值，所以说，在实际用途的时候，要注意

- sepia 褐色

```
.tooltip {
  color: red;
  filter: sepia(100%);
}
```

项目实际用途：可以将页面渲染出老照片的感觉

- saturate 饱和度

```
.tooltip {
    color: red;
    filter: saturate(1);
}
```

更改页面的饱和度：1 为正常

- hue-rotate 色相旋转

```
.tooltip {
  color: red;
  filter: hue-rotate(180deg);
}
```

将上下两种颜色对换展示，取值和`transform:rotate`是一样的

- invert 反色

```
.tooltip {
        color: red;
        filter: invert(100%);
}
```

用途：可以用来做`CT`样的展示

- brightness 亮度

```
.tooltip {
  color: red;
  filter: brightness(100%);
}
```

控制元素的亮度，1 为正常，0 为全暗

- contrast 对比度

- drop-shadow 设置阴影

用法和阴影`box-shadow`一致

4. linear-gradient() 与 radial-gradient()渐变
