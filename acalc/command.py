import cmd
from collections import deque
import sys
from parser import parse_calc_string, reduce_tree, is_sequence
import pyparsing
from calculator import do_calc


class CalcCmd(cmd.Cmd):
    calculations = deque()
    state = ""

    @staticmethod
    def _quit():
        sys.exit(0)

    def _add_calc_tree(self, ln):
        tree = parse_calc_string(ln)
        self.calculations.appendleft(tree)

    def eval_calc(self):
        return reduce_tree(self.calculations[0], do_calc, self.calculations)

    def format_calc(self, index=-1):
        def format_expr(calc):
            fmt = ""
            for elm in calc:
                if is_sequence(elm):
                    fmt += "(" + format_expr(elm) + ")"
                else:
                    fmt += str(elm)
            return fmt

        if index > -1:
            return "{0}: {1}".format(index, format_expr(self.calculations[index][0]))
        else:
            return format_expr(self.calculations[0][0])

    def default(self, ln):
        try:
            self._add_calc_tree(ln)
        except pyparsing.ParseException:
            print "Don't understand that."
            return
        print self.format_calc() + " = " + str(self.eval_calc())

    def do_list(self, command):
        """Lists all the calculations in the buffer"""
        for idx, calc in enumerate(self.calculations):
            print self.format_calc(idx)

    def do_rep(self, command):
        """Replaces a value in a previous calculation with the new one"""
        print command

    def do_quit(self, command):
        """Quits so you can do something much more interesting"""
        print command
        self._quit()
