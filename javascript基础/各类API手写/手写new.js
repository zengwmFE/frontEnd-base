
function myNew(parentClass) {
  var newObject = {}
  Object.setPrototypeOf(newObject,parentClass.prototype)
  // newObject.__proto__ = parentClass.prototype
  return typeof parentClass.call(this,Object.prototype.slice.call(argument,1)==='object' ? parentClass.call(this,Object.prototype.slice.call(argument,1)) : newObject
}

function testClass() {
return 1
}

var a = myNew(testClass)
console.log(a)

