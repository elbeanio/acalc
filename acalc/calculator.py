from __future__ import division
import decimal
import operator


def do_calc(node):
    op = None
    value = 0

    for item in node:
        if item == "+":
            op = operator.add
            continue
        elif item == "-":
            op = operator.sub
            continue
        elif item == "*":
            op = operator.mul
            continue
        elif item == "/":
            op = operator.div
            continue
        if op:
            value = op(value, decimal.Decimal(item))
        else:
            value = decimal.Decimal(item)

    return value


if __name__ == "__main__":
    print "1 + 1 =", do_calc([1, "+", 1])
    print "5 + 4 + 3 + 2 + 1 - 10 =", do_calc([5, "+", 4, "+", 3, "+", 2, "+", 1, "-", 10])
