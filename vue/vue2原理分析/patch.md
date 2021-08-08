### 组件更新

当数据发生变化，就会进行组件组件的更新，这个方法来自`src\core\instance\lifecycle.js`

```
Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {
    const vm: Component = this
    const prevEl = vm.$el
    const prevVnode = vm._vnode
    const restoreActiveInstance = setActiveInstance(vm)
    vm._vnode = vnode
    // Vue.prototype.__patch__ is injected in entry points
    // based on the rendering backend used.
    if (!prevVnode) {
      // initial render
      vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */)
    } else {
      // updates
      vm.$el = vm.__patch__(prevVnode, vnode)
    }
    restoreActiveInstance()
    // update __vue__ reference
    if (prevEl) {
      prevEl.__vue__ = null
    }
    if (vm.$el) {
      vm.$el.__vue__ = vm
    }
    // if parent is an HOC, update its $el as well
    if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
      vm.$parent.$el = vm.$el
    }
    // updated hook is called by the scheduler to ensure that children are
    // updated in a parent's updated hook.
  }
```

主要是靠`prevVnode`来判断当前是初始值还是更新，但是最后还是调用`__patch__`,这个方法在`web`端执行的是`patch`,这个判断是`src\platforms\web\runtime\index.js`:

```
Vue.prototype.__patch__ = inBrowser ? patch : noop
// src\platforms\web\runtime\patch.js
export const patch: Function = createPatchFunction({ nodeOps, modules })
```

很明显最后调用的`createPatchFunction`,可以看到最后返回的是`patch`函数：

```
return function patch (oldVnode, vnode, hydrating, removeOnly) {
    if (isUndef(vnode)) {
      if (isDef(oldVnode)) invokeDestroyHook(oldVnode)
      return
    }

    let isInitialPatch = false
    const insertedVnodeQueue = []

    if (isUndef(oldVnode)) {
      // empty mount (likely as component), create new root element
      isInitialPatch = true
      createElm(vnode, insertedVnodeQueue)
    } else {
      const isRealElement = isDef(oldVnode.nodeType)
      if (!isRealElement && sameVnode(oldVnode, vnode)) {
        // patch existing root node
        patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly)
      } else {
        if (isRealElement) {
          // mounting to a real element
          // check if this is server-rendered content and if we can perform
          // a successful hydration.
          if (oldVnode.nodeType === 1 && oldVnode.hasAttribute(SSR_ATTR)) {
            oldVnode.removeAttribute(SSR_ATTR)
            hydrating = true
          }
          if (isTrue(hydrating)) {
            if (hydrate(oldVnode, vnode, insertedVnodeQueue)) {
              invokeInsertHook(vnode, insertedVnodeQueue, true)
              return oldVnode
            } else if (process.env.NODE_ENV !== 'production') {
              warn(
                'The client-side rendered virtual DOM tree is not matching ' +
                'server-rendered content. This is likely caused by incorrect ' +
                'HTML markup, for example nesting block-level elements inside ' +
                '<p>, or missing <tbody>. Bailing hydration and performing ' +
                'full client-side render.'
              )
            }
          }
          // either not server-rendered, or hydration failed.
          // create an empty node and replace it
          oldVnode = emptyNodeAt(oldVnode)
        }

        // replacing existing element
        const oldElm = oldVnode.elm
        const parentElm = nodeOps.parentNode(oldElm)

        // create new node
        createElm(
          vnode,
          insertedVnodeQueue,
          // extremely rare edge case: do not insert if old element is in a
          // leaving transition. Only happens when combining transition +
          // keep-alive + HOCs. (#4590)
          oldElm._leaveCb ? null : parentElm,
          nodeOps.nextSibling(oldElm)
        )

        // update parent placeholder node element, recursively
        if (isDef(vnode.parent)) {
          let ancestor = vnode.parent
          const patchable = isPatchable(vnode)
          while (ancestor) {
            for (let i = 0; i < cbs.destroy.length; ++i) {
              cbs.destroy[i](ancestor)
            }
            ancestor.elm = vnode.elm
            if (patchable) {
              for (let i = 0; i < cbs.create.length; ++i) {
                cbs.create[i](emptyNode, ancestor)
              }
              // #6513
              // invoke insert hooks that may have been merged by create hooks.
              // e.g. for directives that uses the "inserted" hook.
              const insert = ancestor.data.hook.insert
              if (insert.merged) {
                // start at index 1 to avoid re-invoking component mounted hook
                for (let i = 1; i < insert.fns.length; i++) {
                  insert.fns[i]()
                }
              }
            } else {
              registerRef(ancestor)
            }
            ancestor = ancestor.parent
          }
        }

        // destroy old node
        if (isDef(parentElm)) {
          removeVnodes([oldVnode], 0, 0)
        } else if (isDef(oldVnode.tag)) {
          invokeDestroyHook(oldVnode)
        }
      }
    }

    invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)
    return vnode.elm
  }
```

最后判断`oldVnode`是否存在，判断是否是首次渲染，可以看到除了` const isRealElement = isDef(oldVnode.nodeType)`还有`sameVnode`方法

```
function sameVnode (a, b) {
  return (
    a.key === b.key && ( // key值
      (
        a.tag === b.tag && // 标签名
        a.isComment === b.isComment && // 是否为注释节点
        isDef(a.data) === isDef(b.data) && // 是否定义了data，data包含了一些具体信息，例如onclick,style
        sameInputType(a, b) // 当标签是input的时候，type必须也一样
      ) || (
        isTrue(a.isAsyncPlaceholder) &&
        a.asyncFactory === b.asyncFactory &&
        isUndef(b.asyncFactory.error)
      )
    )
  )
}
```

在这里通过`key`、`tag`、`isComment`、`data`等数据来判断是否是同一个`vnode`，来进行逻辑判断不同的逻辑更新

#### 问题提出
如果两个节点都是一样的，  那么就深入检查它的子节点，如果两个节点不一样，那么就认为`vnode`完全被改变了，就可以直接替换`oldVnode`
但是如果这两个节点不一样但是它们的子节点相同，`domdiff`是逐层比较的，如果第一层不一样，那么就不会在比较下一层了

### 新旧节点不同

大概可以分为：

1. 创建新节点
2. 更新父的占位符节点
3. 删除旧节点

```
  // replacing existing element
        const oldElm = oldVnode.elm
        const parentElm = nodeOps.parentNode(oldElm)

  // create new node
      createElm(
          vnode,
          insertedVnodeQueue,
          // extremely rare edge case: do not insert if old element is in a
          // leaving transition. Only happens when combining transition +
          // keep-alive + HOCs. (#4590)
          oldElm._leaveCb ? null : parentElm,
          nodeOps.nextSibling(oldElm)
        )
```

创建新节点调用的是`createEl`方法，以当前旧节点为参考，创建新的节点，并插入到`DOM`中

```
  // update parent placeholder node element, recursively
    if (isDef(vnode.parent)) {
          let ancestor = vnode.parent
          const patchable = isPatchable(vnode)
          while (ancestor) {
            for (let i = 0; i < cbs.destroy.length; ++i) {
              cbs.destroy[i](ancestor)
            }
            ancestor.elm = vnode.elm
            if (patchable) {
              for (let i = 0; i < cbs.create.length; ++i) {
                cbs.create[i](emptyNode, ancestor)
              }
              // #6513
              // invoke insert hooks that may have been merged by create hooks.
              // e.g. for directives that uses the "inserted" hook.
              const insert = ancestor.data.hook.insert
              if (insert.merged) {
                // start at index 1 to avoid re-invoking component mounted hook
                for (let i = 1; i < insert.fns.length; i++) {
                  insert.fns[i]()
                }
              }
            } else {
              registerRef(ancestor)
            }
            ancestor = ancestor.parent
          }
    }
```

找到当前`vnode`的父占位符节点，先执行`cbs.destory`钩子函数，如果当前占位符是一个可挂载的节点，则需要执行`cbs.create`钩子函数

```
 if (isDef(parentElm)) {
          removeVnodes([oldVnode], 0, 0)
        } else if (isDef(oldVnode.tag)) {
          invokeDestroyHook(oldVnode)
  }
```

将`oldVnode`从当前`DOM`树中删除，如果还存在父节点，要需要执行`removeVnodes`

```
  function removeVnodes (vnodes, startIdx, endIdx) {
    for (; startIdx <= endIdx; ++startIdx) {
      const ch = vnodes[startIdx]
      if (isDef(ch)) {
        if (isDef(ch.tag)) {
          removeAndInvokeRemoveHook(ch)
          invokeDestroyHook(ch)
        } else { // Text node
          removeNode(ch.elm)
        }
      }
    }
  }
  function removeNode (el) {
    const parent = nodeOps.parentNode(el)
    // element may have already been removed due to v-html / v-text
    if (isDef(parent)) {
      nodeOps.removeChild(parent, el)
    }
  }
  function removeAndInvokeRemoveHook (vnode, rm) {
    if (isDef(rm) || isDef(vnode.data)) {
      let i
      const listeners = cbs.remove.length + 1
      if (isDef(rm)) {
        // we have a recursively passed down rm callback
        // increase the listeners count
        rm.listeners += listeners
      } else {
        // directly removing
        rm = createRmCb(vnode.elm, listeners)
      }
      // recursively invoke hooks on child component root node
      if (isDef(i = vnode.componentInstance) && isDef(i = i._vnode) && isDef(i.data)) {
        removeAndInvokeRemoveHook(i, rm)
      }
      for (i = 0; i < cbs.remove.length; ++i) {
        cbs.remove[i](vnode, rm)
      }
      if (isDef(i = vnode.data.hook) && isDef(i = i.remove)) {
        i(vnode, rm)
      } else {
        rm()
      }
    } else {
      removeNode(vnode.elm)
    }
  }

```

在这里做的操作

1. 遍历待删除的`vnodes`
2. 调用`removeAndInvokeRemoveHook`的`cbs.remove[i](vnode, rm)`来删除对应的钩子，如果还存在子节点则进行递归调用`removeAndInvokeRemoveHook`
3. 调用`invokeDestroyHook`执行销毁钩子，如果存在子节点则进行递归调用`invokeDestroyHook`
4. 执行`removeNode`调用平台`DOM API`删除真正的`DOM`节点:`nodeOps.removeChild(parent, el)`

### 新旧节点相同

```
 if (!isRealElement && sameVnode(oldVnode, vnode)) {
        // patch existing root node
        patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly)
  }
```

当新旧节点相同的时候，就会调用`patchVnode`将`vnode patch`到旧的`vnode`上将执行以下主要过程

- 如果两个`vnode`相等，不需要`patch`
- 如果是异步占位，执行`hydrate`方法或者定义`isAsyncPlaceholder`为`true`
- 当更新的`vnode`是组件`vnode`的时候，执行`i.prepatch`钩子函数，拿到最新的`vnode`组件配置以及组件的实例后，执行`updateChildComponent`方法更新`vm`实例上一系列的属性和方法
- 执行`cbs.update`钩子
- 完成`patch`过程
- 执行`postpatch`钩子

**`patch`是`vue`中`vnode diff`最复杂的操作**

```
  if (isUndef(vnode.text)) {
      if (isDef(oldCh) && isDef(ch)) {
        if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly)
      } else if (isDef(ch)) {
        if (process.env.NODE_ENV !== 'production') {
          checkDuplicateKeys(ch)
        }
        if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, '')
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue)
      } else if (isDef(oldCh)) {
        removeVnodes(oldCh, 0, oldCh.length - 1)
      } else if (isDef(oldVnode.text)) {
        nodeOps.setTextContent(elm, '')
      }
    } else if (oldVnode.text !== vnode.text) {
      nodeOps.setTextContent(elm, vnode.text)
    }
```

1. 判断`vnode`类型是否是一个文本类型且文本内容相同，则直接替换文本内容，否则根据不同的情况处理逻辑

- 如果`oldCh`和`ch`都存在且不相同，则需要调用`updateChildren`
- 当只有`ch`存在，判断旧的节点是文本节点则先将节点的文本清除，然后通过`addVnodes`将`ch`批量插入到新节点`elm`下，表示不需要旧节点了
- 当只有`oldCh`存在，将旧的节点通过`removeVnodes`清除掉，表示更新之后的是一个空的节点
- 当只有旧节点而且是文本节点的时候，需要清除其文本节点

#### updateChildren

`updateChildren`是作为`dom diff`最核心的位置，比较节点的子节点是否不一样，在`oldCh`和`ch`都存在，且不相同，就需要调用这个方法来更新子节点

```
  function updateChildren(
    parentElm,
    oldCh,
    newCh,
    insertedVnodeQueue,
    removeOnly
  ) {
    let oldStartIdx = 0;
    let newStartIdx = 0;
    let oldEndIdx = oldCh.length - 1;
    let oldStartVnode = oldCh[0];
    let oldEndVnode = oldCh[oldEndIdx];
    let newEndIdx = newCh.length - 1;
    let newStartVnode = newCh[0];
    let newEndVnode = newCh[newEndIdx];
    let oldKeyToIdx, idxInOld, vnodeToMove, refElm;
    // oldCh和newCh是一个DOMCollection作为一个DOM的集合类数组
    // removeOnly is a special flag used only by <transition-group>
    // to ensure removed elements stay in correct relative positions
    // during leaving transitions
    const canMove = !removeOnly;

    if (process.env.NODE_ENV !== "production") {
      checkDuplicateKeys(newCh);
    }
    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      //
      if (isUndef(oldStartVnode)) {
        //
        oldStartVnode = oldCh[++oldStartIdx]; // Vnode has been moved left
      } else if (isUndef(oldEndVnode)) {
        oldEndVnode = oldCh[--oldEndIdx];
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        // 如果新旧第一个vnode相同，那就进行patchVnode,然后新旧vNodeIndex都往后移动
        patchVnode(
          oldStartVnode,
          newStartVnode,
          insertedVnodeQueue,
          newCh,
          newStartIdx
        );
        oldStartVnode = oldCh[++oldStartIdx];
        newStartVnode = newCh[++newStartIdx];
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        // 判断两个sameVnode是否相同，是的话，那么就执行patchVnode,然后位置同时往前移动
        patchVnode(
          oldEndVnode,
          newEndVnode,
          insertedVnodeQueue,
          newCh,
          newEndIdx
        );
        oldEndVnode = oldCh[--oldEndIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldStartVnode, newEndVnode)) {
        // Vnode moved right
        patchVnode(
          oldStartVnode,
          newEndVnode,
          insertedVnodeQueue,
          newCh,
          newEndIdx
        );
        canMove &&
          nodeOps.insertBefore(
            parentElm,
            oldStartVnode.elm,
            nodeOps.nextSibling(oldEndVnode.elm)
          );
        oldStartVnode = oldCh[++oldStartIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldEndVnode, newStartVnode)) {
        // Vnode moved left
        patchVnode(
          oldEndVnode,
          newStartVnode,
          insertedVnodeQueue,
          newCh,
          newStartIdx
        );
        canMove &&
          nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
        oldEndVnode = oldCh[--oldEndIdx];
        newStartVnode = newCh[++newStartIdx];
      } else {
        if (isUndef(oldKeyToIdx))
          oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
        idxInOld = isDef(newStartVnode.key)
          ? oldKeyToIdx[newStartVnode.key]
          : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx);
        if (isUndef(idxInOld)) {
          // New element
          createElm(
            newStartVnode,
            insertedVnodeQueue,
            parentElm,
            oldStartVnode.elm,
            false,
            newCh,
            newStartIdx
          );
        } else {
          vnodeToMove = oldCh[idxInOld];
          if (sameVnode(vnodeToMove, newStartVnode)) {
            patchVnode(
              vnodeToMove,
              newStartVnode,
              insertedVnodeQueue,
              newCh,
              newStartIdx
            );
            oldCh[idxInOld] = undefined;
            canMove &&
              nodeOps.insertBefore(
                parentElm,
                vnodeToMove.elm,
                oldStartVnode.elm
              );
          } else {
            // same key but different element. treat as new element
            createElm(
              newStartVnode,
              insertedVnodeQueue,
              parentElm,
              oldStartVnode.elm,
              false,
              newCh,
              newStartIdx
            );
          }
        }
        newStartVnode = newCh[++newStartIdx];
      }
    }
    if (oldStartIdx > oldEndIdx) {
      refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm;
      addVnodes(
        parentElm,
        refElm,
        newCh,
        newStartIdx,
        newEndIdx,
        insertedVnodeQueue
      );
    } else if (newStartIdx > newEndIdx) {
      removeVnodes(oldCh, oldStartIdx, oldEndIdx);
    }
  }
```


### 例子一下
```
<div id="app"> <div> <ul> <li v-for="item in items" :key="item.id">{{ item.val }}</li> </ul> </div> <button @click="change">点击我</button> </div>
 <script> var app = new Vue({
    el: '#app', data: { items: [ { id: 0, val: 'A' }, { id: 1, val: 'B' }, { id: 2, val: 'C' }, { id: 3, val: 'D' } ] }, 
    methods: { 
      change() { this.items.reverse().push({ id: 4, val: 'E' }) } 
      } }) 
 </script>

```

就是初始化的时候渲染列表为`A,B,C,D`,当点击的时候将数据中`push`一个`E`并反转，结果`D,C,B,A,E`

```
old  A B C D 
new  D C B A E 
```
分析一下过程：
1. 发现`oldEndVnode`和`newStartVnode`相同，就需要将`D`插入到最前面，然后`oldEndVnode`向左移动，`newStartVnode`向右移动
2. 重复上面的过程，得到`DCBA`
3. 然后比较发现`E`没有存在这个元素，就需要调用`createEle`创建一个新的元素

###  具体分析一下`patchChildren`
1. 初始化全局变量
2. 定义循环，去遍历整个`vnode`
```
while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
  ...
}
```
3. 检测`oldStartVnode`、`oldEndVnode`。如果`oldStartVnode`不存在，`oldCh`就会朝后移动，如果`oldEndVnode`不存在,`oldCh`终止向前移动

```
 if (isUndef(oldStartVnode)) {
        //
        oldStartVnode = oldCh[++oldStartIdx]; // Vnode has been moved left
      } else if (isUndef(oldEndVnode)) {
        oldEndVnode = oldCh[--oldEndIdx];
      } 
```

4. 比较`oldStartVnode`和`newStartVnode`如果是真，则`patchVnode`同时彼此都向后移动一个`index`

```
else if(sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
        oldStartVnode = oldCh[++oldStartIdx]
        newStartVnode = newCh[++newStartIdx]
} 


```

5. 对比`oldEndVnode`和`newEndVnode`如果为真则执行`patchVnode`同时向前移动一位

```
else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx)
        oldEndVnode = oldCh[--oldEndIdx]
        newEndVnode = newCh[--newEndIdx]
} 
```

6. 对比 oldStartVnode 和 newEndVnode 如果为真则执行 patchVnode，然后将该节点移动到 vnode 数组最后一位
```
else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx)
        canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm))
        oldStartVnode = oldCh[++oldStartIdx]
        newEndVnode = newCh[--newEndIdx]
} 
```

7. 对比 oldEndVnode 和 newStartVnode 如果为真则执行 patchVnode，然后将该节点移动到`vnode`数组第一位

```
else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
        canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm)
        oldEndVnode = oldCh[--oldEndIdx]
        newStartVnode = newCh[++newStartIdx]
      }
```


8. 对比`idx`如果没有相同的`idx`则执行`createEle`

```
 if (isUndef(idxInOld)) { // New element
    createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx)
```
9. 对比`idx`如果两个`vnode`相同，那么就把`vnode patch`，反之认作是新元素，

```
if (sameVnode(vnodeToMove, newStartVnode)) {
            patchVnode(vnodeToMove, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
            oldCh[idxInOld] = undefined
            canMove && nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm)
} 
```

10. 如果老 vnode 数组的开始索引大于结束索引，说明新 node 数组长度大于老 vnode 数组，执行 addVnodes 方法添加这些新 vnode 到 DOM 中
当`oldStartVnode`大于`oldEndVnode`

```
if (oldStartIdx > oldEndIdx) {
      refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm
      addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue)
    } 
```
则是因为在`newVnode`的长度，要大于`oldVnode`就应该将新增加的`vnode`插入到`dom`

11. 如果老 vnode 数组的开始索引小于结束索引，说明老 node 数组长度大于新 vnode 数组，执行 removeVnodes 方法从 DOM 中移除老 vnode 数组中多余的 vnode

```
else if (newStartIdx > newEndIdx) {
      removeVnodes(oldCh, oldStartIdx, oldEndIdx)
}
```


![dom diff推荐文章](https://www.cnblogs.com/wind-lanyan/p/9061684.html)