/**
 * 防抖：
 * 定义：你尽管触发事件，但是我在一定在事件触发后的后的n秒才会去执行这个函数，
 * 如果在此期间又触发了这个事件，那么以新的事件为主
 * 可以扩展
 */
// debounce hooks

function useDebounce(fn, delay, deep = []) {
  const { current } = useRef({ fn, timer: null })
  useEffect(() => {
    current.fn = fn
  }, [fn])
  return useCallback(function f(...args) {
    if (current.timer) clearTimeout(current.timer)
    current.timer = setTimeout(() => {
      current.fn.call(this, ...args)
    }, delay)
  }, deep)
}

// js
function debounce(fn, wait, imm = false) {
  let timer = null
  return function () {
    let context = this
    let arg = arguments
    let ret = ''
    if (timer) clearTimeout(timer) // 重新即时
    if (imm) {
      var callnow = !timer
      timer = setTimeout(function () {
        timer = null
      }, wait)
      if (callnow) ret = fn.apply(context, arguments)
    } else {
      setTimeout(() => {
        fn.apply(context, arguments)
      }, wait)
    }
    return ret
  }
}
