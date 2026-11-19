def dedupe_keep_last(values):
    seen = set()
    kept = []
    for item in values:
        if item not in seen:
            seen.add(item)
            kept.append(item)
    return kept
