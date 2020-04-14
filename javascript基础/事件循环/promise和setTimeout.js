console.log('首次执行')

setTimeout(() => {
  console.log('我是timeOut的执行回调')
}, 0)

new Promise((resolve, reject) => {
  for (let i = 0; i < 5000000; i++) {
    if (i === 4999999) {
      resolve('promise回调结束')
    }
  }
}).then((data) => {
  console.log(data)
})
new Promise((resolve) => {
  resolve('第二个promise')
}).then((data) => {
  console.log(data)
})
console.log('结束')
