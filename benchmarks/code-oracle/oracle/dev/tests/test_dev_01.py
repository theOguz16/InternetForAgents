import unittest
from submission import count_positive_multiples


class TestCountPositiveMultiples(unittest.TestCase):
    def test_basic_multiples(self):
        self.assertEqual(count_positive_multiples([3, 6, 7, 9, 10], 3), 3)

    def test_excludes_zero_and_negatives(self):
        self.assertEqual(count_positive_multiples([-6, -3, 0, 3, 6], 3), 2)

    def test_non_positive_divisor_returns_zero(self):
        self.assertEqual(count_positive_multiples([2, 4, 6], 0), 0)
        self.assertEqual(count_positive_multiples([2, 4, 6], -2), 0)

    def test_empty_list(self):
        self.assertEqual(count_positive_multiples([], 5), 0)

    def test_divisor_one_counts_all_positives(self):
        self.assertEqual(count_positive_multiples([-1, 0, 1, 2, 5], 1), 3)

    def test_input_not_mutated(self):
        data = [4, 8, 12]
        self.assertEqual(count_positive_multiples(data, 4), 3)
        self.assertEqual(data, [4, 8, 12])
