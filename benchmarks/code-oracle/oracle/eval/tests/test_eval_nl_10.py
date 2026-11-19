import unittest
from submission import weighted_prefix_score


class TestWeightedPrefixScore(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(weighted_prefix_score([]), 0)

    def test_single_element(self):
        self.assertEqual(weighted_prefix_score([7]), 7)

    def test_multiple_positive(self):
        self.assertEqual(weighted_prefix_score([2, 3, 4]), 20)

    def test_negatives_and_zero(self):
        self.assertEqual(weighted_prefix_score([-1, 0, 5, -2]), 6)
