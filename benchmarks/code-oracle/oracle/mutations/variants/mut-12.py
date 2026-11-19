def extract_digit_groups(text):
    result = []
    current = []
    for ch in text:
        if "0" <= ch <= "9":
            current.append(ch)
        elif current:
            result.append(int("".join(current)))
            current = []
    return result
