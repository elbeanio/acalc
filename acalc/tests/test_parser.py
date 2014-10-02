import decimal
import unittest
from ..parser import parse_calc_string, reduce_tree


class TestParser(unittest.TestCase):
    def test_parse_simple_math(self):
        tree = parse_calc_string("1+1")
        self.assertEqual(tree[0][0], 1)
        self.assertEqual(tree[0][1], "+")
        self.assertEqual(tree[0][2], 1)

    def test_parse_simple_math_with_spaces(self):
        tree = parse_calc_string(" 1  + 1 ")
        self.assertEqual(tree[0][0], 1)
        self.assertEqual(tree[0][1], "+")
        self.assertEqual(tree[0][2], 1)

    def test_parse_decimals(self):
        tree = parse_calc_string("10.5 + 20.5")
        self.assertEqual(tree[0][0], 10.5)
        self.assertEqual(tree[0][1], "+")
        self.assertEqual(tree[0][2], 20.5)

    def test_parse_decimals_with_zero(self):
        tree = parse_calc_string("0.5+0.0123")
        self.assertEqual(tree[0][0], decimal.Decimal("0.5"))
        self.assertEqual(tree[0][1], "+")
        self.assertEqual(tree[0][2], decimal.Decimal("0.0123"))

    def test_parse_large_decimal(self):
        tree = parse_calc_string("123214304545423542543.5432534553454325432543253")
        self.assertEqual(tree[0], decimal.Decimal("123214304545423542543.5432534553454325432543253"))

