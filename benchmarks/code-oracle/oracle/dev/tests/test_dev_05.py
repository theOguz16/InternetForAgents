import unittest
from submission import count_consonants_ascii


class TestCountConsonantsAscii(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(count_consonants_ascii(""), 0)

    def test_mixed_case(self):
        self.assertEqual(count_consonants_ascii("Hello World!"), 7)

    def test_only_vowels(self):
        self.assertEqual(count_consonants_ascii("aEiOuAEIOU"), 0)

    def test_digits_and_symbols(self):
        self.assertEqual(count_consonants_ascii("12345-_=+ \t\n"), 0)

    def test_y_counts_as_consonant(self):
        self.assertEqual(count_consonants_ascii("rhythm"), 6)

    def test_non_ascii_ignored(self):
        self.assertEqual(count_consonants_ascii("ğüşöçıB"), 1)
