const { getAST, getDependencies, transform } = require('./parser')
const path = require('path')
class Compiler {
  constructor(options) {
    const { entry, output } = options
    this.entry = entry
    this.output = output
    this.modules = [] // 存放所有模块内容
  }
  buildModule(filename, isEntry) {
    // 获取对应得filename得ast,以及依赖
    let ast = null,
    if (isEntry) {
      ast = getAST(filename)
    } else {
      const absolutePath = path.join(process.cwd(), './src')
      ast = getAST(path.join(absolutePath, filename))
    }
    return {
      filename,
      source: transform(ast),
      dependencies: getDependencies(ast),
    }
  } // 构建模块
  run() {
    const entryModules = this.buildModule(this.entry,true)
    this.modules.push(entryModules)
    entryModules.dependencies.map(_map=>{
      _map.dependencies.map(_dep=>{
        this.modules.push(this.buildModule(_dep))
      })
    })
    this.emitFile()
  } // 启动构建
  emitFile() {
    let output = path.join(this.output.path,this.output.filename)
    let modules = ''
    this.modules.map(_modules=>{
      modules = `'${_modules.filename}':function(require,module,export){${_modules.source}}`
    })
    let bundle = `
    (function(modules){
      let installModule = {}
      function __require__(moduleId){
        if(installModule[moduleId]) return installModule.exports
        let module = installModule[moduleId] = {
          exports: {}
        }
        module.call(module.exports,modules,module.exports,__require__)
        return module.exports
      }
      __require__(${this.entry})
    })
    
    `
    fs.writeFile(output,bundle)
  } // 输出文件
}

module.exports = Compiler
