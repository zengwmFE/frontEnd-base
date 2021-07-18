## plugin
babel 的 plugin 是在配置文件里面通过 plugins 选项配置，值为字符串或者数组。

```javascript
{
  "plugins": ["pluginA", ["pluginB"], ["pluginC", {/* options */}]]
}
```

### babel plugin的格式
第一种是一个函数返回一个对象的格式，对象里有`visitor`，`pre`,`inherts`,`manipulateOptions`等属性
```javascript
export default function(api,options,dirname){
    return {
    inherits: parentPlugin,
    manipulateOptions(options, parserOptions) {
        options.xxx = '';
    },
    pre(file) {
      this.cache = new Map();
    },
    visitor: {
      StringLiteral(path, state) {
        this.cache.set(path.node.value, 1);
      }
    },
    post(file) {
      console.log(this.cache);
    }
  };
}
```
解析：
