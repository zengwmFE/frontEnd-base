let flag = 10

async function myfun() {
  console.log(flag)
  await myfun1()
  console.log(flag + 1)
}

function myfun1() {
  console.log('myfun1')
}
myfun()

flag = 20
console.log('执行完成')
