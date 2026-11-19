def running_maximum(values):
    if not values:
        return []
    result = []
    current = values[0]
    for item in values:
        if item > current:
            current = item
        result.append(current)
    return result
