def camel_to_snake_ascii(name):
    if not name:
        return ""
    out = []
    n = len(name)
    for i, ch in enumerate(name):
        if "A" <= ch <= "Z":
            if i > 0:
                prev = name[i - 1]
                prev_lower_or_digit = ("a" <= prev <= "z") or ("0" <= prev <= "9")
                prev_upper = "A" <= prev <= "Z"
                next_lower = (i + 1 < n) and ("a" <= name[i + 1] <= "z")
                if prev_lower_or_digit or (prev_upper and next_lower):
                    out.append("_")
            out.append(ch.lower())
        else:
            out.append(ch)
    return "".join(out)
