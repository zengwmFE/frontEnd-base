var a = [1, 2, 3]

var b = [4, 5, 6]

var c = [7, 8, 9]

b[Symbol.isConcatSpreadable] = false
var concatArr = a.concat(b, c)
console.log(concatArr)
