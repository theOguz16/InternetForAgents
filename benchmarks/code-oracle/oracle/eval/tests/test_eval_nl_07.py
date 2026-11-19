import unittest
from submission import second_largest_distinct


class TestSecondLargestDistinct(unittest.TestCase):
    def test_distinct_values(self):
        self.assertEqual(second_largest_distinct([10, 4, 8, 2], -1), 8)

    def test_duplicate_maximum(self):
        self.assertEqual(second_largest_distinct([9, 9, 5, 3], -1), 5)

    def test_insufficient_distinct_values(self):
        self.assertEqual(second_largest_distinct([], -99), -99)
        self.assertEqual(second_largest_distinct([7], -99), -99)
        self.assertEqual(second_largest_distinct([4, 4, 4], -99), -99)

    def test_all_negative(self):
        self.assertEqual(second_largest_distinct([-2, -10, -2, -5], 0), -5)

    def test_input_not_mutated(self):
        data = [3, 1, 2]
        self.assertEqual(second_largest_distinct(data, 0), 2)
        self.assertEqual(data, [3, 1, 2])
