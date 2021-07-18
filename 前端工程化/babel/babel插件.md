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
1. options就是外部传入的参数
2. dirname文件名
3. api包含了babel各种api,template,type
返回的对象有`inherits`,`manipulateOptions`,`pre`,`visitor`,`post`
1. inherits指定继承某个插件，和当前的options进行合并，通过Object.assign的方式
2. visitor指定traverse时调用的函数
3. pre和post分别在遍历前后调用，可以做插件调用前后的逻辑
4. manipulateOptions用于修改options.是在插件里面修改配置的方式，比如`syntax plugin`一般都会修改parser options