// 实现一个多并发的请求
// let urls = ['http://dcdapp.com', …];
/*
 *实现一个方法，比如每次并发的执行三个请求，如果超时（timeout）就输入null，直到全部请求完
 *batchGet(urls, batchnum=3, timeout=3000);
 *urls是一个请求的数组，每一项是一个url
 *最后按照输入的顺序返回结果数组[]
 */
// 并发请求，而且不能被请求失败影响 可以考虑allSettled
// allsettled
async function batchGet(urls, batchnum = 3, timeout = 3000) {
  let ret = [];
  while (urls.length > 0) {
    var preList = urls.splice(0, batchnum);
    let requestList = preList.map((url) => {
      return request(url, timeout);
    });
    const result = await Promise.allsettled(requestList);
    ret.concat(
      result.map((item) => {
        if (item.status === "rejected") {
          return null;
        } else {
          return item.value;
        }
      })
    );
  }
  return ret;
}
function request(url, timeout) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject();
    }, timeout);
    // ajax发送请求
    ajax({ url }, (data) => {
      resolve(data);
    });
  });
}
// urls为一个不定长的数组
batchGet(["http1", "http2", "http3"]);
