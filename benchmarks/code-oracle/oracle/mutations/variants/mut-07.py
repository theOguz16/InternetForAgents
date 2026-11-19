def second_largest_distinct(values, missing):
    if len(values) < 2:
        return missing
    ordered = sorted(values)
    return ordered[-2]
