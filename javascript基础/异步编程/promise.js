var PENDING = "pending";
var FULFILLED = "fulfilled";
var REJECTED = "rejected";
function myPromise(fn) {
  this.status = PENDING;
  this.value = null; //
  this.reason = null;
  this.onFulfilledCallbacks = []; // 存储着成功之后的回调
  this.onRejectedCallbacks = []; // 存储着失败后的回调
  var that = this; // 保存一份this
  function resolve(value) {
    // resolve接受的应该是一个值或者一个对象
    if (that.status === PENDING) {
      that.status = FULFILLED;
      that.value = value;
      // 1. 将状态更改成fulfilled,同时将这时候的值更改成resolve传进来的内容
      // 2. 将成功数组里面的回调拿出来全部执行,执行的参数都是resolve传进来的
      that.onFulfilledCallbacks.forEach((callback) => {
        console.log(callback);
        callback(that.value);
      });
    }
  }

  function reject(reason) {
    if (that.status === PENDING) {
      that.status = REJECTED;
      that.reason = reason;
      console.error(reject);
      // 1. 将状态更改成rejected，同时将这个时候的拒绝原因更改成reject的值
      // 2. 将所有失败数组里面的回调都拿出来全部执行，而执行的参数都是reject的参数
      that.onRejectedCallbacks.forEach((callback) => {
        callback(that.reason);
      });
    }
  }
  try {
    fn(resolve, reject);
  } catch (err) {
    reject(error);
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
    var promise2 = new myPromise(function (resolve, reject) {
      // 满足第2个条件，让他生成了一个宏任务
      setTimeout(() => {
        try {
          if (typeof onFulfilled !== "function") {
            resolve(that.value);
          } else {
            var x = realOnFulfilled(that.value); // 接受then回调函数的返回值
            console.log(x);
            resolvePromise(promise2, x, resolve, reject);
          }
        } catch (err) {
          reject(err);
        }
      }, 0);
    });
  }

  if (this.status === REJECTED) {
    var promise2 = new myPromise(function (resolve, reject) {
      setTimeout(() => {
        try {
          // 关键两步，判断是否是function,如果不是则直接返回返回当前
          if (typeof onRejected !== "function") {
            resolve(that.reason);
          } else {
            var x = realOnRejected(that.reason);
            resolvePromise(promise2, x, resolve, reject);
          }
        } catch (err) {
          reject(err);
        }
      }, 0);
    });
  }
  if (this.status === PENDING) {
    var promise2 = new myPromise((resolve, reject) => {
      this.onFulfilledCallbacks.push(function () {
        setTimeout(() => {
          try {
            if (typeof onFulfilled !== "function") {
              resolve(that.value);
            } else {
              var x = realOnFulfilled(that.value);
              resolvePromise(promise2, x, resolve, reject);
            }
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  }
  return promise2;
};
function resolvePromise(promise, x, resolve, reject) {
  // 如果promise和x指向同一个对象
  // promise的作用，为了判断x是否和promise传进相同的内容
  // if()
  if (promise === x) {
    return reject(new TypeError("返回值和promise是相同的值"));
  }
  console.log(x, "----x----");
  if (x instanceof myPromise) {
    // 如果当前这个值传进then中的参数是一个promise
    x.then(function (y) {
      // 这个y值就是在x里面resolve的值
      resolvePromise(promise, y, resolve, reject);
    }, reject);
  } else if (typeof x === "object" && typeof x === "function") {
    if (x === null) {
      return resolve(x);
    }

    try {
      var then = x.then;
    } catch (err) {
      reject(err);
    }

    if (typeof then === "function") {
      var caller = false;
      try {
        then.call(
          x,
          function (y) {
            if (caller) return;
            resolvePromise(promise, y, resolve, reject);
          },
          function (err) {
            if (caller) return;
            reject(err);
          }
        );
      } catch (error) {
        if (caller) return;
        reject(error);
      }
    } else {
      // 一直递归，直到当前x传入的值不是对象之后，就将这个值返回，并将当前状态变成fulfilled或者rejected
      resolve(x);
    }
  } else {
    console.log(x);
    resolve(x);
  }
}

// Promise.resolve(1)的实现

myPromise.resolve = function (value) {
  if (value instanceof myPromise) {
    return value;
  }
  return new myPromise((resolve) => {
    resolve(value);
  });
};

myPromise.reject = function (reason) {
  if (reason instanceof myPromise) {
    return reason;
  }
  console.error(reason);
  return new myPromise((reject) => {
    reject(reason);
  });
};

myPromise.all = function (promiselist) {
  // 接受一个array的promise
  // return promise
  var allPromise = new myPromise((resolve, reject) => {
    var count = 0;
    var result = [];
    var length = promiselist.length;
    if (length === 0) {
      return resolve([]);
    }
    promiselist.forEach((promise, index) => {
      // al利用resolve中如果传入的参数是promise的实例的话，它就会直接返回这个参数，这样then其实接的是promise的resolve的值
      MyPromise.resolve(promise).then(
        function (data) {
          count++;
          result[index] = data;
          if (count === length) {
            resolve(result);
          }
        },
        function (reason) {
          reject(reason);
        }
      );
    });
  });
  return allPromise;
};

myPromise.race = function (promiselist) {
  var racePromise = new Promise((resolve, reject) => {
    if (promiselist.length) {
      resolve([]);
    }
    promiselist.forEach((promiseItem, index) => {
      myPromise.resolve(promiseItem).then(
        (data) => {
          resolve(data);
        },
        (err) => {
          reject(err);
        }
      );
    });
  });
  return racePromise;
};

myPromise.prototype.catch = function (onRejected) {
  // catch其实就是在promise返回的时候，仅仅调用reject的回调，这样就只能捕获到错误的回调了，出现正确的也没有任何的打印了
  // 其实catch就是then的语法糖
  this.then(null, onRejected);
};

myPromise.prototype.finally = function (fn) {
  return this.then(
    function (value) {
      return myPromise.resolve(fn()).then(function () {
        return value;
      });
    },
    function (error) {
      return myPromise.resolve(fn()).then(function () {
        throw error;
      });
    }
  );
};
myPromise.reject(1).then((data) => {
  console.log(data);
});
