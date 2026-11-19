def intervals_covered_length(starts, ends):
    if len(starts) != len(ends):
        return -1
    intervals = []
    for s, e in zip(starts, ends):
        if e > s:
            intervals.append((s, e))
    if not intervals:
        return 0
    intervals.sort()
    total = 0
    cur_start, cur_end = intervals[0]
    for s, e in intervals[1:]:
        if s <= cur_end:
            if e > cur_end:
                cur_end = e
        else:
            total += cur_end - cur_start
            cur_start, cur_end = s, e
    total += cur_end - cur_start
    return total
