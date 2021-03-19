VueRouter 得声明在`src\index.js`

### mode

```
let mode = options.mode || 'hash'
    this.fallback =
      mode === 'history' && !supportsPushState && options.fallback !== false
    if (this.fallback) {
      mode = 'hash'
    }
    if (!inBrowser) {
      mode = 'abstract'
    }
    this.mode = mode

    switch (mode) {
      case 'history':
        this.history = new HTML5History(this, options.base)
        break
      case 'hash':
        this.history = new HashHistory(this, options.base, this.fallback)
        break
      case 'abstract':
        this.history = new AbstractHistory(this, options.base)
        break
      default:
        if (process.env.NODE_ENV !== 'production') {
          assert(false, `invalid mode: ${mode}`)
        }
    }
```

在这里可以看到共有 3 个模式: `hash`,`history`以及`abstract`，如果没有传入，默认是`hash`模式，当传入了`history`模式得时候，首先判断是不是支持`pushState`方法，和 options 内得`fallback`为`false`,就会将`histroy`模式转换成`hash`模式，`abstract`当不在浏览器环境下。

在路由注册得时候，会在每个组件下混入了一个`beforeCreated`方法，这个

```
init (app: any /* Vue component instance */) {
    this.apps.push(app)
    app.$once('hook:destroyed', () => {
      const index = this.apps.indexOf(app)
      if (index > -1) this.apps.splice(index, 1)
      if (this.app === app) this.app = this.apps[0] || null
      if (!this.app) this.history.teardown()
    })

    if (this.app) {
      return
    }

    this.app = app

    const history = this.history

    if (history instanceof HTML5History || history instanceof HashHistory) {
      const handleInitialScroll = routeOrError => {
        const from = history.current
        const expectScroll = this.options.scrollBehavior
        const supportsScroll = supportsPushState && expectScroll

        if (supportsScroll && 'fullPath' in routeOrError) {
          handleScroll(this, routeOrError, from, false)
        }
      }
      const setupListeners = routeOrError => {
        history.setupListeners()
        handleInitialScroll(routeOrError)
      }
      history.transitionTo(
        history.getCurrentLocation(),
        setupListeners,
        setupListeners
      )
    }

    history.listen(route => {
      this.apps.forEach(app => {
        app._route = route
      })
    })
  }
```

在这里会直接调用`vueRouter`得`init`函数，这里传入`init`得参数为`Vue`,在这里先将`Vue实例`赋值给了`this.app`中，并且会拿到当前得`this.history`:

```
 this.history = new HashHistory(this, options.base, this.fallback)
```

可以知道`this.history`是`HashHistory`或者`HTML5History`，用`HashHistory`为例子

在这里执行了`setupListeners`,然后执行`transitionTo`进行转换

```
route = this.router.match(location, this.current)
```

在`transitionTo`中调用了`this.router.match`进行了匹配

### match

代码在：`src\index.js`

```
  // vueRouter得构造函数
  this.matcher = createMatcher(options.routes || [], this)
  //
  match (raw: RawLocation, current?: Route, redirectedFrom?: Location): Route {
    return this.matcher.match(raw, current, redirectedFrom)
  }
  // vue-router-dev\src\create-matcher.js
  export type Matcher = {
  match: (raw: RawLocation, current?: Route, redirectedFrom?: Location) => Route;
  addRoutes: (routes: Array<RouteConfig>) => void;
  addRoute: (parentNameOrRoute: string | RouteConfig, route?: RouteConfig) => void;
  getRoutes: () => Array<RouteRecord>;
};
```

可以知道`Matcher`总共是有 4 个方法得实现得，`match`,`addRoutes`,`addRoute`,`getRoutes`

#### match 方法

match 方法可以看名字就知道，这个方法是用来匹配一些东西得。在路由中有 2 个重要得概念：`location`和`Route`，他们的数据结构定义在`flow/declarations.js`

```
// 与浏览器提供的window.location部分结构有点类似
declare type Location = {
  _normalized?: boolean;
  name?: string;
  path?: string;
  hash?: string;
  query?: Dictionary<string>;
  params?: Dictionary<string>;
  append?: boolean;
  replace?: boolean;
}
// Route代表路由中的某一个url
declare type Route = {
  path: string;
  name: ?string;
  hash: string;
  query: Dictionary<string>;
  params: Dictionary<string>;
  fullPath: string;
  matched: Array<RouteRecord>;
  redirectedFrom?: string;
  meta?: any;
}
```

回到正题，`createMatcher`接收两个参数：一个是配置中的`options.routes`，一个是`VueRouter`的实例，这个`routes`也就是用户的路由配置

```
const Foo = { template: '<div>foo</div>' }
const Bar = { template: '<div>bar</div>' }

const routes = [
  { path: '/foo', component: Foo },
  { path: '/bar', component: Bar }
]

```

createMatcher 首先执行了：

```
const { pathList, pathMap, nameMap } = createRouteMap(routes)
```

创建了一个路由映射表，`createRouteMap`的定义在`src/create-route-map`

```
export function createRouteMap (
  routes: Array<RouteConfig>,
  oldPathList?: Array<string>,
  oldPathMap?: Dictionary<RouteRecord>,
  oldNameMap?: Dictionary<RouteRecord>,
  parentRoute?: RouteRecord
): {
  pathList: Array<string>,
  pathMap: Dictionary<RouteRecord>,
  nameMap: Dictionary<RouteRecord>
} {
  const pathList: Array<string> = oldPathList || []

  const pathMap: Dictionary<RouteRecord> = oldPathMap || Object.create(null)
  const nameMap: Dictionary<RouteRecord> = oldNameMap || Object.create(null)

  routes.forEach(route => {
    addRouteRecord(pathList, pathMap, nameMap, route, parentRoute)
  })
  for (let i = 0, l = pathList.length; i < l; i++) {
    if (pathList[i] === '*') {
      pathList.push(pathList.splice(i, 1)[0])
      l--
      i--
    }
  }

  return {
    pathList,
    pathMap,
    nameMap
  }
}
```

函数的目标是把用户的路由配置转换成一张路由映射表，包含三部分：`pathList`存放着所有的`path`,`pathMap`表示一个`path`到`RouteRecord`的映射关系，而`nameMap`表示`name`到`RouteRecord`的映射关系，来看一下创建`RouteRecord`的函数：

```
function addRouteRecord (
  pathList: Array<string>,
  pathMap: Dictionary<RouteRecord>,
  nameMap: Dictionary<RouteRecord>,
  route: RouteConfig,
  parent?: RouteRecord,
  matchAs?: string
) {
  const { path, name } = route

  const pathToRegexpOptions: PathToRegexpOptions =
    route.pathToRegexpOptions || {}
  const normalizedPath = normalizePath(path, parent, pathToRegexpOptions.strict)

  if (typeof route.caseSensitive === 'boolean') {
    pathToRegexpOptions.sensitive = route.caseSensitive
  }

  const record: RouteRecord = {
    path: normalizedPath,
    regex: compileRouteRegex(normalizedPath, pathToRegexpOptions),
    components: route.components || { default: route.component },
    alias: route.alias
      ? typeof route.alias === 'string'
        ? [route.alias]
        : route.alias
      : [],
    instances: {},
    enteredCbs: {},
    name,
    parent,
    matchAs,
    redirect: route.redirect,
    beforeEnter: route.beforeEnter,
    meta: route.meta || {},
    props:
      route.props == null
        ? {}
        : route.components
          ? route.props
          : { default: route.props }
  }

  if (route.children) {

  if (!pathMap[record.path]) {
    pathList.push(record.path)
    pathMap[record.path] = record
  }

  if (route.alias !== undefined) {
    const aliases = Array.isArray(route.alias) ? route.alias : [route.alias]
    for (let i = 0; i < aliases.length; ++i) {
      const alias = aliases[i]

      const aliasRoute = {
        path: alias,
        children: route.children
      }
      addRouteRecord(
        pathList,
        pathMap,
        nameMap,
        aliasRoute,
        parent,
        record.path || '/' // matchAs
      )
    }
  }

  if (name) {
    if (!nameMap[name]) {
      nameMap[name] = record
    } else if (process.env.NODE_ENV !== 'production' && !matchAs) {
      warn(
        false,
        `Duplicate named routes definition: ` +
          `{ name: "${name}", path: "${record.path}" }`
      )
    }
  }
}
```
