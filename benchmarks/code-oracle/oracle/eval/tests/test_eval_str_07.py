import unittest
from submission import reverse_word_order


class TestReverseWordOrder(unittest.TestCase):
    def test_empty_and_spaces(self):
        self.assertEqual(reverse_word_order(""), "")
        self.assertEqual(reverse_word_order(" \t\r\n "), "")

    def test_multiple_words(self):
        self.assertEqual(reverse_word_order("one two three"), "three two one")

    def test_extra_whitespace(self):
        self.assertEqual(reverse_word_order("  alpha\t\nbeta  "), "beta alpha")

    def test_single_word(self):
        self.assertEqual(reverse_word_order("  solo "), "solo")

    def test_punctuation_stays_with_word(self):
        self.assertEqual(reverse_word_order("hi, world!"), "world! hi,")
