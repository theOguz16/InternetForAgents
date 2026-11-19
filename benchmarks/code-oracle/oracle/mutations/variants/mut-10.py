def normalize_spaces_ascii(text):
    words = [part for part in text.split(" ") if part]
    return " ".join(words)
