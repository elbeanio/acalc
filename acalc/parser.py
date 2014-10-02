from decimal import Decimal
from pyparsing import *

from debug import parse_action

integer = Word(nums).setParseAction(lambda t: int(t[0]))
variable = Word(alphas, exact=1)
point = Literal(".")
e = CaselessLiteral("E")


@parse_action
def number_parse(num="0"):
    return Decimal("".join(num))


decimal = Combine(Word("+-" + nums, nums) +
                  Optional(point + Optional(Word(nums)))).setParseAction(number_parse).setResultsName("NUMBER")
operand = decimal | integer | variable

expop = Literal('^').setResultsName("EXPOP")
signop = oneOf('+ -').setResultsName("SIGNOP")
multop = oneOf('* /').setResultsName("MULTOP")
plusop = oneOf('+ -').setResultsName("PLUSOP")
factop = Literal('!').setResultsName("FACTOP")

calc_expr = operatorPrecedence(operand,
                               [(factop, 1, opAssoc.LEFT),
                               (expop, 2, opAssoc.RIGHT),
                               (signop, 1, opAssoc.RIGHT),
                               (multop, 2, opAssoc.LEFT),
                               (plusop, 2, opAssoc.LEFT)]
                               )


def is_sequence(arg):
    return (not hasattr(arg, "strip") and
            hasattr(arg, "__getitem__") or
            hasattr(arg, "__iter__"))


def reduce_tree(tree, reducer):
    new_tree = []
    for item in tree:
        if is_sequence(item):
            new_tree.append(reduce_tree(item, reducer))
        else:
            new_tree.append(item)

    return reducer(new_tree)


def parse_calc_string(calc):
    return calc_expr.parseString(calc)


def parse_mod_string(mod):
    return