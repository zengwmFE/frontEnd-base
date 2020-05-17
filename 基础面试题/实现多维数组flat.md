1. 使用 ES6 中的 flat

```
const arr = [1,[2,3],[4,[5,6]]];
arr.flat(3)
```

2. 正则

```
let arr = [1,[2,3],[4,[5,6]]]
let strArr = JSON.stringify(arr);
let str = strArr.replace(/(\[|\])/g,'').split(',')

console.log(str)
```

3. 利用 reduce 函数迭代

```
let arr = [1,[2,3],[4,[5,6]]]
function flat(temArr){
  return temArr.reduce((pre,nextpre)=>{
    return pre.concat(Array.isArray(nextpre)?flat(nextpre):nextpre)
  },[])
}

console.log(flat(arr))
```

4. 循环 while

```
var myarr = []
while(Array.isArray(arr)){
    myarr.concat([...arr])
}
```
