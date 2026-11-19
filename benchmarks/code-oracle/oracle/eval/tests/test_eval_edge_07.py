import unittest
from submission import slice_with_clamped_bounds


class TestSliceWithClampedBounds(unittest.TestCase):
    def test_normal_slice(self):
        self.assertEqual(slice_with_clamped_bounds([10, 20, 30, 40], 1, 3), [20, 30])

    def test_negative_start_clamped_to_zero(self):
        self.assertEqual(slice_with_clamped_bounds([10, 20, 30], -2, 2), [10, 20])

    def test_negative_end_clamped_to_zero(self):
        self.assertEqual(slice_with_clamped_bounds([10, 20, 30], 0, -1), [])

    def test_bounds_above_length_clamped(self):
        self.assertEqual(slice_with_clamped_bounds([1, 2, 3], 1, 99), [2, 3])
        self.assertEqual(slice_with_clamped_bounds([1, 2, 3], 5, 10), [])

    def test_inverted_or_empty(self):
        self.assertEqual(slice_with_clamped_bounds([1, 2, 3], 2, 1), [])
        self.assertEqual(slice_with_clamped_bounds([], -5, 5), [])
