def binary_search_first_ge(sorted_values, target):
    lo = 0
    hi = len(sorted_values)
    while lo < hi:
        mid = (lo + hi) // 2
        if sorted_values[mid] > target:
            hi = mid
        else:
            lo = mid + 1
    return lo
