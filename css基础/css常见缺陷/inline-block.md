### 设置 inline-block，元素之间会出现空隙

```
    <style>
      * {
        padding: 0;
        margin: 0;
        padding-top: 20px;
      }
      .inner {
        width: 33.33%;
        height: 100px;
        border: 1px solid #999;
        display: inline-block;
      }
    </style>
  <div class="outer">
      <div class="inner"></div>
      <div class="inner"></div>
      <div class="inner"></div>
    </div>
```

解决方法：

1. 父类元素设为 fontSize:0

> 因为我们元素之间存在空隙，这样就会产生一个间隔，当然我们可以把所有的元素写成一行，但是这样会比较难理解。空隙也属于一个字符，所以可以利用这样的方法来着

### 在经过处理

```
 <div class="inner">111111</div>
      <div class="inner"></div>
    </div>
```

在其中一个加入内容，我们会发现，这个时候两者错开来了

![](https://github.com/zengwmFE/frontEnd-base/blob/master/image/inline-blockquexian2.png)

2. 将`display: inline-block`改成`float: left;`;

```
 .inner {
        width: 33.33%;
        height: 100px;
        border: 1px solid #999;
        /* display: inline-block; */
        float: left;
        text-align: center;
        font-size: 30px;
      }
```

发现是正常的

![](https://github.com/zengwmFE/frontEnd-base/blob/master/image/float.png)

证明这是因为`display:inline-block`引起的问题

解决方法

1. 让每个`inner`变成独立的`Bfc`

增加代码:

```
overflow: hidden;
```

这样他们就会以下端开始对齐了
