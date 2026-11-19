def are_brackets_balanced(text):
    pairs = {")": "(", "]": "[", "}": "{"}
    openings = "([{"
    stack = []
    for ch in text:
        if ch in openings:
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack[-1] != pairs[ch]:
                return False
            stack.pop()
    return len(stack) == 0
