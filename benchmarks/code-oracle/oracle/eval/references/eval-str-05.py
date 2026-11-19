def is_anagram_ascii_letters(first, second):
    counts = {}
    for ch in first:
        low = ch.lower()
        if "a" <= low <= "z":
            counts[low] = counts.get(low, 0) + 1
    for ch in second:
        low = ch.lower()
        if "a" <= low <= "z":
            counts[low] = counts.get(low, 0) - 1
    for value in counts.values():
        if value != 0:
            return False
    return True
