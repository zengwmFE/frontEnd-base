```
Array.prototype.cloneflat = function (idx) {
  // idx 传入得为拉平得层数
  if (idx <= 0) {
    return this
  }
  if (!idx) {
    idx = 1
  }
  // this为调用得数组
  let cloneArray = []
  for (var i = 0; i < this.length; i++) {
    cloneArray = cloneArray.concat(
      this[i] instanceof Array ? this[i].cloneflat(idx - 1) : this[i]
    )
  }
  return cloneArray
}

var a = [
  [1, [2, [7, 8]], 3],
  [4, 5, 6],
]
console.log(a.cloneflat(2))

```
