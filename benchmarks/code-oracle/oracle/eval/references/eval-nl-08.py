def count_pairs_with_sum(values, target):
    counts = {}
    pairs = 0
    for item in values:
        complement = target - item
        if complement in counts:
            pairs += counts[complement]
        counts[item] = counts.get(item, 0) + 1
    return pairs
