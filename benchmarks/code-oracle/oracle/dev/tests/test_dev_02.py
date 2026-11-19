import unittest
from submission import running_maximum


class TestRunningMaximum(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(running_maximum([]), [])

    def test_mixed_values(self):
        self.assertEqual(running_maximum([3, 1, 4, 2, 5]), [3, 3, 4, 4, 5])

    def test_all_negative(self):
        self.assertEqual(running_maximum([-10, -15, -3, -4]), [-10, -10, -3, -3])

    def test_single_element(self):
        self.assertEqual(running_maximum([42]), [42])

    def test_duplicates(self):
        self.assertEqual(running_maximum([2, 2, 1, 2]), [2, 2, 2, 2])

    def test_input_not_mutated(self):
        data = [1, 5, 2]
        running_maximum(data)
        self.assertEqual(data, [1, 5, 2])
