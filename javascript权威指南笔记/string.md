### 文本
字符串（string）是一组由16位的值组成的不可变的有序序列，每个字符通常来自于Unicode字符集
字符串的长度`length`是其所含16位值

#### 字符串直接量
```
""
'testing'
```
ECMAScript3中，字符串直接量必须写一行中，而在ECMAScript5中，字符串直接量可以拆分成数行，每行必须以反斜线 **（\）**结束，在字符串中，**反斜线**和**行结束符**都不算是字符串直接量的内容
举个例子🌰：
```
var str = "sssss\aaaa\bbbb"
console.log(str)
VM2989:2 sssssaaaabbb
```

#### 转义字符
在JavaScript字符串，**反斜线（\）**有着特殊的用题
```
\o NUL字符
\b 退格符
\t 水平制表符
\n 换行符
\v 垂直制表符
\f 换行符
\" 双引号
```
#### 字符串的使用

```
charAt(number) 从一个字符串中返回指定的字符 
substring(start,end)获取从start到end-1中间的字符
substr(start,index)返回一个从start位置开始后的几个字符
slice(start,end) 同样是获取从start到end-1中间的字符
indexOf('0')获取‘0’在字符串中首次出现的位置
lastIndexOf('l') 字符串l最后一次出现的位置
indexOf('l',index) 字符串l在index位置之后出现的位置
split
replace('h','H')全文替换
toUpperCase()  
```
在ECMAScript5中，字符串可以当做只读数组，除了使用charAt方法，也可以用数组的方式来访问字符串中的单个字符
```
s = 'hello world'
s[0] // h
s[s.length-1] // d
```
