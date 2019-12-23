### 从两者的定义上来看
1. null
> 用来描述“空值”，此处是没有值的，
2. undefined
> 用来表示当前内容没有定义，但是此处应该是又要一个值的，只是在目前没有存在而已。

```
var a = 1;
```
变量提升，变量`a`一开始被定义的地方就是`undefined`,当前内容是有的，只是在这个地方还没有定义而已
### typeof 判断两者

```
typeof null =>Object
typeof undefined =>undefined
```
通过`typeof`可以大致认为null的是一个特殊的对象，都知道，原型链最后的指向就是null，代表了Object，无法再指向更高的内容，只能指向null。

### 两者比较

```
null == undefined // true
null===undefined // false

!!(null) // false
!!(undefined) // false

Number(null) => 0
Number(undefined) => NaN
```
`Number(undefined)`是在编程中最常见的，因为我们需要将一个可能存在的数字字符串转成数字，但是有的时候会遇到一个值为`undefined`,这个时候`undefined`就会被转成`NaN`导致我们页面显示处`NaN`且无法直接判断`NaN`的存在性，导致了一个错误的页面显示


### 两者判断
```
function isNull(obj){
    return obj===null
}
function isUndefined(obj){
    return obj===void 0;
}
```

1. null作为javaScript的保留字，是不能直接对null赋值的
2. undefined不是保留字，而是一个全局对象的属性而已，可以被修改
```
var undefined = 10;
console.log(undefined)
```
// 这段代码仅在低版本的ie能使用，当然在局部作用域当前，undefined仍然能使用
```
(function(){
    var undefined = 10;
    console.log(undefined)
})
```