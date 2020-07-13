// 实现Function 原型的bind方法，使得以下程序最后能输出“success”
function Animal(name, color) {
  this.name = name
  this.color = color
}
Animal.prototype.say = function () {
  return `I'm a ${this.color}${this.name}`
}
Function.prototype.bind = function (_this, arg) {
  const name = arg
  const callFn = this

  function fn(color) {
    callFn.call(this, name, color)
  }
  fn.prototype = Object.create(callFn.prototype)
  // 寄生组合式继承
  fn.prototype.say = function () {
    return `I'm ${this.color} ${this.name}`
  }
  return fn
}
const Cat = Animal.bind(null, 'cat')
const cat = new Cat('white')
if (
  cat.say() === "I'm white cat" &&
  cat instanceof Cat &&
  cat instanceof Animal
) {
  console.log('sunccess')
}
