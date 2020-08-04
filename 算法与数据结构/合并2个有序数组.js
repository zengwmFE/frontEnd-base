/**
 * @param {number[]} nums1
 * @param {number} m
 * @param {number[]} nums2
 * @param {number} n
 * @return {void} Do not return anything, modify nums1 in-place instead.
 */
var merge = function(nums1, m, nums2, n) {
    if(m==0){
        nums1 = nums2
        return nums1
    }
    if(n==0){
        return
    }
    let index1 = m-1,index2 = n-1;lastIndex = m+n-1;
    while(index2>=0&&index1>=0){
        if(nums1[index1]>nums2[index2]){
             nums1[lastIndex] = nums1[index1]
            lastIndex--
            index1--
           
        }else{
            nums1[lastIndex] = nums2[index2]
            lastIndex--
            index2--
        }
    }
    console.log(nums1)
};