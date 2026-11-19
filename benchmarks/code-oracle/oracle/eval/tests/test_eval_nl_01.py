import unittest
from submission import count_strict_peaks


class TestCountStrictPeaks(unittest.TestCase):
    def test_short_lists(self):
        self.assertEqual(count_strict_peaks([]), 0)
        self.assertEqual(count_strict_peaks([5]), 0)
        self.assertEqual(count_strict_peaks([1, 9]), 0)

    def test_multiple_peaks(self):
        self.assertEqual(count_strict_peaks([1, 3, 2, 5, 1, 4, 2]), 3)

    def test_plateau_not_counted(self):
        self.assertEqual(count_strict_peaks([1, 3, 3, 1]), 0)
        self.assertEqual(count_strict_peaks([2, 2, 2]), 0)
        self.assertEqual(count_strict_peaks([1, 4, 4, 5, 2]), 1)

    def test_negative_values(self):
        self.assertEqual(count_strict_peaks([-5, -2, -4, -1, -3]), 2)

    def test_monotonic_lists(self):
        self.assertEqual(count_strict_peaks([1, 2, 3, 4]), 0)
        self.assertEqual(count_strict_peaks([4, 3, 2, 1]), 0)

    def test_endpoints_ignored(self):
        self.assertEqual(count_strict_peaks([10, 2, 1, 9]), 0)
