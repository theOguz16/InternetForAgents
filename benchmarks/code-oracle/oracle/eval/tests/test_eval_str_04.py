import unittest
from submission import extract_digit_groups


class TestExtractDigitGroups(unittest.TestCase):
    def test_no_digits(self):
        self.assertEqual(extract_digit_groups(""), [])
        self.assertEqual(extract_digit_groups("abc-xyz"), [])

    def test_trailing_digit_group(self):
        self.assertEqual(extract_digit_groups("v12b34"), [12, 34])

    def test_leading_zeros(self):
        self.assertEqual(extract_digit_groups("007 and 000"), [7, 0])

    def test_minus_ignored(self):
        self.assertEqual(extract_digit_groups("-42,-5"), [42, 5])

    def test_only_digits(self):
        self.assertEqual(extract_digit_groups("9876"), [9876])
