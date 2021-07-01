const PENDING = 'PENDING'
const FULFILLED = 'FULFILLED'
const REJECTED = 'REJECTED'
function resolvePromise(promise2, x, resolve, reject) {
  if (promise2 === x) {
    throw new Error('循环引用error')
  }
  if (x instanceof MyPromise) {
    if (x.state === PENDING) {
      x.then((r) => {
        resolvePromise(promise2, r, resolve, reject)
      })
    } else {
      x.state === FULFILLED && resolve(x)
      x.state === REJECTED && reject(x)
    }
  }
  if ((typeof x === 'object' || typeof x === 'function') && x !== null) {
    // 代表这个地方是一个thenable对象,就要对x.then里面的内容进行处理
    if (typeof x.then === 'function') {
      x.then((r) => {
        resolvePromise(promise2, r, resolve, reject)
      }, reject)
    } else {
      resolve(x)
    }
  } else {
    resolve(x)
  }
}
class MyPromise {
  constructor(fn) {
    this.fulfilledCallbacks = []
    this.rejectedCallbacks = []
    this.state = PENDING
    this.value = undefined
    let resolve = (val) => {
      if ((typeof val === 'object' || typeof val === 'function') && val.then) {
        resolvePromise(this, val, resolve, reject)
        return
      }
      setTimeout(() => {
        if (this.state === PENDING) {
          this.state = FULFILLED
          this.value = val
          this.fulfilledCallbacks.map((item) => item(val))
        }
      })
    }
    let reject = (val) => {
      if ((typeof val === 'object' || typeof val === 'function') && val.then) {
        resolvePromise(this, val, resolve, reject)
        return
      }
      setTimeout(() => {
        if (this.state === PENDING) {
          this.state = FULFILLED
          this.value = val
          this.rejectedCallbacks.map((item) => item(val))
        }
      })
    }
    fn(resolve, reject)
  }
  then(onFulfilled, onRejected) {
    var realOnFulFilled = onFulfilled
    if (typeof realOnFulFilled !== 'function') {
      realOnFulFilled = (val) => val
    }
    var realOnRejected = onRejected
    if (typeof realOnFulFilled !== 'function') {
      realOnRejected = (err) => {
        throw err
      }
    }
    let promise2 = null
    if (this.state === FULFILLED) {
      promise2 = new MyPromise((resolve, reject) => {
        if (typeof onFulfilled !== 'function') {
          resolve(this.value)
        } else {
          realOnFulFilled(this.value)
          resolvePromise(promise2, x, resolve, reject)
        }
      })
    }
    if (this.state === REJECTED) {
      promise2 = new MyPromise((resolve, reject) => {
        if (typeof onRejected !== 'function') {
          reject(this.value)
        } else {
          var x = realOnRejected(this.value)
          resolvePromise(promise2, x, resolve, reject)
        }
      })
    }
    if (this.state === PENDING) {
      promise2 = new MyPromise((resolve, reject) => {
        this.fulfilledCallbacks.push(() => {
          if (typeof onFulfilled !== 'function') {
            resolve(this.value)
          } else {
            let x = realOnFulFilled(this.value)
            resolvePromise(promise2, x, resolve, reject)
          }
        })
        this.rejectedCallbacks.push(() => {
          if (typeof onRejected !== 'function') {
            reject(this.value)
          } else {
            let x = realOnRejected(this.value)
            resolvePromise(promise2, x, resolve, reject)
          }
        })
      })
    }
    return promise2
  }
  static all(promiseArray) {
    let proArr = []
    let proTimes = 0
    return new MyPromise((resolve, reject) => {
      function dealPromise(index, result, resolve) {
        proArr[index] = result
        proTimes++
        if (proTimes === promiseArray.length) {
          resolve(proArr)
        }
      }
      for (let i = 0; i < promiseArray.length; i++) {
        promiseArray[i].then(
          (res) => {
            dealPromise(i, res, resolve)
          },
          (err) => reject(error)
        )
      }
    })
  }
  static resolve(val) {
    if (val instanceof MyPromise) return val
    return new MyPromise((resolve) => {
      resolve(val)
    })
  }
  static reject(val) {
    if (val instanceof MyPromise) return val

    return new MyPromise((resolve, reject) => {
      reject(val)
    })
  }
  static race(promiseArr) {
    return new MyPromise((resolve, reject) => {
      if (!promiseArr.length) {
        return resolve()
      } else {
        for (let i = 0; i < promiseArr.length; i++) {
          promiseArr[i].then(
            (res) => {
              resolve(res)
            },
            (error) => {
              return reject(error)
            }
          )
        }
      }
    })
  }
  catch(onRejected) {
    this.then(null, onRejected)
  }
  static allSettled(promiseArr) {
    return new MyPromise((resolve, reject) => {
      let len = promiseArr.length
      let result = []
      let count = 0
      for (let i = 0; i < len; i++) {
        promiseArr[i].then(
          (res) => {
            count++
            result.push({
              status: 'fulfilled',
              value: res,
            })
            if (count === len) {
              resolve(result)
            }
          },
          (error) => {
            count++
            result.push({
              status: 'rejected',
              reason: error,
            })
            if (count === len) {
              resolve(result)
            }
          }
        )
      }
    })
  }
  finally(fn) {
    return this.then(
      (res) => {
        return MyPromise.resolve(fn()).then(() => {
          return res
        })
      },
      (error) => {
        return MyPromise.resolve(fn()).then(() => {
          throw res
        })
      }
    )
  }
}
MyPromise.resolve(1)
  .then((res) => {
    return 2
  })
  .finally((res) => {
    console.log('无论如何都会执行', res)
    return 1
  })
  .then((res) => {
    console.log(res)
  })
