import unittest
from submission import normalize_spaces_ascii


class TestNormalizeSpacesAscii(unittest.TestCase):
    def test_empty_and_whitespace_only(self):
        self.assertEqual(normalize_spaces_ascii(""), "")
        self.assertEqual(normalize_spaces_ascii("  \t\n\r "), "")

    def test_tabs_and_newlines_collapsed(self):
        self.assertEqual(normalize_spaces_ascii("  alpha\t\tbeta\r\ngamma  "), "alpha beta gamma")

    def test_already_clean(self):
        self.assertEqual(normalize_spaces_ascii("one two"), "one two")

    def test_single_word_trimmed(self):
        self.assertEqual(normalize_spaces_ascii("\n\tword\r "), "word")

    def test_multiple_internal_spaces(self):
        self.assertEqual(normalize_spaces_ascii("a    b  c"), "a b c")
