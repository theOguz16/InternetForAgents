def normalize_spaces_ascii(text):
    ascii_ws = " \t\n\r"
    words = []
    current = []
    for ch in text:
        if ch in ascii_ws:
            if current:
                words.append("".join(current))
                current = []
        else:
            current.append(ch)
    if current:
        words.append("".join(current))
    return " ".join(words)
