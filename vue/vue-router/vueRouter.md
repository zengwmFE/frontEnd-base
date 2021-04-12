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

`match`接收 3 个参数:`raw:rawLocation`,`currentRoute:route`,`redirectedFrom:location`，可以知道`raw`是一个`rawLocation`,`currentRoute`代表是当前得路由
返回值是一个`route`对象

1. 执行`normalizeLocation`方法（`src/util/location`）

```
export function normalizeLocation (
  raw: RawLocation,
  current: ?Route,
  append: ?boolean,
  router: ?VueRouter
): Location {
  let next: Location = typeof raw === 'string' ? { path: raw } : raw
  if (next._normalized) {
    return next
  } else if (next.name) {
    next = extend({}, raw)
    const params = next.params
    if (params && typeof params === 'object') {
      next.params = extend({}, params)
    }
    return next
  }

  const parsedPath = parsePath(next.path || '')
  const basePath = (current && current.path) || '/'
  const path = parsedPath.path
    ? resolvePath(parsedPath.path, basePath, append || next.append)
    : basePath

  const query = resolveQuery(
    parsedPath.query,
    next.query,
    router && router.options.parseQuery
  )

  let hash = next.hash || parsedPath.hash
  if (hash && hash.charAt(0) !== '#') {
    hash = `#${hash}`
  }

  return {
    _normalized: true,
    path,
    query,
    hash
  }
}
```

> 首先可以看到这个方法，返回了 4 个值：`_normalized`,`path`,`query`,`hash`

来从开头分析这个方法得工作原理：
next：为对象，如果传入得`raw`不是对象得话，那么就生成一个`{path:raw}`
判断这个路径是不是已经被规范化过得`_normalized`
接下来对`raw`，进行`extends`，进行了一次浅拷贝，然后对`params`进行了浅拷贝

接下来对`path`,`query`的处理

2. 经过了路由标准化之后，优先对`name`进行了判断，然后去找在`nameMap`存放好的 record，然后构建一个新的 route 返回

3. 如果没有`name`属性的话，就直接通过`path`来生成`route`,由于`path`可能含有`param`这种情况，这样的话，里面的路径就不是唯一的了，所以他要对于`pathList`所有的路劲列表进行遍历，然后通过`matchRoute`匹配出对应的`route`,最后返回新的`route`

最后`createRoute`返回的`route`形式：

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

首先看一下返回`Object.freeze(route)`

> Object.freeze() 方法可以冻结一个对象。一个被冻结的对象再也不能被修改；冻结了一个对象则不能向这个对象添加新的属性，不能删除已有属性，不能修改该对象已有属性的可枚举性、可配置性、可写性，以及不能修改已有属性的值。此外，冻结一个对象后该对象的原型也不能被修改。freeze() 返回和传入的参数相同的对象

### addRoute

```
function addRoutes (routes) {
createRouteMap(routes, pathList, pathMap, nameMap)
}
// src\create-route-map.js
export function createRouteMap(
  routes: Array<RouteConfig>,
  oldPathList?: Array<string>,
  oldPathMap?: Dictionary<RouteRecord>,
  oldNameMap?: Dictionary<RouteRecord>,
  parentRoute?: RouteRecord
): {
  pathList: Array<string>,
  pathMap: Dictionary<RouteRecord>,
  nameMap: Dictionary<RouteRecord>,
} {
  const pathList: Array<string> = oldPathList || []
  const pathMap: Dictionary<RouteRecord> = oldPathMap || Object.create(null)
  const nameMap: Dictionary<RouteRecord> = oldNameMap || Object.create(null)

  routes.forEach((route) => {
    addRouteRecord(pathList, pathMap, nameMap, route, parentRoute)
  })

  // ensure wildcard routes are always at the end
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
    nameMap,
  }
}
```

直接调用了`createRouteMap`，可以看到这些东西，都是很熟悉得，所以`addRoutes`得主要功能就是，调用了`addRouteRecord`,创建了一个新的`routeRecord`，之后，可以在`pathList`,`pathMap`,甚至在`nameMap`能找到这个新的`route`
