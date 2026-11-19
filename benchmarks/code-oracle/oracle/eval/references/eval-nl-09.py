def difference_consecutive(values):
    result = []
    for i in range(len(values) - 1):
        result.append(values[i + 1] - values[i])
    return result
