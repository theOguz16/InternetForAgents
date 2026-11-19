import unittest
from submission import longest_increasing_run


class TestLongestIncreasingRun(unittest.TestCase):
    def test_empty_and_single(self):
        self.assertEqual(longest_increasing_run([]), 0)
        self.assertEqual(longest_increasing_run([7]), 1)

    def test_typical_runs(self):
        self.assertEqual(longest_increasing_run([1, 2, 1, 2, 3, 4, 0]), 4)

    def test_equal_elements_break_run(self):
        self.assertEqual(longest_increasing_run([1, 2, 2, 3]), 2)
        self.assertEqual(longest_increasing_run([5, 5, 5]), 1)

    def test_strictly_decreasing(self):
        self.assertEqual(longest_increasing_run([9, 6, 3, -1]), 1)

    def test_negative_to_positive(self):
        self.assertEqual(longest_increasing_run([-10, -5, 0, 2, 1]), 4)

    def test_longest_at_end(self):
        self.assertEqual(longest_increasing_run([5, 1, 2, 3]), 3)
