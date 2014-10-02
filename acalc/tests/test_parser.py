import decimal
import unittest
from ..parser import parse_string, reduce_tree


class TestParser(unittest.TestCase):
    def test_parse_simple_math(self):
        tree = parse_string("1+1")
        self.assertEqual(tree[0][0], 1)
        self.assertEqual(tree[0][1], "+")
        self.assertEqual(tree[0][2], 1)

    def test_parse_decimals(self):
        tree = parse_string("0.5+0.5")
        self.assertEqual(tree[0][0], 0.5)
        self.assertEqual(tree[0][1], "+")
        self.assertEqual(tree[0][2], 0.5)
