def partition_even_odd_stable(values):
    evens = []
    odds = []
    for item in values:
        if item % 2 == 0:
            evens.append(item)
        else:
            odds.append(item)
    odds.reverse()
    return evens + odds
