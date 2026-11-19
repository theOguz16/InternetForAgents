import unittest
from submission import count_non_overlapping_sub


class TestCountNonOverlappingSub(unittest.TestCase):
    def test_empty_needle(self):
        self.assertEqual(count_non_overlapping_sub("abc", ""), 0)
        self.assertEqual(count_non_overlapping_sub("", ""), 0)

    def test_overlapping_pattern_counted_greedily_left_to_right(self):
        self.assertEqual(count_non_overlapping_sub("aaa", "aa"), 1)
        self.assertEqual(count_non_overlapping_sub("aaaa", "aa"), 2)
        self.assertEqual(count_non_overlapping_sub("abababa", "aba"), 2)

    def test_case_sensitive(self):
        self.assertEqual(count_non_overlapping_sub("AaA", "a"), 1)

    def test_needle_longer_than_text(self):
        self.assertEqual(count_non_overlapping_sub("ab", "abc"), 0)

    def test_multiple_distinct_matches(self):
        self.assertEqual(count_non_overlapping_sub("cat-dog-cat", "cat"), 2)
