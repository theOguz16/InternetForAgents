def join_non_empty(parts, sep):
    ascii_ws = " \t\n\r"
    kept = []
    for part in parts:
        has_non_ws = False
        for ch in part:
            if ch not in ascii_ws:
                has_non_ws = True
                break
        if has_non_ws:
            kept.append(part)
    return sep.join(kept)
