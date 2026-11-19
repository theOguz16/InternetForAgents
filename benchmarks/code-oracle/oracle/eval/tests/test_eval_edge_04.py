import unittest
from submission import intervals_covered_length


class TestIntervalsCoveredLength(unittest.TestCase):
    def test_length_mismatch_returns_minus_one(self):
        self.assertEqual(intervals_covered_length([1, 2], [3]), -1)

    def test_empty_and_invalid_intervals(self):
        self.assertEqual(intervals_covered_length([], []), 0)
        self.assertEqual(intervals_covered_length([5, 3], [5, 1]), 0)

    def test_overlapping_and_contained(self):
        self.assertEqual(intervals_covered_length([1, 2, 3], [6, 4, 8]), 7)

    def test_disjoint_and_adjacent(self):
        self.assertEqual(intervals_covered_length([10, 1, 3], [12, 3, 5]), 6)

    def test_negative_coordinates(self):
        self.assertEqual(intervals_covered_length([-10, -6], [-4, -1]), 9)
