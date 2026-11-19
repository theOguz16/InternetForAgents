def compare_semver_basic(left, right):
    parsed = []
    for raw in (left, right):
        parts = raw.split(".")
        if len(parts) != 3:
            return -2
        nums = []
        for part in parts:
            if not part:
                return -2
            for ch in part:
                if not ("0" <= ch <= "9"):
                    return -2
            nums.append(int(part))
        parsed.append(nums)
    a, b = parsed
    if a < b:
        return -1
    if a > b:
        return 1
    return 0
