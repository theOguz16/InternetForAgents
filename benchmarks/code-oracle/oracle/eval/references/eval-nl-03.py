def dedupe_keep_last(values):
    seen = set()
    reversed_kept = []
    for item in reversed(values):
        if item not in seen:
            seen.add(item)
            reversed_kept.append(item)
    reversed_kept.reverse()
    return reversed_kept
