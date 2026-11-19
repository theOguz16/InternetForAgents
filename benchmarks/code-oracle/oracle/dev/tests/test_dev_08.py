import unittest
from submission import clamp_value


class TestClampValue(unittest.TestCase):
    def test_inside_range(self):
        self.assertEqual(clamp_value(5, 0, 10), 5)

    def test_below_and_above(self):
        self.assertEqual(clamp_value(-3, 0, 10), 0)
        self.assertEqual(clamp_value(15, 0, 10), 10)

    def test_swapped_bounds(self):
        self.assertEqual(clamp_value(5, 10, 0), 5)
        self.assertEqual(clamp_value(-2, 10, 0), 0)
        self.assertEqual(clamp_value(20, 10, 0), 10)

    def test_equal_bounds(self):
        self.assertEqual(clamp_value(100, -4, -4), -4)

    def test_negative_bounds(self):
        self.assertEqual(clamp_value(-7, -10, -5), -7)
        self.assertEqual(clamp_value(-2, -10, -5), -5)
