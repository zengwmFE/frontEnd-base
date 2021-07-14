const babylon = require('babylon') // 可以将一个文件代码直接转换成AST
const traverse = require('babel-traverse').default
const { transformFromAstSync } = require('babel-core') // 将ast转换成源代码

const fs = require('fs')
module.exports = {
  getAST(path) {
    const source = fs.readFileSync(path, 'utf-8')
    return babylon.parse({ source, sourceType: 'module' })
  },
  getDependencies(ast) {
    const dependencies = []
    traverse(ast, {
      ImportDeclaration: function (node) {
        dependencies.push(node.source.value)
      },
    })
    return dependencies
  },
  transform(ast) {
    const { code } = transformFromAstSync(ast, null, {
      presets: ['env'],
    })
    return code
  },
}
