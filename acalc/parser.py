from decimal import Decimal
import pyparsing as pp

from debug import parse_action

@parse_action
def number_parse(num="0"):
    return Decimal("".join(num))


integer = pp.Word(pp.nums).setParseAction(lambda t: int(t[0]))
expansion = pp.Word("#", pp.nums)
point = pp.Literal(".")
e = pp.CaselessLiteral("E")
decimal = pp.Combine(pp.Word("+-" + pp.nums, pp.nums) +
                     pp.Optional(point + pp.Optional(pp.Word(pp.nums)))).setParseAction(number_parse)

expop = pp.Literal('^')
signop = pp.oneOf('+ -')
multop = pp.oneOf('* /')
plusop = pp.oneOf('+ -')
factop = pp.Literal('!')

operand = expansion | decimal | integer

calc_expr = pp.operatorPrecedence(operand,
                                  [(factop, 1, pp.opAssoc.LEFT),
                                  (expop, 2, pp.opAssoc.RIGHT),
                                  (signop, 1, pp.opAssoc.RIGHT),
                                  (multop, 2, pp.opAssoc.LEFT),
                                  (plusop, 2, pp.opAssoc.LEFT)]
                                  )


def is_sequence(arg):
    return (not hasattr(arg, "strip") and
            hasattr(arg, "__getitem__") or
            hasattr(arg, "__iter__"))


def reduce_tree(tree, reducer, tree_list):
    new_tree = []
    for item in tree:
        if is_sequence(item):
            new_tree.append(reduce_tree(item, reducer, tree_list))
        elif isinstance(item, basestring) and item.startswith("#"):
            number = int(item.replace("#", "")) + 1
            new_tree.append(reduce_tree(tree_list[number], reducer, tree_list))
        else:
            new_tree.append(item)

    return reducer(new_tree)


def parse_calc_string(calc):
    return calc_expr.parseString(calc)


def parse_mod_string(mod):
    return