import unittest
from submission import partition_even_odd_stable


class TestPartitionEvenOddStable(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(partition_even_odd_stable([]), [])

    def test_preserves_relative_order(self):
        self.assertEqual(partition_even_odd_stable([3, 8, 1, 4, 5, 2]), [8, 4, 2, 3, 1, 5])

    def test_zero_and_negatives(self):
        self.assertEqual(partition_even_odd_stable([-3, 0, -4, 7, -1, 2]), [0, -4, 2, -3, 7, -1])

    def test_all_even_or_all_odd(self):
        self.assertEqual(partition_even_odd_stable([2, 6, 4]), [2, 6, 4])
        self.assertEqual(partition_even_odd_stable([9, 3, 7]), [9, 3, 7])

    def test_input_not_mutated(self):
        data = [5, 2, 1, 4]
        partition_even_odd_stable(data)
        self.assertEqual(data, [5, 2, 1, 4])
