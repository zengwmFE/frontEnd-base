"use strict";

const {
  parse
} = require('@babel/parser');

const lint = 'const a = 5;';
const ast = parse(lint, {
  sourceType: 'module',
  plugins: ['jsx', 'flow']
});
console.log(ast);