import unittest
from submission import zero_out_negative_subarrays_sum


class TestZeroOutNegativeSubarraysSum(unittest.TestCase):
    def test_empty_returns_zero(self):
        self.assertEqual(zero_out_negative_subarrays_sum([]), 0)

    def test_all_negative_returns_largest_negative(self):
        self.assertEqual(zero_out_negative_subarrays_sum([-8, -3, -5]), -3)
        self.assertEqual(zero_out_negative_subarrays_sum([-4]), -4)

    def test_mixed_values(self):
        self.assertEqual(zero_out_negative_subarrays_sum([-2, 1, -3, 4, -1, 2, 1, -5, 4]), 6)

    def test_all_positive(self):
        self.assertEqual(zero_out_negative_subarrays_sum([1, 2, 3]), 6)

    def test_zero_among_negatives(self):
        self.assertEqual(zero_out_negative_subarrays_sum([-5, 0, -2]), 0)
