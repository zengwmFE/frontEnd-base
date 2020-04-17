const { parse } = require('@babel/parser')
const { default: generate } = require('@babel/generator')
const { default: traverse } = require('@babel/traverse')
var abc = 30
const lint = '<div>{abc}</div>'
const ast = parse(lint, {
  sourceType: 'module',
  plugins: ['jsx', 'flow'],
})

traverse(ast, {
  enter(path) {
    console.log(path.node.type, '-------------------')
    if (path.node.type === 'JSXIdentifier') {
      console.log(path.node)
    }

    if (path.node.type === 'Identifier') {
      path.node.name = abc
    }
  },
})
const newCode = generate(ast)
console.log(newCode.code)
