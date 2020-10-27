const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECT = 'reject'

function myPromise(fn) {
  this.status = PENDING
  this.value = ''
  this.reason = ''
  this.fullfilledCallbacks = []
  this.rejectCallbacks = []
  let _this = this
  function resolve(val) {
    if (_this.status !== PENDING) return
    _this.status = FULFILLED
    _this.value = val
    console.log(_this.fullfilledCallbacks)
    _this.fullfilledCallbacks.forEach((callback) => {
      callback(_this.value)
    })
  }
  function reject(rea) {
    if (_this.status !== PENDING) {
      _this.status = REJECT
      _this.reason = rea
      _this.rejectCallbacks.forEach((callback) => {
        callback(_this.reason)
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
      this.fullfilledCallbacks.push(function (value) {
        setTimeout(() => {
          if (typeof resolveCallback !== 'function') {
            resolve(value)
          } else {
            var x = resolveCallback(value)
            resolvePromise(Promise1, x, resolve, reject)
          }
        })
      })
      this.rejectCallbacks.push(function (reason) {
        setTimeout(() => {
          if (typeof rejectCallback !== 'function') {
            reject(reason)
          } else {
            var x = rejectCallback(reason)
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
    console.log('resolve')
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

myPromise.resolve = function (value) {
  if (value instanceof myPromise) {
    return value
  }
  return new myPromise((resolve) => {
    resolve(value)
  })
}

myPromise.reject = function (error) {
  if (error instanceof myPromise) {
    return error
  }
  return new myPromise((resolve, reject) => {
    reject(error)
  })
}

myPromise.all = function (promiseList) {
  return new myPromise((resolve, reject) => {
    let valueList = []
    let score = 0
    promiseList.forEach((list) => {
      if (list instanceof myPromise) {
        list.then(
          (data) => {
            if (score < promiseList.length - 1) {
              valueList.push(data)
              score++
            } else {
              console.log(valueList, 'valueList')
              resolve(valueList)
            }
          },
          (error) => {
            reject(error)
          }
        )
      }
    })
  })
}
// 1. 接受一个promise<arr:Promise>
// 2. 
myPromise.allSettled = function(promiseList){
  return myPromise((resolve)=>{
    if(typeof promiseList !==object) throw new Error('TypeError')
    const pLength = promsieList.length
    const ret = []
    let pCount = 0

    if(!pLength) return resolve(ret)
    for(var i=0;i<pCount;i++){
        (function(i){
          let activePromise = myPromise.resolve(promiseList[i])
          activePromise.then(result=>{
            pCount++
            // 保存到返回结果中
            result[i] = {
              type: 'fulfilled',
              value: result
            }
            if(pCount===pLength){
              resolve(result)
            }
          },reason=>{
            pCount++
            // 保存到返回结果中
            result[i] = {
              type: 'rejected ',
              value: reason 
            }
            if(pCount===pLength){
              resolve(result)
            }
          })
        })(i)
    }

  })
}
myPromise.race = function (promiseList) {
  return new Promise((resolve, reject) => {
    promiseList.forEach((promise) => {
      promise.then(
        (data) => {
          resolve(data)
        },
        (error) => {
          reject(error)
        }
      )
    })
  })
}

myPromise.prototype.catch = function () {
  return this.then(null, (error) => {
    reject(error)
  })
}

myPromise.prototype.finally = function (fn) {
  return this.then(
    (data) => {
      return new myPromise(fn).then(() => {
        return data
      })
    },
    (error) => {
      return new myPromise(fn).then(() => {
        return error
      })
    }
  )
}

Promise.all([new myPromise.resolve({ a: 1 }), new myPromise.resolve(2)]).then(
  (data) => {
    console.log(data, 'allPromise')
  }
)

Promise.race([new myPromise.resolve({ a: 1 }), new myPromise.resolve(2)]).then(
  (data) => {
    console.log(data, 'racePromise')
  }
)
