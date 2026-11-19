import unittest
from submission import are_brackets_balanced


class TestAreBracketsBalanced(unittest.TestCase):
    def test_empty_and_plain_text(self):
        self.assertTrue(are_brackets_balanced(""))
        self.assertTrue(are_brackets_balanced("hello 123"))

    def test_nested_valid(self):
        self.assertTrue(are_brackets_balanced("a(b[c{d}e]f)g"))

    def test_mismatched_type_false(self):
        self.assertFalse(are_brackets_balanced("(]"))
        self.assertFalse(are_brackets_balanced("([)]"))

    def test_reversed_or_unclosed_false(self):
        self.assertFalse(are_brackets_balanced(")("))
        self.assertFalse(are_brackets_balanced("(([]"))
        self.assertFalse(are_brackets_balanced("[]]"))
