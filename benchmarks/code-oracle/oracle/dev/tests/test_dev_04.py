import unittest
from submission import filter_in_closed_range


class TestFilterInClosedRange(unittest.TestCase):
    def test_inclusive_bounds(self):
        self.assertEqual(filter_in_closed_range([0, 1, 5, 10, 11], 1, 10), [1, 5, 10])

    def test_inverted_bounds(self):
        self.assertEqual(filter_in_closed_range([1, 2, 3], 5, 1), [])

    def test_equal_bounds(self):
        self.assertEqual(filter_in_closed_range([2, 3, 2, 4], 2, 2), [2, 2])

    def test_negative_range(self):
        self.assertEqual(filter_in_closed_range([-10, -5, -1, 0], -6, -1), [-5, -1])

    def test_empty_input(self):
        self.assertEqual(filter_in_closed_range([], -10, 10), [])

    def test_input_not_mutated(self):
        data = [3, 1, 4]
        filter_in_closed_range(data, 1, 3)
        self.assertEqual(data, [3, 1, 4])
