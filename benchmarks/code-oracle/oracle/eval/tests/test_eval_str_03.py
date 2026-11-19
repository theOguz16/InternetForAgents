import unittest
from submission import longest_common_prefix_list


class TestLongestCommonPrefixList(unittest.TestCase):
    def test_empty_list(self):
        self.assertEqual(longest_common_prefix_list([]), "")

    def test_single_word(self):
        self.assertEqual(longest_common_prefix_list(["agent"]), "agent")

    def test_common_prefix(self):
        self.assertEqual(longest_common_prefix_list(["prefix", "prepare", "prevent"]), "pre")

    def test_case_sensitive(self):
        self.assertEqual(longest_common_prefix_list(["Alpha", "alpha"]), "")
        self.assertEqual(longest_common_prefix_list(["Abc", "Abd"]), "Ab")

    def test_contains_empty_string(self):
        self.assertEqual(longest_common_prefix_list(["abc", "", "ab"]), "")

    def test_shorter_word_is_prefix(self):
        self.assertEqual(longest_common_prefix_list(["flow", "flower", "flowing"]), "flow")
