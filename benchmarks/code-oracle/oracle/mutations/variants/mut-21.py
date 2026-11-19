def decode_run_length_safe(encoded):
    if not encoded:
        return ""
    out = []
    i = 0
    n = len(encoded)
    while i < n:
        ch = encoded[i]
        is_ascii_letter = ("a" <= ch <= "z") or ("A" <= ch <= "Z")
        if not is_ascii_letter:
            return ""
        i += 1
        if i >= n or not ("0" <= encoded[i] <= "9"):
            return ""
        num_start = i
        while i < n and ("0" <= encoded[i] <= "9"):
            i += 1
        count = int(encoded[num_start:i])
        if count <= 0:
            return ""
        out.append(ch * count)
    return "".join(out)
