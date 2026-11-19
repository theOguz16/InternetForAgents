def safe_floor_div(numerator, denominator, fallback):
    if denominator == 0:
        return fallback
    return numerator // denominator
