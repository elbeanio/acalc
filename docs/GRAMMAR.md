# acalc expression grammar

The calculator evaluates one expression per row. This is the published grammar
the parser implements. It is a small, deliberately-knowable language — there is
no `eval()` anywhere; text is tokenised and parsed into an AST that is evaluated
directly.

## Notation

EBNF-ish. `|` is alternation, `( )` groups, `?` optional, `*` zero-or-more.
Terminals are in `"quotes"` or named in `UPPERCASE` (see Lexical grammar).

## Grammar

```ebnf
expression   = additive ;

additive     = multiplicative ( ( "+" | "-" ) multiplicative )* ;

multiplicative
             = unary ( ( "*" | "/" | "%" ) unary )* ;   (* "%" here is modulo *)

unary        = ( "-" | "+" ) unary
             | power ;

power        = postfix ( "^" unary )? ;                 (* right associative *)

postfix      = primary ( "%" | "!" )* ;   (* "%" = percent, "!" = factorial *)

primary      = NUMBER
             | REF
             | IDENT
             | IDENT "(" arguments? ")"                 (* function call *)
             | "(" expression ")" ;

arguments    = expression ( "," expression )* ;
```

### Precedence, lowest to highest

1. `+` `-`   (binary, left-associative)
2. `*` `/` `%`(modulo)   (left-associative)
3. unary `-` `+`
4. `^` (power, right-associative — binds tighter than unary, so `-2^2 = -4`)
5. `%`(percent, postfix), `!`(factorial, postfix) and function calls

`!` is the postfix factorial: `5!` → `120`. It requires a non-negative integer
operand (otherwise an evaluation error) and is computed exactly.

## The two meanings of `%`

`%` is disambiguated by what follows it:

- **Infix modulo** when immediately followed by an operand-starting token
  (`NUMBER`, `REF`, `IDENT`, or `(`): `10 % 3` → `1`.
- **Postfix percent** (× 0.01) otherwise: `10%` → `0.1`, and therefore
  `200 + 10%` → `200.1` (we do **not** implement Excel-style "percent of the left
  operand").

Consequence / teachable rule: a modulo whose right operand is negative needs
parentheses — `10 % (-3)`, because `10 % -3` reads the `-` as subtraction applied
to `10%` (i.e. `(10%) - 3`).

## Lexical grammar (tokens)

```ebnf
NUMBER = ( DIGIT+ "."? DIGIT* | "." DIGIT+ ) ( ("e"|"E") ("+"|"-")? DIGIT+ )? ;
REF    = "$" ( IDENT | DIGIT+ ) ;      (* $3 references by id; $name by name *)
IDENT  = ( LETTER | "_" ) ( LETTER | DIGIT | "_" )* ;
DIGIT  = "0".."9" ;
LETTER = "a".."z" | "A".."Z" ;
```

Whitespace between tokens is insignificant. The unicode operators `×`, `÷` and
`−` (U+2212) are accepted as aliases for `*`, `/` and `-`.

## Identifiers

Bare identifiers are resolved at evaluation time:

- Constants: `pi`, `e`.
- Function names when followed by `(`: `sin`, `cos`, `tan`, `ln`, `log`, `sqrt`,
  `exp`, `abs`, `round`, `min`, `max`, … (see the evaluator's function table).

An identifier that resolves to neither a known constant nor a called function is
an evaluation error.

## References

- `$3` — reference the row whose **immutable id** is 3.
- `$name` — reference the row named `name`.

Ids are assigned monotonically at row creation and never reused or renumbered, so
a reference is stable regardless of insertion, deletion, or reordering. A
reference to a row that no longer exists is a dangling reference (`#ref!`).
