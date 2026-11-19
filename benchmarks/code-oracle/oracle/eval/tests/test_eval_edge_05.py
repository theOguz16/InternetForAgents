import unittest
from submission import decode_run_length_safe


class TestDecodeRunLengthSafe(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(decode_run_length_safe(""), "")

    def test_valid_single_and_multi_digit(self):
        self.assertEqual(decode_run_length_safe("a3B2"), "aaaBB")
        self.assertEqual(decode_run_length_safe("x10y1"), "xxxxxxxxxxy")

    def test_leading_zero_and_zero_count_rejected(self):
        self.assertEqual(decode_run_length_safe("a0"), "")
        self.assertEqual(decode_run_length_safe("a03"), "")

    def test_missing_count_or_starts_with_digit_rejected(self):
        self.assertEqual(decode_run_length_safe("a"), "")
        self.assertEqual(decode_run_length_safe("a2b"), "")
        self.assertEqual(decode_run_length_safe("3a"), "")

    def test_non_ascii_or_symbol_rejected(self):
        self.assertEqual(decode_run_length_safe("a2-b1"), "")
        self.assertEqual(decode_run_length_safe("ş2"), "")
