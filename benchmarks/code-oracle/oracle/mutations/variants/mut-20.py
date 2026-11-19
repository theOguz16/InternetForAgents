def intervals_covered_length(starts, ends):
    if len(starts) != len(ends):
        return -1
    total = 0
    for s, e in zip(starts, ends):
        if e > s:
            total += e - s
    return total
