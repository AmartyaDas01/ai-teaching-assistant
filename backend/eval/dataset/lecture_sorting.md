# Lecture 7 - Sorting Algorithms and Complexity Analysis

## 1. Why sorting matters

Sorting is one of the most studied problems in computer science because it appears as a
subroutine almost everywhere: binary search requires sorted input, database indexes keep
keys in order, and many graph algorithms sort edges by weight before processing them.
Understanding the trade-offs between sorting algorithms is therefore a prerequisite for
reasoning about the performance of larger systems.

## 2. Comparison-based sorting and its lower bound

A comparison-based sorting algorithm determines the order of elements only by comparing
pairs of them. Any such algorithm can be modelled as a decision tree, where each internal
node is a comparison and each leaf is one of the n! possible permutations of the input.
A binary tree with n! leaves must have height at least log2(n!), and by Stirling's
approximation log2(n!) is Theta(n log n).

This gives the classic result: **every comparison-based sorting algorithm requires at
least Omega(n log n) comparisons in the worst case.** No amount of cleverness can beat
this bound while remaining comparison-based. Algorithms that do better, such as counting
sort, must exploit additional structure in the data.

## 3. Insertion sort

Insertion sort builds the sorted output one element at a time. It maintains a sorted
prefix of the array and, for each new element, shifts larger elements to the right and
inserts the new element into its correct position.

Its worst-case time complexity is O(n^2), which occurs when the input is sorted in
reverse order, because every new element must travel the full length of the sorted
prefix. Its best case is O(n), which occurs when the input is already sorted: each new
element is compared once against its predecessor and no shifting is needed.

Insertion sort is **stable** and sorts **in place**, using O(1) auxiliary space. Despite
its quadratic worst case, it is genuinely fast on small or nearly-sorted inputs, which is
why production sorting libraries switch to insertion sort for small subarrays.

## 4. Merge sort

Merge sort is a divide-and-conquer algorithm. It splits the array into two halves, sorts
each half recursively, and then merges the two sorted halves into a single sorted array.
The merge step walks both halves with two pointers, repeatedly taking the smaller of the
two front elements.

Its recurrence is T(n) = 2T(n/2) + O(n), which solves to **O(n log n) in the best,
average, and worst case**. This uniformity is merge sort's key strength: its performance
does not degrade on adversarial input.

Merge sort's main cost is memory. The standard implementation needs **O(n) auxiliary
space** for the merge buffer, so it is not an in-place algorithm. It is, however,
**stable**, which is why it is preferred when sorting records by multiple keys in
sequence. Merge sort is also the natural choice for external sorting, where the data does
not fit in memory and must be streamed from disk.

## 5. Quicksort

Quicksort also uses divide and conquer, but partitions rather than merges. It selects a
pivot element, partitions the array so that everything smaller than the pivot is to its
left and everything larger is to its right, and then recurses on the two partitions. The
pivot is in its final position after partitioning, so no merge step is needed.

When the pivot splits the array into two roughly equal halves, the recurrence is
T(n) = 2T(n/2) + O(n) and quicksort runs in O(n log n). However, if the pivot is always
the smallest or largest element - which happens on already-sorted input when the first
element is chosen as the pivot - the partitions are maximally unbalanced, the recursion
depth becomes n, and **quicksort degrades to O(n^2)**.

This worst case is avoided in practice by choosing the pivot randomly, or by using the
median-of-three rule. Randomised quicksort has an expected time of O(n log n) regardless
of the input distribution.

Quicksort sorts **in place**, needing only O(log n) stack space for the recursion, and it
has excellent cache locality because it works on contiguous subarrays. This is why
quicksort is typically faster than merge sort in practice despite the identical
asymptotic average complexity. Quicksort is **not stable** in its usual in-place form.

## 6. Counting sort and breaking the lower bound

Counting sort does not compare elements at all. Given integer keys in a known range
[0, k), it counts how many times each key occurs, computes a prefix sum of those counts
to determine each key's output position, and writes elements directly into place.

Its time complexity is **O(n + k)**, which is linear when k is O(n). This does not
contradict the Omega(n log n) lower bound, because that bound applies only to
comparison-based algorithms, and counting sort never compares two elements. The price is
that counting sort requires O(k) extra space and only works on keys that can be used as
array indices.

Counting sort is stable when implemented with the prefix-sum technique, which is exactly
why it can serve as the inner loop of radix sort.

## 7. Choosing an algorithm

There is no single best sorting algorithm. The right choice depends on constraints:

- If memory is tight and average speed matters most, use **randomised quicksort**.
- If worst-case guarantees are required (for example in real-time systems), use
  **merge sort** or heapsort, both of which are O(n log n) in the worst case.
- If stability is required, use **merge sort**; quicksort is not stable.
- If the keys are small integers in a bounded range, use **counting sort** for linear
  time.
- If the input is small or nearly sorted, use **insertion sort**.

Real-world library sorts are hybrids that exploit exactly these trade-offs. Timsort, used
in Python and Java, is a stable merge sort that detects already-sorted runs and uses
insertion sort on short ones. Introsort, used in C++'s std::sort, begins with quicksort
and switches to heapsort once the recursion depth exceeds a threshold, thereby retaining
quicksort's speed while guaranteeing an O(n log n) worst case.
