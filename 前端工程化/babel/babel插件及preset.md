## plugin

babel 的 plugin 是在配置文件里面通过 plugins 选项配置，值为字符串或者数组。

```javascript
{
    "plugins": ["pluginA", ["pluginB"],
        ["pluginC", {
            /* options */
        }]
    ]
}
```

### babel plugin的格式

第一种是一个函数返回一个对象的格式，对象里有 `visitor` ， `pre` , `inherts` , `manipulateOptions` 等属性

```javascript
export default function(api, options, dirname) {
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
返回的对象有 `inherits` , `manipulateOptions` , `pre` , `visitor` , `post`

1. inherits指定继承某个插件，和当前的options进行合并，通过Object.assign的方式
2. visitor指定traverse时调用的函数
3. pre和post分别在遍历前后调用，可以做插件调用前后的逻辑
4. manipulateOptions用于修改options.是在插件里面修改配置的方式，比如`syntax plugin`一般都会修改parser options

插件第二种形式：

```javascript
export default plugin = {
    pre(state) {
        this.cache = new Map();
    },
    visitor: {
        StringLiteral(path, state) {
            this.cache.set(path.node.value, 1);
        }
    },
    post(state) {
        console.log(this.cache);
    }
};
```

### preset

`plugin` 是单个转换功能的实现，当 `plugin` 比较多或者 `plugin` 的 `options` 比较多的时候就会导致使用成本升高，这个时候可以封装成一个preset，用户可以通过 `preset` 来批量引入 `plugin` 并进行一些配置。 `preset` 就是对 `babel` 一层封装
使用 `plugin` 就需要知道一系列的作用是干嘛的，这样使用成本很高，而有了 preset 之后就不再需要知道用到了什么插件，只需要选择合适的 preset，然后配置一下，就会引入需要的插件，这就是 preset 的意义。我们学 babel 的内置功能，主要就是学 preset 的配置，比如 preset-env、preset-typescript 等

```javascript
preset {
    plugin1,
    plugin2,
    plugin3
}
```

写法：

```javascript
export default function(api, options) {
    return {
        plugins: ['pluginA'],
        presets: [
            ['presetsB', {
                options: 'bbb'
            }]
        ]
    }
}
```

写法2：

```javascript
export default obj = {
    plugins: ['pluginA'],
    presets: [
        ['presetsB', {
            options: 'bbb'
        }]
    ]
}
```

同时 `@babel/core` 提供了 `createConfigItem` 的api，用于创建配置项。一遍将配置抽离出去

```javascript
const pluginA = createConfigItem('pluginA);
    const presetB = createConfigItem('presetsB', {
        options: 'bbb'
    })

    export default obj = {
        plugins: [pluginA],
        presets: [presetB]
    }
}
```

### 执行顺序

preset和plugin从形式上差不多，但是应用顺序不同。
babel会按照如下顺序处理插件和preset

1. 先应用plugin,在应用preset
2. plugin从前到后，preset从后往前

### 插件分类

#### syntax

`syntax plugin` 只是在 parserOptions 中放入一个 flag 让 parser 知道要 parse 什么语法，最终的 parse 逻辑还是 babel parser（babylon） 实现的。
一般 `syntax plugin` 都是类似这样实现的

```
import { declare } from "@babel/helper-plugin-utils";

export default declare(api => {
  api.assertVersion(7);

  return {
    name: "syntax-function-bind",

    manipulateOptions(opts, parserOpts) {
      parserOpts.plugins.push("functionBind");
    },
  };
});
```

#### transform

transform plugin 是对 AST 的转换，各种 es20xx 语言特性、typescript、jsx 等的转换都是在 transform plugin 里面实现的。
比如ts的语法解析首先就是使用了 `@babel/plugin-syntax-typescript` 在 `parserOpts` 放入的解析typescript语法的选项，然后在使用 `@babel/plugin-tranform-typescript` 来转换解析出 `typescript` 对应的AST的转换，但是平时可以直接使用 `@babel/preset-typescript` 他是对**这两个插件进行了封装**

#### proposal

还没加入语言标准的AST转换插件叫 `proposal plugin` ，其实他也是 `transform plugin` ，但是为了和标准特性区分，所以成为建议： `proposal`

一般来说为了完成对 `proposal` 特性的支持，有时候同样需要综合 `syntax plugin` 和 `proposal plugin` ，如函数绑定操作符 `::` 就需要同时使用 `@babel/plugin-syntax-function-bind` 和 `@babel/plugin-proposal-function-bind`

插件的类就分为:** `@babel/plugin-syntax-xxx` , `@babel/plugin-syntax-tranform-xxx` , `@babal/plugin-proposal-xxx` **

### preset的分类

* 不同版本的语言标准支持： `preset-es2015、preset-es2016` 等，`babel7` 后用 `preset-env` 代替
* 未加入标准的语言特性的支持： 用于 `stage0、stage1、stage2` 的特性，babel7 后单独引入 `proposal plugin`
* 用于 react、jsx、flow 的支持：分别封装相应的插件为 preset-react、preset-jsx、preset-flow，直接使用对应 preset 即可

### helper（面试很有可能会被问到）

每个特性的实现用一个 babel 插件实现，当 babel 插件多了，自然会有一些共同的逻辑。这部分逻辑怎么共享呢？

babel 设计了插件之间共享逻辑的机制，就是 helper

helper分为2种

* 一种是注入到 AST 的运行时用的全局函数
* 一种是操作 AST 的工具函数，比如变量提升这种通用逻辑

#### 注入到AST的全局函数

比如 `class` :

```javascript
"use strict";

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Cons tructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

var MyClass = function MyClass() {
    _classCallCheck(this, MyClass);
};
```

这个 `_classCallCheck` 函数就是就是通过全局 `helper` 注入的

#### 操作AST的工具函数

如 `@babel/helper-hoist-variables` 可以实现变量提升逻辑

```
module.exports = function ({ types, template }) {
  return {
    visitor: {
      VariableDeclaration(path) {
        hoistVariables(
          path.parentPath,
          (id) => {
            path.scope.parent.push({
              id: path.scope.generateUidIdentifier(id.name),
            })
            return id
          },
          'const'
        )
      },
    },
  }
}
```

`@babel/helper-module-imports` 可以很轻松的引入一个模块

```
const importModule = require('@babel/helper-module-imports');

cosnt plugin = function ({ template }) {
    visitor: {
        Program(path) {
            const reactIdentifier = importModule.addDefault(path, 'lodash',{
                nameHint: '_'
            });
            path.node.body.push(template.ast(`const get = _.get`));
        }
    }
}  
```

这类 helper 的特点是需要手动引入对应的包，调用 api，而不是直接 this.addHelper 就行

### 总结

总之，babel helpers 是用于 babel plugin 逻辑复用的一些工具函数，分为用于注入 runtime 代码的 helper 和用于简化 AST 操作 的 helper两种。第一种都在 @babel/helpers 包里，直接 this.addHelper(name) 就可以引入， 而第二种需要手动引入包和调用 api。

### babel-runtime

babel runtime 里面放运行时加载的模块，会被打包工具打包到产物中，下面放着各种需要在 runtime 使用的函数，包括三部分：regenerator、corejs、helper。

* corejs 这就是新的 api 的 polyfill，分为 2 和 3 两个版本，3 才实现了实例方法的polyfill
* regenerator  是 facebook 实现的 aync 的 runtime 库，babel 使用 regenerator-runtime来支持实现 async await 的支持。
* helper 是 babel 做语法转换时用到的函数，比如 _typeof、_extends 等
