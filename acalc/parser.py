from pyparsing import *

integer = Word(nums).setParseAction(lambda t: int(t[0]))
variable = Word(alphas, exact=1)
operand = integer | variable

expop = Literal('^')
signop = oneOf('+ -')
multop = oneOf('* /')
plusop = oneOf('+ -')
factop = Literal('!')

expr = operatorPrecedence(operand,
                          [("!", 1, opAssoc.LEFT),
                           ("^", 2, opAssoc.RIGHT),
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


def parse_string(calc):
    return expr.parseString(calc)