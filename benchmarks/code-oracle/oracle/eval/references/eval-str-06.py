def mask_middle_chars(text, keep):
    if keep < 0:
        keep = 0
    n = len(text)
    if n <= 2 * keep:
        return text
    if keep == 0:
        return "*" * n
    return text[:keep] + ("*" * (n - 2 * keep)) + text[n - keep:]
