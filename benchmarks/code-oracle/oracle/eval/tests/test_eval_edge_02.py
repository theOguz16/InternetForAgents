import unittest
from submission import binary_search_first_ge


class TestBinarySearchFirstGe(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(binary_search_first_ge([], 5), 0)

    def test_exact_match_and_duplicates(self):
        self.assertEqual(binary_search_first_ge([1, 3, 3, 3, 7], 3), 1)
        self.assertEqual(binary_search_first_ge([2, 2, 2], 2), 0)

    def test_between_values(self):
        self.assertEqual(binary_search_first_ge([1, 4, 8], 5), 2)

    def test_below_min_and_above_max(self):
        self.assertEqual(binary_search_first_ge([10, 20, 30], 5), 0)
        self.assertEqual(binary_search_first_ge([10, 20, 30], 40), 3)

    def test_negative_values(self):
        self.assertEqual(binary_search_first_ge([-10, -5, -5, 0], -5), 1)
