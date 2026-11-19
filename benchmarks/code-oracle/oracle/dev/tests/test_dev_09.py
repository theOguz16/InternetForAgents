import unittest
from submission import safe_floor_div


class TestSafeFloorDiv(unittest.TestCase):
    def test_zero_denominator(self):
        self.assertEqual(safe_floor_div(10, 0, -1), -1)
        self.assertEqual(safe_floor_div(0, 0, 99), 99)

    def test_positive_division(self):
        self.assertEqual(safe_floor_div(7, 2, 0), 3)

    def test_negative_floor_semantics(self):
        self.assertEqual(safe_floor_div(-7, 2, 0), -4)
        self.assertEqual(safe_floor_div(7, -2, 0), -4)
        self.assertEqual(safe_floor_div(-7, -2, 0), 3)

    def test_zero_numerator(self):
        self.assertEqual(safe_floor_div(0, -5, 1), 0)
