import unittest
from submission import difference_consecutive


class TestDifferenceConsecutive(unittest.TestCase):
    def test_short_lists(self):
        self.assertEqual(difference_consecutive([]), [])
        self.assertEqual(difference_consecutive([10]), [])

    def test_increasing_and_decreasing(self):
        self.assertEqual(difference_consecutive([3, 8, 8, 2]), [5, 0, -6])

    def test_negatives(self):
        self.assertEqual(difference_consecutive([-5, -2, -9]), [3, -7])

    def test_input_not_mutated(self):
        data = [1, 4, 9]
        difference_consecutive(data)
        self.assertEqual(data, [1, 4, 9])
