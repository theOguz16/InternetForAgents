def zero_out_negative_subarrays_sum(values):
    if not values:
        return 0
    best = values[0]
    current = values[0]
    for item in values[1:]:
        if current + item > item:
            current = current + item
        else:
            current = item
        if current > best:
            best = current
    return best
