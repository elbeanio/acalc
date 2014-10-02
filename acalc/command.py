import cmd
import sys
from parser import parse_calc_string, parse_mod_string, reduce_tree
import pyparsing
from calculator import do_calc


class CalcCmd(cmd.Cmd):
    calculations = []

    @staticmethod
    def _quit():
        sys.exit(0)

    def _add_calc_tree(self, ln):
        tree = parse_calc_string(ln)
        self.calculations.append(tree)

    def eval_calc(self, index=-1):
        print reduce_tree(self.calculations[index], do_calc)

    def print_calc(self, index=-1):
        if index > -1:
            print index, self.calculations[index][0]
        else:
            print self.calculations[index][0]

    def default(self, ln):
        try:
            self._add_calc_tree(ln)
        except pyparsing.ParseException:
            print "Don't understand that."
            return
        self.print_calc()
        self.eval_calc()

    def do_list(self, command):
        for idx, calc in enumerate(self.calculations):
            self.print_calc(idx)

    def do_set(self, command):
        print command

    def do_q(self, command):
        print command
        self._quit()

    def do_quit(self, command):
        print command
        self._quit()
