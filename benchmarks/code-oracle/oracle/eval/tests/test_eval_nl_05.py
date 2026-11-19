import unittest
from submission import rotate_list_right


class TestRotateListRight(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(rotate_list_right([], 3), [])

    def test_positive_rotation(self):
        self.assertEqual(rotate_list_right([1, 2, 3, 4, 5], 2), [4, 5, 1, 2, 3])

    def test_steps_greater_than_length(self):
        self.assertEqual(rotate_list_right([1, 2, 3], 7), [3, 1, 2])

    def test_negative_steps_rotates_left(self):
        self.assertEqual(rotate_list_right([1, 2, 3, 4], -1), [2, 3, 4, 1])

    def test_zero_or_multiple_returns_copy(self):
        data = [10, 20, 30]
        res = rotate_list_right(data, 0)
        self.assertEqual(res, [10, 20, 30])
        self.assertIsNot(res, data)
        self.assertEqual(rotate_list_right(data, 6), [10, 20, 30])

    def test_single_element(self):
        self.assertEqual(rotate_list_right([9], -5), [9])
