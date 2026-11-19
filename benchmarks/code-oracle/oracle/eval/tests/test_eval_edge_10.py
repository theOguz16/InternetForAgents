import unittest
from submission import stable_top_k_indices


class TestStableTopKIndices(unittest.TestCase):
    def test_empty_or_non_positive_k(self):
        self.assertEqual(stable_top_k_indices([], 3), [])
        self.assertEqual(stable_top_k_indices([1, 2], 0), [])
        self.assertEqual(stable_top_k_indices([1, 2], -2), [])

    def test_ties_prefer_smaller_index(self):
        self.assertEqual(stable_top_k_indices([5, 9, 9, 5, 9], 3), [1, 2, 4])
        self.assertEqual(stable_top_k_indices([4, 4, 4], 2), [0, 1])

    def test_k_larger_than_length(self):
        self.assertEqual(stable_top_k_indices([-2, 5, 0], 10), [1, 2, 0])

    def test_input_not_mutated(self):
        data = [3, 1, 4]
        stable_top_k_indices(data, 2)
        self.assertEqual(data, [3, 1, 4])
