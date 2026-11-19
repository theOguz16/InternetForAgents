import unittest
from submission import compare_semver_basic


class TestCompareSemverBasic(unittest.TestCase):
    def test_equal_and_leading_zeros(self):
        self.assertEqual(compare_semver_basic("1.2.3", "1.2.3"), 0)
        self.assertEqual(compare_semver_basic("01.02.003", "1.2.3"), 0)

    def test_numeric_not_lexicographic(self):
        self.assertEqual(compare_semver_basic("1.10.0", "1.2.9"), 1)
        self.assertEqual(compare_semver_basic("0.9.9", "1.0.0"), -1)

    def test_invalid_formats_return_minus_two(self):
        self.assertEqual(compare_semver_basic("1.2", "1.2.0"), -2)
        self.assertEqual(compare_semver_basic("1.2.3.4", "1.2.3"), -2)
        self.assertEqual(compare_semver_basic("1.-2.3", "1.2.3"), -2)
        self.assertEqual(compare_semver_basic("1.2.a", "1.2.3"), -2)
        self.assertEqual(compare_semver_basic(" 1.2.3", "1.2.3"), -2)
        self.assertEqual(compare_semver_basic("", "0.0.0"), -2)
