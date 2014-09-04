import decimal
import unittest
from ..calculator import do_calc


class TestCalculator(unittest.TestCase):
    def assert_calc(self, tree, expected):
        result = do_calc(tree)
        self.assertEqual(result, expected)

    def test_simple_addition(self):
        tree = [1, "+", 2]
        self.assert_calc(tree, 3)

    def test_simple_subtraction(self):
        tree = [4, "-", 1]
        self.assert_calc(tree, 3)

    def test_simple_multiplication(self):
        tree = [2, "*", 3]
        self.assert_calc(tree, 6)

    def test_simple_division(self):
        tree = [4, "/", 2]
        self.assert_calc(tree, 2)

    def test_big_addition(self):
        tree = [1, '+', 2, '+', 3, '+', 4, '+', 5]
        self.assert_calc(tree, 15)

    def test_subtraction_negative(self):
        tree = [10, '-', 5, '-', 5, '-', 5]
        self.assert_calc(tree, -5)

    def test_simple_mixed(self):
        tree = [100, '-', 55, '+', 10]
        self.assert_calc(tree, 55)

    def test_decimal_result(self):
        tree = [1, '/', 4]
        self.assert_calc(tree, decimal.Decimal(0.25))

    def test_decimal_operands(self):
        tree = [decimal.Decimal(0.5), '*', decimal.Decimal(0.5)]
        self.assert_calc(tree, decimal.Decimal(0.25))