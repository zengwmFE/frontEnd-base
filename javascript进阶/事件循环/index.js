var fs = require('fs')

setTimeout(() => {
  console.log('settimeout1')
}, 30000)

fs.readFile('input.txt', function (err, data) {
  if (err) {
    return console.error(err)
  }
  console.log('异步读取: ' + data.toString())
})
