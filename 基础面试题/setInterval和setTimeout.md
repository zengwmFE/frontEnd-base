// setInterval 需要注意的点?定时器为什么是不精确的?setTimeout(1)和 setTimeout(2)之间的区别

## setInterval

> var intervalID = scope.setInterval(func, delay, [arg1, arg2, ...]);
> var intervalID = scope.setInterval(code, delay);

- `func`:要重复调用的函数。`A function to be executed every delay milliseconds. The function is not passed any arguments, and no return value is expected.`
- `code`:这个语法是可选的，你可以传递一个字符串来代替一个函数对象，传递的字符串会被编译然后每个`delay`毫秒时间内执行一次。（不被推荐）
- `delay`:每次延迟的毫秒数
