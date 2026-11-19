def weighted_prefix_score(values):
    total = 0
    for idx, val in enumerate(values, start=1):
        total += idx * val
    return total
