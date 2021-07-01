setTimeout(() => {
  console.log('timeout')
})
new Promise((resolve) => {
  resolve(1)
}).then((res) => {
  console.log(res)
})

setImmediate(() => {
  console.log('immediate')
})
process.nextTick(() => {
  console.log('nextTick')
})
