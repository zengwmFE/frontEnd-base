var a = [1, 2, 3]

a[Symbol.iterator] = function () {
  let i = 0

  return {
    next: function () {
      var done = i >= this.length
      console.log(done)
      var value = !done ? this[++i] : undefined
      return {
        done,
        value,
      }
    },
  }
}

for (let item of a) {
  console.log(item)
}
