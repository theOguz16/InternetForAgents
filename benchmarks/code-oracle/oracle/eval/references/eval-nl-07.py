def second_largest_distinct(values, missing):
    distinct = sorted(set(values))
    if len(distinct) < 2:
        return missing
    return distinct[-2]
