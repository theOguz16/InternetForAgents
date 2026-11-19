def filter_in_closed_range(values, low, high):
    if low > high:
        return []
    return [item for item in values if low <= item <= high]
