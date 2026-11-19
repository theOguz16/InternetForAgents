def filter_words_by_bounds(words, min_len, max_len):
    if min_len > max_len:
        return []
    low = 0 if min_len < 0 else min_len
    return [word for word in words if low <= len(word) <= max_len]
