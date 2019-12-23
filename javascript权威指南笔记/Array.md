### 数组的方法
1. 数组元素的添加和删除
    - delete 使用delete来删除元素与给其赋值给undefined是类似的，使用delete不会修改数组的length，如果从一个数组里面删除一个元素，他就会变成一个稀疏数组
    - pop（尾删除一个元素，并返回当前被删除的元素）和push（尾增加一个元素）一起使用()
    - shift(头删除一个元素，并返回当前被删除的元素)和unshift（头增加一个元素）一起使用
    - splice 是一个通用的方法，既适用于删除，同样能用于插入和替换元素，他会根据需要修改的length属性并移动元素到更高或者更低的索引处。

#### 数组的方法
1. join 返回最后生成的字符串
2. reverse 
3. sort 
将数组中的元素排序并返回排序后的数组。当不带参数调用sort()时，数组元素以字母表顺序排序
> 如果数组里面包含`undefined`元素，它们会被排到数组的尾部

实际面试题：如果将一个json数组里面某个值按照key来排序
```
var a = [{
    a:3,
},{
    a:1
},{
    a:2
}]
a = a.sort((item,item1)=>{
    return item.a-item1.a
})
```
该方法：首先必须要给sort方法传递一个比较函数，这个函数决定了他的两个参数在排好序的数组中的先后顺序
注意：排序的规则，如果是顺序排序，那么需要返回一个负数，而要逆序排序那么需要返回一个整数

4. concat 
5. slice 返回指定数组的一个片段或者一个子数组，参数为，开始的index，结束的index，并且返回从startIndex到endIndex（但不包括endIndex）的数组值（要注意的是：slice不会修改原数组）
6. toString和toLocalString

#### ES5中的数组方法
es5中定义了9个新的数组方法来遍历、映射、过滤、检测、简化和搜索数组
1. 大多数方法的第一个参数接受一个函数，并且对数组的每一个元素（或一些元素）调用一次该函数。如果是稀疏函数，对不存在的元素不调用传递函数
大多数情况下，调用提供的函数使用三个参数：数组元素，元素的索引和数组本身。通常只需要一个参数，其他两个可以忽略掉

**reduce和reduceRight传入的参数和大部分函数是不一样的：第一个参数为初始值（即计算完成之后得到的总值），第二个参数为传进去的内容**

- forEach 
- map
- fitler
- every和some，它们对数组元素应用指定的函数进行判断，every针对于所有；当且仅当针对数组中的所有元素调用判定函数都返回true,他才会返回true,some代表数学里面的或，只要一个数据满足条件就返回true

- reduce和reduceRight
reduce和reduceRight方法使用指定函数将数组元素进行组合，生成单个值。
```
var a = [1,2,3,4,5];
var sum = a.reduce(function(x,y){return x+y},0); 
var product = a.reduce(function(x,y){
    return x*y;
},1)
```

> reduce需要两个参数，，第一个是执行化简操作的函数，第二个可选参数是传入函数的初始值。基本的计算方法为，第一个参数是到目前为止的化简操作累积的结果，。第一次调用函数时，第一参数是一个初始值，他就是传递给reduce的第二个参数

reduce是函数式编程的典型方法

- indexOf和lastIndexOf

- isArray用来判断当前这个对象是否为数组

es3实现`isArray`
```
var isArray = Function.isArray||function(o){
    if(typeOf o!=='object'&&Object.prototype.toString.call(o)==='[object Array]'
}
```