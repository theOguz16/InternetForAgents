import unittest
from submission import join_non_empty


class TestJoinNonEmpty(unittest.TestCase):
    def test_filters_blank_items(self):
        self.assertEqual(join_non_empty(["a", "", "   ", "\t\n", "b"], "-"), "a-b")

    def test_preserves_surrounding_spaces_on_kept(self):
        self.assertEqual(join_non_empty([" a ", "b "], "|"), " a |b ")

    def test_all_empty_or_empty_list(self):
        self.assertEqual(join_non_empty([], ","), "")
        self.assertEqual(join_non_empty(["", " ", "\r\n"], ","), "")

    def test_empty_separator(self):
        self.assertEqual(join_non_empty(["x", " ", "y"], ""), "xy")

    def test_input_not_mutated(self):
        data = ["one", "", "two"]
        join_non_empty(data, ",")
        self.assertEqual(data, ["one", "", "two"])
