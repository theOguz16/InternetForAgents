import unittest
from submission import count_pairs_with_sum


class TestCountPairsWithSum(unittest.TestCase):
    def test_basic_pairs(self):
        self.assertEqual(count_pairs_with_sum([1, 5, 7, -1, 5], 6), 3)

    def test_no_self_pairing(self):
        self.assertEqual(count_pairs_with_sum([3], 6), 0)
        self.assertEqual(count_pairs_with_sum([3, 1, 2], 6), 0)

    def test_duplicate_half_target(self):
        self.assertEqual(count_pairs_with_sum([2, 2, 2, 2], 4), 6)

    def test_empty_and_no_matches(self):
        self.assertEqual(count_pairs_with_sum([], 0), 0)
        self.assertEqual(count_pairs_with_sum([1, 2, 3], 10), 0)

    def test_negative_target(self):
        self.assertEqual(count_pairs_with_sum([-3, -2, -1, 0], -3), 2)
