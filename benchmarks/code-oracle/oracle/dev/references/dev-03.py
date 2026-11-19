def pair_sums_adjacent(values):
    result = []
    for i in range(len(values) - 1):
        result.append(values[i] + values[i + 1])
    return result
