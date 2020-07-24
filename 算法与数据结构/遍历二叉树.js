let data1 = []
let data2 = []
let data3 = []
function treeNode(data) {
  this.data = data
}
treeNode.prototype.leftChild = null
treeNode.prototype.rightChild = null
function createBinaryTree(inputList) {
  if (!(inputList && inputList.length)) return null
  let node = new treeNode(inputList)
  let data = inputList.shift()
  if (data !== null) {
    node.data = data
    node.leftChild = createBinaryTree(inputList)
    node.rightChild = createBinaryTree(inputList)
    return node
  }
}
function preOrderTraveral(node) {
  if (!node && node != 0) return
  data1.push(node.data)
  preOrderTraveral(node.leftChild)
  preOrderTraveral(node.rightChild)
}
function midOrderTraveral(node) {
  if (!node && node != 0) return
  preOrderTraveral(node.leftChild)
  data2.push(node.data)
  preOrderTraveral(node.rightChild)
}
function lastOrderTraveral(node) {
  if (!node && node != 0) return
  preOrderTraveral(node.leftChild)
  preOrderTraveral(node.rightChild)
  data3.push(node.data)
}
let node = createBinaryTree([3, 2, 9, null, null, 10, null, null, 8, null, 4])

preOrderTraveral(node)
// midOrderTraveral(node)
// lastOrderTraveral(node)
console.log(data1)
