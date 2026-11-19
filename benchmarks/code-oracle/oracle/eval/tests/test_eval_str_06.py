import unittest
from submission import mask_middle_chars


class TestMaskMiddleChars(unittest.TestCase):
    def test_standard_masking(self):
        self.assertEqual(mask_middle_chars("abcdef", 2), "ab**ef")

    def test_keep_zero_masks_all(self):
        self.assertEqual(mask_middle_chars("secret", 0), "******")
        self.assertEqual(mask_middle_chars("", 0), "")

    def test_negative_keep_treated_as_zero(self):
        self.assertEqual(mask_middle_chars("abc", -3), "***")

    def test_short_text_unchanged(self):
        self.assertEqual(mask_middle_chars("abcd", 2), "abcd")
        self.assertEqual(mask_middle_chars("abc", 2), "abc")

    def test_keep_one(self):
        self.assertEqual(mask_middle_chars("token", 1), "t***n")
