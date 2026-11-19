import unittest
from submission import filter_words_by_bounds


class TestFilterWordsByBounds(unittest.TestCase):
    def test_standard_bounds(self):
        self.assertEqual(filter_words_by_bounds(["a", "bb", "ccc", "dddd"], 2, 3), ["bb", "ccc"])

    def test_inverted_bounds(self):
        self.assertEqual(filter_words_by_bounds(["a", "bb"], 3, 1), [])

    def test_negative_min_includes_empty_string(self):
        self.assertEqual(filter_words_by_bounds(["", "x", "yy"], -2, 1), ["", "x"])

    def test_negative_max_returns_empty(self):
        self.assertEqual(filter_words_by_bounds(["", "a"], -5, -1), [])

    def test_input_not_mutated(self):
        data = ["one", "two", "three"]
        filter_words_by_bounds(data, 3, 3)
        self.assertEqual(data, ["one", "two", "three"])
