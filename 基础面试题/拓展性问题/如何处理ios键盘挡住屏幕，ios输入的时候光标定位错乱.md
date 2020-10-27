### ios中，输入框获得焦点时，页面输入框被遮盖，定位的元素位置错乱：

当页input存在于吸顶或者吸底元素中时，用户点击输入框，输入法弹出后，fiexd失效，页面中定位好的元素随屏幕滚动。
针对这个问题，我们一起来看下以下几种方案：

1. Web API 接口 ：scrollIntoView 的应用，将input输入框显示在可视区域。

```
// 输入框获得焦点时，元素移动到可视区域
inputOnFocus(e) {
    setTimeout(function(){
        e.target.scrollIntoView(true);
       // true:元素的顶端将和其所在滚动区的可视区域的顶端对齐; false:底端对齐。
    },200);  // 延时 == 键盘弹起需要时间
 }
```

#### 缺陷
> 页面过长时，由于fixed失效，输入框依然也会跟着页面滑走。**这时，我们需要一个固定的输入框......**

2. 在输入框获得焦点时，将页面滑动到最底部，避免fixed导致的页面乱飞，并且保证input在最底部。

```
 var timer；
 // 输入框获得焦点时，将元素设置为position:static，设置timer
 inputOnFocus(e) {
    e.target.style.className = 'input input-static';
    timer = setInterval(
        function() {
           document.body.scrollTop = document.body.scrollHeight
        }, 100)
 }；
 // 输入框失去焦点时，将元素设置为 position:fixed，清除timer
 inputOnbulr(e) {
    e.target.parentNode.className = 'input input-fixed';
    clearInterval(timer)
 }；

```
当获得焦点弹出虚拟键盘后，input输入框会一直紧贴键盘顶部。如果，你的页面弹出输入法后不需要滑动查看其他内容，那么你对这种方案应该很中意。
But，可能你做的是一个类似聊天的页面，需要在回复时，查看历史消息，那么，请你继续往下看

3. 将页面进行拆分: 页面（main） = 内容（sectionA） + 输入框（sectionB）+ 其他（sectionOther）

> 原理 ： main.height = window.screen.height ;

```
sectionA 绝对定位，进行内部滚动 overflow-y：scroll ;
sectionB 可保证在页面最底部。
.main { position: relative; height: 100%; }
.sectionA { box-sizing: border-box; padding-bottom: 60px; height: 100%; overflow-y: scroll; -webkit-overflow-scrolling: touch //为了使滚动流畅，sectionA 添加属性 }
.sectionB { position: absolute; height: 60px; overflow: hidden; left: 0; right: 0; bottom: 0; }　
```

纯css3打造，可以滚动，可以固定位置,基本满足大部分布局需要。

IOS 中单行输入框输入内容长被遮盖，不能显示全部，且不能左右滑动。
这个是IOS的一个bug，可以考虑用 textarea 替换 input，设置一行的高，进行上下滚动查看。（其他方案可以参看下面 第 6 点）

### 获得焦点时，光标消失或错位：

```
// -webkit-user-select:none 导致 input 框在 iOS 中无法输入，光标不出现，设置如下:
user-select: text;
-webkit-user-select: text;

// 利用scrollIntoView 使当前元素出现到指定位置，避免光标错位，设置如下：

document.getElementById(“name”).addEventListener(“click”,function(e){
        e.target.scrollIntoView(true);
        //e.target.scrollIntoViewIfNeeded();//可选

})
```

### 进入页面如何自动获取焦点，弹出软键盘？

添加 autofocus 属性 支持自动获得焦点
触发 focus() 事件

随文字输入，输入框宽度自适应。

onkeyPress(e) {
   const testLength = e.target.value.length;
   e.target.style.width = `${testLength*8+10}px`
}

这种方案基本满足自动获取效果。

testLength * 8 英文字符，testLength * 16中文字符， +10为后边光标预留位置。 这种方案显然不适用于对精确度有很高要求的需求。

介绍一个属性：contenteditable，模拟输入时动态获取宽高

（1）div设置contentditable=true 可以将此元素变成可输入状态。
<div  class="inputContent"  contenteditable="true" ></div>
（2）想要变成input输入框，利用css模拟输入框的样式

```
 .inputContent{
   color: #444;
  border: #999 solid 1px;
  border-radius: 3px;
 padding: 5px 10px;
  box-sizing: border-box;
  min-width: 50px;
 max-width: 300px;
 background: #ffffff;
}
```

这里配合min-width，max-width 效果更真实。

（3）点击div可以弹出软键盘，但是无法输入内容，需要设置属性，如下
.inputContent{
    user-select:text;
    -webkit-user-select:text;
}

这样就完成一个可以根据获取输入内容来动态来调节宽高。
（这里是一个gif图）
还可以利用js模拟placeholder等，这里就不展开了

### 其他问题及解决
输入框获得焦点可弹出软键盘，却没有光标闪烁，也无法正常输入。
```
-webkit-user-select:none 导致的，可以这样解决
*:not(input,textarea) {
   -webkit-touch-callout: none;
   -webkit-user-select: none;
}
input 自定义样式

// 使用伪类
input::-webkit-input-placeholder,
input::-moz-placeholder,
input::-ms-input-placeholder {
...style
text-align: center;
}

```