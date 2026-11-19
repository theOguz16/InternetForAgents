def count_positive_multiples(values, divisor):
    if divisor <= 0:
        return 0
    total = 0
    for item in values:
        if item > 0 and item % divisor == 0:
            total += 1
    return total
