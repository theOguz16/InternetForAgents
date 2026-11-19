def slice_with_clamped_bounds(values, start, end):
    n = len(values)
    lo = 0 if start < 0 else (n if start > n else start)
    hi = 0 if end < 0 else (n if end > n else end)
    if lo >= hi:
        return []
    return values[lo:hi]
