import unittest
from submission import sum_between_extremes


class TestSumBetweenExtremes(unittest.TestCase):
    def test_short_lists(self):
        self.assertEqual(sum_between_extremes([]), 0)
        self.assertEqual(sum_between_extremes([1]), 0)
        self.assertEqual(sum_between_extremes([1, 5]), 0)

    def test_min_before_max(self):
        self.assertEqual(sum_between_extremes([1, 4, 2, 9, 3]), 6)

    def test_max_before_min(self):
        self.assertEqual(sum_between_extremes([10, 3, -2, -5, 8]), 1)

    def test_uses_first_occurrences(self):
        self.assertEqual(sum_between_extremes([1, 5, 1, 9, 9]), 6)

    def test_adjacent_or_equal_extremes(self):
        self.assertEqual(sum_between_extremes([4, 4, 4]), 0)
        self.assertEqual(sum_between_extremes([2, 1, 9, 3]), 0)

    def test_negative_values(self):
        self.assertEqual(sum_between_extremes([-10, -3, -4, -1]), -7)
