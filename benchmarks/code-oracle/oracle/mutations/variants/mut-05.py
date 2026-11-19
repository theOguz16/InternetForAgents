def rotate_list_right(values, steps):
    n = len(values)
    if n == 0:
        return []
    shift = steps % n
    if shift == 0:
        return list(values)
    return values[shift:] + values[:shift]
