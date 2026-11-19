import unittest
from submission import is_strictly_alternating_signs


class TestIsStrictlyAlternatingSigns(unittest.TestCase):
    def test_empty_and_single(self):
        self.assertTrue(is_strictly_alternating_signs([]))
        self.assertTrue(is_strictly_alternating_signs([5]))
        self.assertTrue(is_strictly_alternating_signs([-3]))
        self.assertFalse(is_strictly_alternating_signs([0]))

    def test_valid_alternating(self):
        self.assertTrue(is_strictly_alternating_signs([1, -2, 3, -4]))
        self.assertTrue(is_strictly_alternating_signs([-1, 2, -3]))

    def test_same_sign_adjacent(self):
        self.assertFalse(is_strictly_alternating_signs([1, 2, -3]))
        self.assertFalse(is_strictly_alternating_signs([1, -2, -3]))

    def test_contains_zero(self):
        self.assertFalse(is_strictly_alternating_signs([1, 0, -1]))
        self.assertFalse(is_strictly_alternating_signs([-2, 3, 0]))
