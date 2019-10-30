### Javascript是一门高端的，动态的，弱类型的语言
**动态的：是因为js执行的过程中能够隐性的去改变当前变量的对象**

### 词法结构
2.1 字符集
JavaScript程序是用Unicode字符集编写的。
2.1.1 区分大小写
**Javascript是区分大小写。**
**HTML并不区分大小写，XHTML区分大小写（严格来讲XHTML是区分大小写的，但由于浏览器有着非常较强大的纠错能力，即使文档中包含很多不严格的大小写，浏览器还是比较宽容的正确解析渲染）**
在HTML中，这些标签和属性名可以使用大写也可以是小写的，但是在Javascript中必须是小写的，例如：在设置事件处理程序时，onclick属性可以写成onClick，也可以写成onclick，但是在JavaScript中，必须要写成onclick

#### 保留字
Javascript保留了一些标识符拿出来用做自己的关键字。因此，就不用再在程序中把这些关键字用作标识符
```
break case catch debugger default delete do else false finlly for  function if in instanceof new null return switch this throw true try typeof var void while with

Es5
class const enum export extends import super
// 以下在严格模式下是保留字
implements let private public yield interface package protected static 
```
### 可选的分号
大部分情况javascript代码执行的时候，会分析上下两行能否合在一起解析。
1. 除了**break,return,continue**
举个例子
```
return
true;
```
这段代码会被解析成`return ;true;`

2. 涉及到`++`和`--`的时候

```
x
++
y
```
这个时候`++`既可以和x组成`x++`也可以和`y`组成`++y`
所以这个时候必须要加上`;`

### 内存管理机制
javascript解释器有自己的内存管理机制，可以自动对内存进行垃圾回收（Garbage Collection）.这意味着程序可以按需创建对象，程序员则不必担心这些对象的销毁和内存回收。当不再有任何引用指向一个对象时，解释器就会知道这个对象没用了，然后自动回收它会占用的内存资源。
**内存泄漏**
程序的运行需要内存。只要程序提出要求，操作系统或运行时（runtime）就必须供给内存。否则，内存占用越来越高，轻则影响系统性能，重则导致进程崩溃
**不再用到的内存，没有及时释放，就叫做内存泄漏（memory leak）**
**垃圾回收机制**
最常使用的方法叫做“引用计数”（reference counting）:语言引擎有一张“引用表”，保存了内存里面所有的资源（通常是各种值）的引用次数，如果一个值的引用次数是`0`，就表示这个值不再用到，因为可以将这块内存释放  
