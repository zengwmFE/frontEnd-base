var PENDING = "pending";
var FULFILLED = "fulfilled";
var REJECTED = "rejected";
function myPromise(fn) {
  this.status = PENDING;
  this.value = null; //
  this.reason = null;

  this.onFulfilledCallbacks = []; // 存储着成功之后的回调
  this.onRejectedCallback = []; // 存储着失败后的回调
  var that = this; // 保存一份this
  function resolve(value) {
    // resolve接受的应该是一个值或者一个对象
    if (that.status === PENDING) {
      that.status = FULFILLED;
      this.value = value;
      // 1. 将状态更改成fulfilled,同时将这时候的值更改成resolve传进来的内容
      // 2. 将成功数组里面的回调拿出来全部执行,执行的参数都是resolve传进来的
      this.onFulfilledCallbacks.forEach((callback) => {
        callback(that.value);
      });
    }
  }

  function reject(reason) {
    if (that.status === PENDING) {
      that.status = REJECTED;
      that.reason = reason;
      // 1. 将状态更改成rejected，同时将这个时候的拒绝原因更改成reject的值
      // 2. 将所有失败数组里面的回调都拿出来全部执行，而执行的参数都是reject的参数
      this.onRejectedCallback((callback) => {
        callback(that.reason);
      });
    }

    try {
      fn(resolve, reject);
    } catch (err) {
      reject(error);
    }
  }
}

myPromise.prototype.then = function (onFulfilled, onRejected) {
  // 最高条件：then必须返回一个`promise`
  //   onFulfilled 和 onRejected 都是可选参数：

  // 如果onFulfilled不是一个函数，则忽略之。
  // 如果onRejected不是一个函数，则忽略之。
  // 可以这样处理
  var realOnFulfilled = onFulfilled;
  if (typeof realOnFulfilled !== "function") {
    realOnFulfilled = (value) => value;
  }

  var realOnRejected = onRejected;
  if (typeof realOnRejected !== "function") {
    realOnRejected = (reason) => reason;
  }

  // 如果onFulfilled是一个函数
  // 1. 它必须要在`promise`fulfilled后调用，且`promise`的value为其第一个参数
  // 2. 他不能在`promise`fulfilled前被调用
  // 3. 不能被多次调用
  var that = this;
  if (this.status === FULFILLED) {
    // 满足第一个条件
    var promise1 = new myPromise(function (resolve, reject) {
      setTimeout(function () {
        // 满足第2个条件，让他生成了一个宏任务
        try {
          if (typeof onFulfilled !== "function") {
            resolve(1);
          } else {
            var x = realOnFulfilled(that.value);
            resolvePromise(promise1, x, resolve, reject);
          }
        } catch (err) {
          reject(err);
        }
      }, 0);
    });
  }
};
function resolvePromise(promise, x, resolve, reject) {
  // 如果promise和x指向同一个对象
    if()
}
