import unittest
from submission import dedupe_keep_last


class TestDedupeKeepLast(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(dedupe_keep_last([]), [])

    def test_keeps_last_occurrence_order(self):
        self.assertEqual(dedupe_keep_last([1, 2, 1, 3, 2]), [1, 3, 2])

    def test_all_unique(self):
        self.assertEqual(dedupe_keep_last([4, -1, 0, 9]), [4, -1, 0, 9])

    def test_all_identical(self):
        self.assertEqual(dedupe_keep_last([7, 7, 7]), [7])

    def test_negative_and_zero(self):
        self.assertEqual(dedupe_keep_last([0, -2, 0, -2, 5]), [0, -2, 5])

    def test_input_not_mutated(self):
        data = [3, 1, 3]
        self.assertEqual(dedupe_keep_last(data), [1, 3])
        self.assertEqual(data, [3, 1, 3])
