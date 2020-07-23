// 请写一个函数，输出出多级嵌套结构的 Object 的所有 key 值

var obj = {
  a: '12',
  b: '23',
  first: {
    c: '34',
    d: '45',
    second: {
      3: '56',
      f: '67',
      three: {
        g: '78',
        h: '89',
        i: '90',
        four: {
          j: '101',
          k: '102',
        },
      },
    },
  },
}
// // => [a,b,c,d,e,f,g,h,i]

function getAllKey(obj) {
  if (typeof obj !== 'object') {
    return
  }
  let keys = []

  for (let index in obj) {
    if (obj[index] instanceof Object && !Array.isArray(obj[index])) {
      keys = keys.concat(getAllKey(obj[index]))
    } else {
      keys.push(index)
    }
  }
  return keys
}
getAllKey(obj)
