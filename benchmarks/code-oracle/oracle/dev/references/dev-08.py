def clamp_value(value, lower, upper):
    if lower > upper:
        lower, upper = upper, lower
    if value < lower:
        return lower
    if value > upper:
        return upper
    return value
