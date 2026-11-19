import unittest
from submission import pair_sums_adjacent


class TestPairSumsAdjacent(unittest.TestCase):
    def test_short_lists(self):
        self.assertEqual(pair_sums_adjacent([]), [])
        self.assertEqual(pair_sums_adjacent([7]), [])

    def test_two_elements(self):
        self.assertEqual(pair_sums_adjacent([4, -1]), [3])

    def test_multiple_elements(self):
        self.assertEqual(pair_sums_adjacent([1, 2, 3, 4]), [3, 5, 7])

    def test_negatives_and_zeros(self):
        self.assertEqual(pair_sums_adjacent([-5, 5, 0, -2]), [0, 5, -2])

    def test_input_not_mutated(self):
        data = [10, 20, 30]
        pair_sums_adjacent(data)
        self.assertEqual(data, [10, 20, 30])
