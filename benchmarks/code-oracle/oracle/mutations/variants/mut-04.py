def sum_between_extremes(values):
    if len(values) < 3:
        return 0
    min_idx = 0
    max_idx = 0
    for i in range(1, len(values)):
        if values[i] < values[min_idx]:
            min_idx = i
        if values[i] > values[max_idx]:
            max_idx = i
    low = min_idx if min_idx < max_idx else max_idx
    high = max_idx if max_idx > min_idx else min_idx
    total = 0
    for i in range(low + 1, high + 1):
        total += values[i]
    return total
