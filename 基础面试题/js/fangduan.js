// 实现一个多并发的请求
// let urls = ['http://dcdapp.com', …];
/*
	*实现一个方法，比如每次并发的执行三个请求，如果超时（timeout）就输入null，直到全部请求完
	*batchGet(urls, batchnum=3, timeout=3000);
	*urls是一个请求的数组，每一项是一个url
	*最后按照输入的顺序返回结果数组[]
*/
function task (str, timeout) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject('timeout')
      }, timeout)

      // network request
      setTimeout(() => {
        resolve(str)
      }, Math.random() > 0.5 ? timeout : timeout - 100)
    })
  }

  async function request (list, timeout = 1000, splitNum = 3) {
    let result = []
    let count = 1
    while (list.length > 0) {
      const curList = list.splice(0, splitNum)
      const curTasks = curList.map(item => {
        return task(item, timeout)
      })
      const curResult = await Promise.allSettled(curTasks) || []
      console.info(curResult, count++)
      result = result.concat(curResult.map(({ status, value, reason }) => {
        if (status === 'fulfilled') {
          return value
        } else if (status === 'rejected') {
          return reason
        }
      }))
    }

    console.info(result)
  }

  request([1, 3, 43, 43, 43, 2, 23, 34, 32])