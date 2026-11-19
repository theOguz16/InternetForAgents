def count_consonants_ascii(text):
    vowels = "aeiou"
    count = 0
    for ch in text:
        low = ch.lower()
        if "a" <= low <= "z" and low not in vowels:
            count += 1
    return count
