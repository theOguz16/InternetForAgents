def longest_common_prefix_list(words):
    if not words:
        return ""
    prefix = words[0]
    for word in words[1:]:
        limit = len(prefix) if len(prefix) < len(word) else len(word)
        idx = 0
        while idx < limit and prefix[idx] == word[idx]:
            idx += 1
        prefix = prefix[:idx]
        if not prefix:
            return ""
    return prefix
