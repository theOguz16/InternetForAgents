import unittest
from submission import majority_element_strict


class TestMajorityElementStrict(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(majority_element_strict([], -1), -1)

    def test_clear_majority(self):
        self.assertEqual(majority_element_strict([2, 1, 2, 3, 2], -1), 2)

    def test_exact_half_not_majority(self):
        self.assertEqual(majority_element_strict([1, 2, 1, 2], -9), -9)
        self.assertEqual(majority_element_strict([5, 6], -9), -9)

    def test_single_and_negative_majority(self):
        self.assertEqual(majority_element_strict([0], -1), 0)
        self.assertEqual(majority_element_strict([-3, -3, 1], 0), -3)

    def test_no_majority_odd_length(self):
        self.assertEqual(majority_element_strict([1, 2, 3], -1), -1)
