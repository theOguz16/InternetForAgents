import unittest
from submission import merge_sorted_unique


class TestMergeSortedUnique(unittest.TestCase):
    def test_empty_inputs(self):
        self.assertEqual(merge_sorted_unique([], []), [])
        self.assertEqual(merge_sorted_unique([], [1, 1, 2]), [1, 2])
        self.assertEqual(merge_sorted_unique([-2, -2], []), [-2])

    def test_removes_cross_and_internal_duplicates(self):
        self.assertEqual(merge_sorted_unique([1, 2, 2, 5], [2, 3, 5, 5]), [1, 2, 3, 5])

    def test_negative_and_zero(self):
        self.assertEqual(merge_sorted_unique([-5, -1, 0], [-5, 0, 4]), [-5, -1, 0, 4])

    def test_inputs_not_mutated(self):
        a = [1, 3]
        b = [2, 3]
        merge_sorted_unique(a, b)
        self.assertEqual(a, [1, 3])
        self.assertEqual(b, [2, 3])
