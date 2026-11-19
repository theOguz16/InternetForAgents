def merge_sorted_unique(left, right):
    result = []
    i = 0
    j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            val = left[i]
            i += 1
        else:
            val = right[j]
            j += 1
        if not result or result[-1] != val:
            result.append(val)
    while i < len(left):
        val = left[i]
        i += 1
        if not result or result[-1] != val:
            result.append(val)
    while j < len(right):
        val = right[j]
        j += 1
        if not result or result[-1] != val:
            result.append(val)
    return result
