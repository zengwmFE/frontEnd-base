### 数字
js不区分整数值和浮点数值，所有的数字均用浮点数值表示数字。
js实际的操作是（比如数组索引，以及位操作符）则是基于32位整数。
当一个数字直接出现在JavaScript程序中，称之为`数字直接量`
#### 整型直接量
**10进制**
JavaScript程序中，用一个数字序列表示一个十进制整数如
```
0
3
1000
```
**16进制**
JavaScript同样识别十六进制，所谓十六进制的直接量是值以`0X`或`0x`

**8进制**
尽管ECMAScript标准不支持八进制直接量，但JavaScript的某些实现可以允许采用八进制（基数为8）形式表示整数。八进制直接量以0开始，其后跟随一个有`0~7`之间的数字组成序列
```
0377
```
由于某些JavaScript的实现支持八进制直接量，而有些不支持，因此最好不要用以0为前缀的整型直接量.
在严格模式下，八进制直接量是明令禁止的
**浮点型直接量**
```
1.2222
```

**算数运算**
常用除了`+`、`-`、`*`,`/`,`%`,还有一些常用的方法
```
Math.pow(2,3)  求幂积：2的3次幂
Math.round(0.6)  1.0 四舍五入
Math.ceil(.6)   向上求整
Math.floor(.6)  向下求整
Math.abs(-5)    求绝对值
Math.max(x,y,z) 返回最大值
Math.min(x,y,z) 返回最小值
Math.random()   生成一个大于等于0小于1.0的伪随机数（是用确定性算法计算出来均匀分布的随机数序列）
Math.PI
Math.E  e:自然对数的底数
Math.sqrt(3)    平方根：3的平方根
Math.pow(3,1/3) 3的立方根
Math.sin
Math.cos
Math.log(10)    10的对数
Math.log(100)/Math.LN10 以10为底100的对数
Math.exp(3) e的三次幂
```
Javascript的算术运算在溢出（overflow），下溢（underflow）或被零整除时不会报错
 
溢出：当运算结果超过了JavaScript所能表示的数字上限（溢出），结果是为一个无穷大的值（infinity），在JavaScript中以`Infinity`来表示
下溢：运算结果无限接近于0的时候且javaScript无法表示的
**被零整除在JavaScript并不报错：它只是简单的返回无穷大（Infinity）或负（-Infinity）**
Javascript预定义了全局变量`Infinity`和`NaN`

用来判断是不是无穷数`isInfinity`

**二进制浮点数和四舍五入错误**
