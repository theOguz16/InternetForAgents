def camel_to_snake_ascii(name):
    if not name:
        return ""
    out = []
    for i, ch in enumerate(name):
        if "A" <= ch <= "Z":
            if i > 0:
                prev = name[i - 1]
                if ("a" <= prev <= "z") or ("0" <= prev <= "9"):
                    out.append("_")
            out.append(ch.lower())
        else:
            out.append(ch)
    return "".join(out)
