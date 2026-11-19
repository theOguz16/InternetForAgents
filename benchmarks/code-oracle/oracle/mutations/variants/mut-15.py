def count_non_overlapping_sub(text, needle):
    if not needle:
        return 0
    count = 0
    idx = 0
    step = len(needle)
    limit = len(text) - step
    while idx <= limit:
        if text[idx:idx + step] == needle:
            count += 1
        idx += 1
    return count
