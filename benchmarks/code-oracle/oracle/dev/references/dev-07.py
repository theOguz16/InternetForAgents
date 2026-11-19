def strip_matching_prefix(text, prefix):
    if not prefix or not text.startswith(prefix):
        return text
    return text[len(prefix):]
