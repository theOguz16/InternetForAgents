def zero_out_negative_subarrays_sum(values):
    best = 0
    current = 0
    for item in values:
        current = item if current + item < item else current + item
        if current > best:
            best = current
    return best
