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

arguments    = argument ( "," argument )* ;
argument     = expression | range ;
range        = REF ".." REF ;   (* row-id range for aggregates, e.g. $1..$5 *)
```

A **range** `$1..$5` is only valid as a function argument. Its endpoints must be
bare row ids (`$1`, `$5`), not names or expressions, since names have no order.
It expands to the values of the existing rows whose id lies in `[1, 5]`
inclusive — **gaps are skipped** (a deleted id in the range is not a dangling
reference), and a range that spans its own row is a circular reference. Ranges
feed the variadic aggregates: `sum`, `product`, `avg`/`mean`, `count`, `min`,
`max` — e.g. `sum($1..$5)`, `avg($2..$8)`.

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

## Units

Values can carry units, with dimensional analysis and conversion:

```ebnf
expression = additive ( ("to" | "in") unitExpr )* ;   (* conversion, lowest *)
quantity   = power unitExpr? ;                         (* juxtaposition: 5 km *)
unitExpr   = unitFactor ( ("*" | "/") unitFactor )* ;  (* only when a unit follows *)
unitFactor = ( UNIT | "(" unitExpr ")" ) ( "^" NUMBER )? ;
```

- A number followed by a unit is a quantity: `5 km`, `50 mph`, `20°C`. Compound
  units use `*` `/` `^`: `10 m/s`, `5 m^2`.
- `to` / `in` convert: `50 mph in km/h`, `20°C to °F`, `1 GiB in MB`.
- `+` and `−` require the same dimension; `*` `/` combine dimensions.
- **Families:** length, mass, time (+ derived speed/area/volume), temperature
  (°C/°F/K, affine), digital storage (KB…/KiB…), angles (deg/rad — trig accepts
  degrees), and currency (£/€/¥ + ISO codes, **static approximate rates**).
- `in` is the conversion keyword, so **inches** are written `inch`/`inches`.
- **Currency is postfix only** — `40 USD`, `10 GBP` (symbols `£`/`€`/`¥` are
  accepted as input but display as the ISO code). `$` is the reference sigil, so
  there is no `$40` prefix form; write `40 USD`.
- Temperature accepts lowercase aliases: `20c in f` works (as do `°C`/`°F`).
  It is affine: conversions are correct (`20c in f` = `68°F`), but adding two
  temperatures adds absolute kelvin values.
- Units render next to the number with no space (`5.3km`, `68°F`).
- Currency, data and temperature are *amounts*: scale/add/convert and rates
  (`£/month`, `MB/s`) are fine, but a square (`byte²`, `money²`) is an error —
  there's no such thing as a square gigabyte.

## Lexical grammar (tokens)

```ebnf
NUMBER = ( DIGIT+ "."? DIGIT* | "." DIGIT+ ) ( ("e"|"E") ("+"|"-")? DIGIT+ )? ;
REF    = "$" ( IDENT | DIGIT+ ) ;      (* $3 references by id; $name by name *)
".."   = range operator (between two REFs, in a function argument) ;
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
  `exp`, `abs`, `round`, `min`, `max`, and the aggregates `sum`, `product`,
  `avg`/`mean`, `count`, … (see the evaluator's function table).

An identifier that resolves to neither a known constant nor a called function is
an evaluation error.

## References

- `$3` — reference the row whose **immutable id** is 3.
- `$name` — reference the row named `name`.

Ids are assigned monotonically at row creation and never reused or renumbered, so
a reference is stable regardless of insertion, deletion, or reordering. A
reference to a row that no longer exists is a dangling reference (`#ref!`).
