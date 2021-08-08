## Reconciler协调器
主要作用是负责找出变化的组件，打上标记，在react16以上，为了方便打断数据结构几乎都是链表结构
会做domdiff.也会把dom元素生成，但是并不会渲染到页面上。而是先打上一个标记，等到下一个commit阶段才会真正的渲染到页面。
为什么要分成：Reconciler阶段和commit阶段
1. 因为react的打断机制，在低优先级任务执行的时候遇到高优先级的任务的时候，需要打断低优先级的任务
2. 在执行commit渲染的时候，如果打断的任务执行，需要进行的dom操作就变得多起来了，会消耗的资源很多。

### Reconciler找出变化的组件的逻辑
react发生一次更新的时候，比如ReactDom.render/setState,都会从Fiber Root开始从上往下遍历，然后逐一找到变化的节点，构建完成后会形成一颗fiber Tree,在react内部就会形成2颗树

