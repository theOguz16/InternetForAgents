def compress_char_runs(text):
    if not text:
        return ""
    parts = []
    current = text[0]
    count = 1
    for ch in text[1:]:
        if ch == current:
            count += 1
        else:
            parts.append(f"{current}{count}")
            current = ch
            count = 1
    parts.append(f"{current}{count}")
    return "".join(parts)
