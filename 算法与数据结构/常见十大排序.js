// 用 JavaScript 实现一个标准的排序算法(快排、冒泡、选择排序)，对某个数字数组进行由低到高的排序？介绍冒泡排序、选择排序，说说冒泡排序如何优化

/**
 * 
 * 稳定：如果a原本在b前面，而a=b，排序之后a仍然在b的前面； 不稳定：如果a原本在b的前面，而a=b，排序之后a可能会出现在b的后面；

   内排序：所有排序操作都在内存中完成； 外排序：由于数据太大，因此把数据放在磁盘中，而排序通过磁盘和内存的数据传输才能进行；

   时间复杂度: 一个算法执行所耗费的时间。 空间复杂度: 运行完一个程序所需内存的大小。
 * 
 * 
 */
let arr2 = [4,1,2,3,5,7,8,6]
// 冒泡排序
/**
 * 冒泡排序是一种简单的排序算法。它重复地走访过要排序的数列，一次比较两个元素，如果它们的顺序错误就把它们交换过来。
 * 走访数列的工作是重复地进行直到没有再需要交换，也就是说该数列已经排序完成。这个算法的名字由来是因为越小的元素会经由交换慢慢“浮”到数列的顶端
 * 思路
 * 外层循环
 * 1. 比较两个相邻的元素，如果前一个要比后一个大，就交换两者的位置
 * 2. 对每个对相邻作同样的工作，从开始第一对到结尾的最后一对，这样在最后应该会是最大的数
 * 3. 重复以上步骤，除了最后一个
 * 5. 重复步骤1～3，直到排序完成
 * 
 * 时间复杂度：
 * 最好的情况：
 * 数组已经是排好序的了：O(n)
 * 最差的情况：
 * 数组是一个反向数组：O(n^2)
 * 平均的情况：
 * O(n^2)
 * 
 * 空间复杂度：
 * O(1)
 * 稳定情况：
 * 稳定
 */
function bubbleSort(arr){
    var len = arr.length
    for(let i =0;i<len;i++){
        for(let j=0;j<len-1-i;j++){
            if(arr[j]>arr[j+1]){
                var temp = arr[j+1]
                arr[j+1] = arr[j]
                arr[j] = temp
            }
        }
    }
    return arr
}

console.log(bubbleSort(arr2))

// 改进冒泡排序
/**
 * 传统冒泡排序中每一趟排序操作只能找到一个最大值或最小值,
 * 我们考虑利用在每趟排序中进行正向和反向两遍冒泡的方法一次可以得到两个最终值(最大者和最小者) , 从而使排序趟数几乎减少了一半。
 * 
 */
function bubbleSort2(arr) {
    var low = 0;
    var high= arr.length-1; //设置变量的初始值
    var tmp,j;
    console.time('2.改进后冒泡排序耗时');
    while (low < high) {
        for (j= low; j< high; ++j) //正向冒泡,找到最大者
            if (arr[j]> arr[j+1]) {
                tmp = arr[j]; 
                arr[j]=arr[j+1];
                arr[j+1]=tmp;
            }
        --high;                 //修改high值, 前移一位
        for (j=high; j>low; --j) //反向冒泡,找到最小者
            if (arr[j]<arr[j-1]) {
                tmp = arr[j]; 
                arr[j]=arr[j-1];
                arr[j-1]=tmp;
            }
        ++low;                  //修改low值,后移一位
    }
    console.timeEnd('2.改进后冒泡排序耗时');
    return arr2;
} 
console.log(bubbleSort2(arr2));//[2, 3, 4, 5, 15, 19, 26, 27, 36, 38, 44, 46, 47, 48, 50]

// 选择排序
/**
 * 选择排序是表现最稳定的排序，无论数据量,情况是怎么样的，它的时间复杂度都是O(n^2) ，空间复杂度为O(1)
 * 原理：首先在未排序的序列中找到最小（最大）的元素，然后放到已排序的最前面（最后面），以此类推
 * 实现：
 * 1. 无序区为排序数组，有序去为空
 * 2. 第i趟排序(i=1,2,3...n-1)开始时，当前有序区和无序区分别为arr[1..i-1]和arr(i..n）。该趟排序从当前无序区中-选出关键字最小的记录 arr[k]，
 * 将它与无序区的第1个记录a交换，使arr[1..i]和arr[i+1..n)分别变为记录个数增加1个的新有序区和记录个数减少1个的新无序区
 */

 function selectionSort(arr){
     var len = arr.length;
     var minIndex,temp;
     for(var i=0;i<len-1;i++){
         minIndex = i;
         for(var j=i+1;j<len;j++){
             if(arr[j]<arr[minIndex]){
                 minIndex = j
             }
         }
        temp = arr[i]
        arr[i] = arr[minIndex]
        arr[minIndex] = temp
     }
     return arr
     
 }

console.log(selectionSort(arr2))

// 插入排序
/**
 * 
 * 插入排序（Insertion-Sort）的算法描述是一种简单直观的排序算法。它的工作原理是通过构建有序序列，对于未排序数据，在已排序序列中从后向前扫描，
 * 找到相应位置并插入。插入排序在实现上，通常采用in-place排序（即只需用到O(1)的额外空间的排序），因而在从后向前扫描过程中，
 * 需要反复把已排序元素逐步向后挪位，为最新元素提供插入空间。
 * 
 * 思路：
 * 1. 从第一个元素开始，该元素可以被认为已经被排序了
 * 2. 取出下一个元素，在已经排好序的元素队列中从后向前排序；
 * 3. 如果该元素（已排序）大于新元素，将该元素移到下一个位置
 * 4. 重复该步骤3，直到已经找到小于等于这个元素的位置，将该元素插入到该位置
 * 5. 重复排序过程
 * 
 * 时间复杂度：
 * 最佳情况：输入数组按升序排列 O(n)
 * 最坏情况：输入数组按降序排列 O(n^2)
 * 平均情况：T(n) = O(n^2)
 */
 function insertionSort(arr){
     for(var i=1;i<arr.length;i++){
         var key = arr[i]
         var j = i-1;
         while(j>=0 && arr[j] > key){
             arr[j+1] = arr[j]
             j--
         }
         arr[j+1] = key
     }
     return arr
 }
 console.log(insertionSort(arr2))
// 希尔排序
/**
 * 1959年Shell发明； 第一个突破O(n^2)的排序算法；是简单插入排序的改进版；
 * 它与插入排序的不同之处在于，它会优先比较距离较远的元素。希尔排序又叫缩小增量排序
 * 1. 选择一个增量序列：t1,t2,...tk，其中ti>tj，tk=1
 * 2. 按增量序列个数k，对序列进行k趟排序
 * 3. 每趟排序，根据对应的增量ti，将待序列分割成若干长度为m的子序列，分别对各子表进行直接插入排序。仅增量因子为1时，整个序列作为一个表来处理，表的长度即为整个序列的长度
 * 
 * 通俗来讲
 * 比如：[35, 33, 42, 10, 14, 19, 27, 44]
 * 采取间隔4，创建一个有4个间隔的所有值的虚拟子列表，则得到
 * {35,14},{33,19},{42,27},{10,44} 比较两个值的大小
 * 得到=> 
 * {14,35},{19,33},{27,42},{10,44},然后将这些数据放回到原来对应的位置
 * 组合成：[14,19,27,10,35,33,42,44]
 * 然后采取间隔为2的创建有2个间隔的虚拟子列表，
 * {14,27,35,42}和{19,10,33,44}
 * 然后比较并交换原始数组的值
 * [14,10,27,19,35,33,42,44]
 * 然后进行间隔为1的对数组其他部分进行排序
 * 
 * 特别说明：没有特别的统一标准，但最后一步必须是1，因为不同的取法涉及到时间复杂度不一样；一般以length/2为取值
 * 1. 希尔排序的过程中，只涉及到了相邻数据的交换操作，只需要常量级的临时空间，所以空间复杂度为(O(1))，所以希尔排序是原地排序
 * 2. 希尔排序是不稳定的，单次直接插入排序是稳定的，它不会改变相同元素之间的相对顺序，但是多次不同插入排序过程中，相同的元素可能在各自的插入排序中，移动，可能导致相同
 * 元素相对顺序发生变化，所以，希尔排序不稳定
 * 
 * 排序时间复杂度对比：
 * 最好情况：O(n(log^2 n))
 * 最差情况：O(n(log^2 n))
 * 平均情况：O(nlogn)
 */
function shellSort(arr){
    let len = arr.length,
    temp,
    gap = 1;
    while(gap<len/5){
        gap = gap*5+1
    }
    for(gap;gap>0;gap = Math.floor(gap/5)){
        for(let i = gap; i<len; i++){
            temp = arr[i];
            for(var j = i-gap;j>=0 && arr[j]>temp; j-=gap){
                arr[j+gap] = arr[j]
            }
            arr[j+gap] = temp
        }
    }
    return arr
}

// 归并排序
/**
 * 思路：
 * 排序一个数组，先把数组从中间分成前后两部分，然后对前后两部分进行排序，再将排好序的两个数组合并起来，这样整个数组就是有序的了
 * 归并排序采用的是分治思想，将大事分成小事来解决
 * 
 * 归并排序是非原地排序，在合并两个有序数组为一个有序数组，需要额外的存储空间。实际上，尽管每次合并操作都需要申请额外的内存空间，但在合并完成之后，临时开辟的内存空间
 * 就被释放了。在任意时刻CPU都有一个函数在执行，所以只有一个额外临时空间在使用，临时内存空间最大也不会超过n个数据的大小，所以空间复杂都为O(n)
 * 
 * 归并排序：merge方法里面的left[0]<=right[0],保持了值相同的元素，在合并前后的先后顺序不变，归并排序是一种稳定的排序方法
 * 
 * 时间复杂度：
 * 最佳，最坏，平均：O(nlogn)
 */
function mergeSort(arr){
    var len = arr.length;
    if(len<2) return 
    var middle  = Math.floor(len/2),
    left = arr.slice(0,middle),
    right = arr.slice(middle);
    return merge(mergeSort(left),mergeSort(right))
}

function merge(left,right){
    var result = [];
    while(left.length&&right.length){
        if(left[0]<right[0]){
            // 每次从里面取一个值，然后比较
            result.push(left.shift())
        }else{
            result.push(right.shift())
        }
    }
    // 防止左右长度不一致，遗留出一个内容
    while(left.length) result.push(left.shift())
    while(right.length) result.push(left.shift())
    return result
}

// 快速排序
/**
 * 思路
 * 找到一个基准点，一般指（数组的中部），然后数组就被该基准点分为两部分，依次与该基准点进行比较，如果比他小的放左边，比它大的放右边
 * 左右分别用一个空数组进行去存储比较后的数据
 * 最后递归执行操作，直到数组长度<=1 
 * 优点
 * 快速
 * 缺点
 * 多声明了2个数组，浪费了存储空间资源
 * 
 * 空间复杂度：O(logn)
 * 
 * 时间复杂度：
 * 最佳：O(nlogn)
 * 最差：O(n^2)
 * 平均：O(nlogn)
 */
// 实现：
function quickSort(arr){
    if(arr.length<=1){
        return arr
    }
    // 保存中间的数组
    let midIndex = Math.floor(arr.length/2)
    // 取出中间的值，剩下的内容进行循环比较
    let midArr = arr.splice(midIndex,1)
    let midVal = midArr[0]
    const left = []
    const right = []
    for(let i =0;i<arr.length;i++){
        if(arr[i]<=midVal){
            left.push(arr[i])
        }else{
            right.push(arr[i])
        }
    }
    return quickSort(left).concat(midVal,quickSort(right))
}

console.log(quickSort(arr2))

// 堆排序 Heap Sort

/**
 * 堆：其实是一种特殊的树，只要满足一下两点就是一个堆
 * 1. 堆是一个完全二叉树，完全二叉树：除了最后一层，其他节点都是满的，最后一层的节点都向左排序
 * 2. 堆中每个节点的值都必须大于等于（或小于等于）其子树中每一个节点的值。也可以说：堆中每个节点的值都大于等于（或小于等于）其左右子节点的值
 * 
 * 对于每个节点的值都大于等于子树中每个节点值的堆，我们叫作大顶堆。对于每个节点的值都小于等于每个节点值的堆，叫作小顶堆
 * 
 * 1. 将初始待排序关键字序列(R1,R2....Rn)构建成大顶堆，此堆为初始的无序区；
 * 2. 将堆顶元素R[1]与最后一个元素R[n]交换，此时得到新的无序区(R1,R2,......Rn-1)和新的有序区(Rn),且满足R[1,2...n-1]<=R[n]；
 * 3. 由于交换后新的堆顶R[1]可能违反堆的性质，因此需要对当前无序区(R1,R2,......Rn-1)调整为新堆，然后再次将R[1]与无序区最后一个元素交换，
 * 得到新的无序区(R1,R2....Rn-2)和新的有序区(Rn-1,Rn)。不断重复此过程直到有序区的元素个数为n-1，则整个排序过程完成。
 * 
 * 个人理解：
 * 将子树中的最大值和父节点进行交换，直到顶点的值是最大的，然后，将定点值和树最后的值（右树最右端的叶子节点（如果有））进行交换
 */

 // 交换两个节点
 function heapify(arr, i) {     // 堆调整
    var left = 2 * i + 1,
        right = 2 * i + 2,
        largest = i;

    if (left < len && arr[left] > arr[largest]) {
        largest = left;
    }

    if (right < len && arr[right] > arr[largest]) {
        largest = right;
    }

    if (largest != i) {
        swap(arr, i, largest);
        heapify(arr, largest);
    }
}

function swap(arr, i, j) {
    var temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
}

function heapSort(arr) {
    buildMaxHeap(arr);

    for (var i = arr.length-1; i > 0; i--) {
        swap(arr, 0, i);
        len--;
        heapify(arr, 0);
    }
    return arr;
}