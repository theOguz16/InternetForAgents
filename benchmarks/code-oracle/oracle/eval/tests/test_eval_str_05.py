import unittest
from submission import is_anagram_ascii_letters


class TestIsAnagramAsciiLetters(unittest.TestCase):
    def test_valid_anagrams_with_case_and_punctuation(self):
        self.assertTrue(is_anagram_ascii_letters("Dormitory!", "Dirty room."))

    def test_digits_are_ignored(self):
        self.assertTrue(is_anagram_ascii_letters("a1b2", "B9a"))
        self.assertTrue(is_anagram_ascii_letters("123", "456"))

    def test_different_counts_false(self):
        self.assertFalse(is_anagram_ascii_letters("aab", "abb"))

    def test_empty_strings(self):
        self.assertTrue(is_anagram_ascii_letters("", "   --- "))

    def test_subset_false(self):
        self.assertFalse(is_anagram_ascii_letters("abc", "abcd"))
