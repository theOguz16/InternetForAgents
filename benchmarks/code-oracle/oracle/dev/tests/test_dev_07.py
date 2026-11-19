import unittest
from submission import strip_matching_prefix


class TestStripMatchingPrefix(unittest.TestCase):
    def test_removes_single_occurrence(self):
        self.assertEqual(strip_matching_prefix("pre_pre_val", "pre_"), "pre_val")

    def test_no_match(self):
        self.assertEqual(strip_matching_prefix("hello", "world"), "hello")

    def test_case_sensitive(self):
        self.assertEqual(strip_matching_prefix("Pre_val", "pre_"), "Pre_val")

    def test_empty_prefix(self):
        self.assertEqual(strip_matching_prefix("abc", ""), "abc")

    def test_full_match_returns_empty(self):
        self.assertEqual(strip_matching_prefix("abc", "abc"), "")

    def test_prefix_longer_than_text(self):
        self.assertEqual(strip_matching_prefix("ab", "abc"), "ab")
