def longest_increasing_run(values):
    if not values:
        return 0
    best = 1
    current = 1
    for i in range(1, len(values)):
        if values[i] >= values[i - 1]:
            current += 1
            if current > best:
                best = current
        else:
            current = 1
    return best
