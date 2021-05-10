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
  // 将path给标准化
  const normalizedPath = normalizePath(path, parent, pathToRegexpOptions.strict)

  // 创建一个routeRecord
  const record: RouteRecord = {
    // 路由规范后的路径
    path: normalizedPath,
    // 路由正则表达
    regex: compileRouteRegex(normalizedPath, pathToRegexpOptions),
    // 将我们写的route.component转成了{components}
    components: route.components || { default: route.component },
    // 别名
    alias: route.alias
      ? typeof route.alias === 'string'
        ? [route.alias]
        : route.alias
      : [],
    instances: {},
    enteredCbs: {},
    // 组件名
    name,
    // 父组件
    parent,
    matchAs,
    // 重定向
    redirect: route.redirect,
    beforeEnter: route.beforeEnter,
    // route声明的元数据
    meta: route.meta || {},
    props:
      route.props == null
        ? {}
        : route.components
          ? route.props
          : { default: route.props }
  }

  if (route.children) {

     route.children.forEach(child => {
      const childMatchAs = matchAs
        ? cleanPath(`${matchAs}/${child.path}`)
        : undefined
      addRouteRecord(pathList, pathMap, nameMap, child, record, childMatchAs)
    })
   }
  }

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
    }
  }
}
```

声明了`routeRecord`之后，然后就判断了 routes 是否声明了`children`属性

1. 如果配置了 children 属性，那么就递归执行`addRouteRecord`,将`children`的 route 也做成一个一样的 record，这样执行完之后，父路由和子路由就形成了一个类似树形的结构
2. 开始处理 pathMap 和 pathList,将`path`保存到`pathList`，然后以`path`为`key`，`record`为 value，将`pathMap`储存起来
3. 处理`route`的`alias`,如果`alias`是数组，那就作为数组，反之则加入数组，然后构成一个`aliasRoute`，然后递归调用`addRouteRecord`对这个`route`进行处理，在这里就是相当于在`routesRecord`重新创建了一个路径为`alias`的路由，然后加入到`pathMap`以及`nameMap`中
4. 最后对 name 进行处理，去重，存入到`nameMap`中,`key`为 name,`value`为`record`

创建完了`routeRecord`后回到`createMatcher`,
可以看到`createMatcher`向外部提供了 4 个方法:`match`,`addRoute`,`getRoutes`,`addRoutes`

```
return {
    match,
    addRoute,
    getRoutes,
    addRoutes
  }
```

### addRoutes

```
function addRoutes (routes) {
    createRouteMap(routes, pathList, pathMap, nameMap)
  }
```

这个方法是用来，动态创建`RouteRecord`，根据我们传入的`pathList`,`routes`

### match

```
function match (
    raw: RawLocation,
    currentRoute?: Route,
    redirectedFrom?: Location
  ): Route {
    const location = normalizeLocation(raw, currentRoute, false, router)
    const { name } = location

    if (name) {
      const record = nameMap[name]
      if (process.env.NODE_ENV !== 'production') {
        warn(record, `Route with name '${name}' does not exist`)
      }
      if (!record) return _createRoute(null, location)
      const paramNames = record.regex.keys
        .filter(key => !key.optional)
        .map(key => key.name)

      if (typeof location.params !== 'object') {
        location.params = {}
      }

      if (currentRoute && typeof currentRoute.params === 'object') {
        for (const key in currentRoute.params) {
          if (!(key in location.params) && paramNames.indexOf(key) > -1) {
            location.params[key] = currentRoute.params[key]
          }
        }
      }

      location.path = fillParams(record.path, location.params, `named route "${name}"`)
      return _createRoute(record, location, redirectedFrom)
    } else if (location.path) {
      location.params = {}
      for (let i = 0; i < pathList.length; i++) {
        const path = pathList[i]
        const record = pathMap[path]
        if (matchRoute(record.regex, location.path, location.params)) {
          return _createRoute(record, location, redirectedFrom)
        }
      }
    }
    // no match
    return _createRoute(null, location)
  }
```
首先可以看到调用了`normalizeLocation`,获取了路由的name，如果这个路由的`name`不存在就判断`location.path`
首先他在`nameMap`里面去获取了当前路由的记录，如果不存在那么就会创建一个为null的路径，反之则去获取`record`对应的`paramsNames`，再对比当前传入的`currentParams`

1. 判断key在location.params中的，同时paramsName中包含`key`的，就会将满足条件currentRoute的params覆盖到location中params
2. 然后调用fillParams方法根据`record.path`,`location.params`,去得到location.path,最后调用`_createRoute`创建一个新的路由,我们知道nameMap里面的name是固定的，没有就没有，存在就一定是单独的，但是，在pathMap中不一样，我们知道在pathMap中的`record`的path很有可能是含有参数的，因此要进行匹配，去找匹配的path通过fillParams，得到路径`location.path`,然后调用`_createRoute`创建一个新的路由

我们可以发现这里频繁的调用了`_createRoute`：
路径为：`vue-router/src/create-matcher.js`
```
 function _createRoute (
    record: ?RouteRecord,
    location: Location,
    redirectedFrom?: Location
  ): Route {
    if (record && record.redirect) {
      return redirect(record, redirectedFrom || location)
    }
    if (record && record.matchAs) {
      return alias(record, location, record.matchAs)
    }
    return createRoute(record, location, redirectedFrom, router)
  }
```
可以看到这里根据`record`的属性分成了3种：

1. redirect 对应了配置中的redirect
2. alias 对应了配置中的alias
3. createRoute这是正常会走的

那么就按照最常见的逻辑来看看`createRoute`：

```
export function createRoute (
  record: ?RouteRecord,
  location: Location,
  redirectedFrom?: ?Location,
  router?: VueRouter
): Route {
  const stringifyQuery = router && router.options.stringifyQuery

  let query: any = location.query || {}
  try {
    query = clone(query)
  } catch (e) {}

  const route: Route = {
    name: location.name || (record && record.name),
    meta: (record && record.meta) || {},
    path: location.path || '/',
    hash: location.hash || '',
    query,
    params: location.params || {},
    fullPath: getFullPath(location, stringifyQuery),
    matched: record ? formatMatch(record) : []
  }
  if (redirectedFrom) {
    route.redirectedFrom = getFullPath(redirectedFrom, stringifyQuery)
  }
  return Object.freeze(route)
}
```

### addRoute

### getRoutes
