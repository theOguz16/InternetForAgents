def majority_element_strict(values, missing):
    if not values:
        return missing
    counts = {}
    threshold = len(values) // 2
    for item in values:
        new_count = counts.get(item, 0) + 1
        counts[item] = new_count
        if new_count >= threshold:
            return item
    return missing
