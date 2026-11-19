import unittest
from submission import compress_char_runs


class TestCompressCharRuns(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(compress_char_runs(""), "")

    def test_single_characters_omit_one(self):
        self.assertEqual(compress_char_runs("abc"), "abc")
        self.assertEqual(compress_char_runs("x"), "x")

    def test_mixed_runs(self):
        self.assertEqual(compress_char_runs("aaabcc"), "a3bc2")

    def test_case_sensitive(self):
        self.assertEqual(compress_char_runs("AAaaA"), "A2a2A")

    def test_long_run_double_digit(self):
        self.assertEqual(compress_char_runs("z" * 12), "z12")

    def test_trailing_single_char(self):
        self.assertEqual(compress_char_runs("bbba"), "b3a")
