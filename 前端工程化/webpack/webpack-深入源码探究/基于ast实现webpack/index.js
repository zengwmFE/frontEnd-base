const Compiler = require('./compiler')
const options = require('./webpack.config.js')

new Compiler(options).run()
