var x = 1;
function* foo() {
  x++;
  yield;
  console.log("x:", x);
}

var ite = foo();

ite.next();
console.log(x);
