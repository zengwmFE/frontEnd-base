const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECT = 'reject'

function myPromise(fn) {
  this.status = PENDING
  this.value = ''
  this.reason = ''
  this.fullfilledCallbacks = []
  this.rejectCallbacks = []
  function resolve(val) {
    if (this.status !== PENDING) return
    this.status = FULFILLED
    this.value = val
    this.fullfilledCallbacks.forEach((callback) => {
      callback()
    })
  }
  function reject(rea) {
    if (this.status !== PENDING) {
      this.status = REJECT
      this.reason = rea
      this.rejectCallbacks.forEach((callback) => {
        callback()
      })
    }
  }
  try {
    fn(resolve, reject)
  } catch (err) {
    reject(err)
  }
}

myPromise.prototype.then = function (resolveCallback, rejectCallback) {
  let realResolveCallback = resolveCallback
  let realRejectCallback = rejectCallback
  const that = this
  if (typeof resolveCallback !== 'function') {
    realResolveCallback = () => this.value
  }
  if (typeof rejectCallback !== 'function') {
    realRejectCallback = () => this.reason
  }
  let Promise1 = null
  if (this.status === FULFILLED) {
    Promise1 = new myPromise((resolve, reject) => {
      setTimeout(() => {
        if (typeof resolveCallback !== 'function') {
          resolve(this.value)
        } else {
          // 获取callback的return,判断当前then里面返回了promise
          var x = resolveCallback(this.value)
          // 将x深度遍历，知道x是一个原始值或者一个非函数的对象
          resolvePromise(Promise1, x, resolve, reject)
        }
      })
    })
  }
  if (this.status === REJECT) {
    Promise1 = new myPromise((resolve, reject) => {
      setTimeout(() => {
        if (typeof rejectCallback !== 'function') {
          reject(this.reason)
        } else {
          var x = rejectCallback(this.reason)
          resolvePromise(Promise1, x, resolve, reject)
        }
      })
    })
  }

  if (this.status === PENDING) {
    // 防止then的调用时期，状态没有发生更改
    Promise1 = new myPromise((resolve, reject) => {
      this.fullfilledCallbacks.push(function () {
        setTimeout(() => {
          if (typeof resolveCallback !== 'function') {
            resolve(that.value)
          } else {
            var x = resolveCallback(that.value)
            resolvePromise(Promise1, x, resolve, reject)
          }
        })
      })
      this.rejectCallbacks.push(function () {
        setTimeout(() => {
          if (typeof rejectCallback !== 'function') {
            reject(that.reason)
          } else {
            var x = rejectCallback(that.reason)
            resolvePromise(Promise1, x, resolve, reject)
          }
        })
      })
    })
  }
  return Promise1
}
function resolvePromise(promise, x, resolve, reject) {
  if (promise === x) {
    throw new Error('promise and x is the same')
  }

  if (typeof x === 'object' && x === null) {
    resolve(x)
    return
  }
  if (typeof x === 'object' || typeof x === 'function') {
    // 是函数
    try {
      let then = x.then
    } catch (err) {
      reject(err)
    }
    then.call(
      x,
      function (y) {
        resolvePromise(promise, y, resolve, reject)
      },
      function (err) {
        reject(err)
      }
    )
  } else {
    resolve(x)
  }
}
