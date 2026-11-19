import unittest
from submission import camel_to_snake_ascii


class TestCamelToSnakeAscii(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(camel_to_snake_ascii(""), "")

    def test_camel_and_pascal(self):
        self.assertEqual(camel_to_snake_ascii("camelCase"), "camel_case")
        self.assertEqual(camel_to_snake_ascii("PascalCase"), "pascal_case")

    def test_acronym_boundary(self):
        self.assertEqual(camel_to_snake_ascii("parseHTTPCode"), "parse_http_code")
        self.assertEqual(camel_to_snake_ascii("HTTPServer"), "http_server")
        self.assertEqual(camel_to_snake_ascii("HTTP"), "http")

    def test_digits_and_existing_underscore(self):
        self.assertEqual(camel_to_snake_ascii("user2Name"), "user2_name")
        self.assertEqual(camel_to_snake_ascii("already_Snake"), "already_snake")
