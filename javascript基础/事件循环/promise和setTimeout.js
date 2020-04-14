console.log('首次执行')

setTimeout(() => {
  console.log('我是timeOut的执行回调')
}, 0)

new Promise((resolve) => {
  resolve(1)
}).then((data) => {
  console.log(data)
})
console.log('结束')
