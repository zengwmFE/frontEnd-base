const timeout = (ms) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
const ajax1 = () =>
  timeout(2000).then(() => {
    console.log('1')
    return 1
  })
const ajax2 = () =>
  timeout(1000).then(() => {
    console.log('2')
    return 2
  })
const ajax3 = () =>
  timeout(2000).then(() => {
    console.log('3')
    return 3
  })
// 思路：
// 1. promise.all 接收一个promise数组，返回一个结果的concat之后的数组
// 2. 如何让不同执行时间的代码，在执行的时候，按照执行完才能去执行下一个
// const mergePromise = function (promiseList) {
//   var result = []
//   var length = promiseList.length

//   if (length === 0) {
//     return result
//   }
//   var sequence = Promise.resolve()
//   promiseList.forEach(function (promise, index) {
//     // 要判断出当前
//     sequence = sequence.then(promise).then(
//       function (value) {
//         result.push(value)
//         return result
//       },
//       function (reason) {
//         reject(reason)
//       }
//     )
//   })
//   return sequence
// }
function mergePromise(promiselist) {
  var result = []
  mergePromise.then = function (callback) {
    function fn(i) {
      promiselist[i]().then((data) => {
        result.push(data)
        if (i !== promiselist.length - 1) {
          fn(++i)
        }
        if (result.length === promiselist.length) {
          callback(result)
        }
      })
    }
    fn(0)
  }
  return mergePromise
}
mergePromise([ajax1, ajax2, ajax3]).then((data) => {
  console.log('done')
  console.log(data) // data 为[1,2,3]
})
// 执行结果为：1 2 3 done [1,2,3]
