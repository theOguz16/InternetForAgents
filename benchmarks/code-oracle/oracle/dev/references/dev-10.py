def is_strictly_alternating_signs(values):
    for item in values:
        if item == 0:
            return False
    for i in range(len(values) - 1):
        if (values[i] > 0) == (values[i + 1] > 0):
            return False
    return True
