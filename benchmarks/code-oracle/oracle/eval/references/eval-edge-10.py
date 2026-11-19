def stable_top_k_indices(values, k):
    if k <= 0 or not values:
        return []
    indexed = sorted(range(len(values)), key=lambda i: (-values[i], i))
    return indexed[:k]
