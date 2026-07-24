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
range        = REF ".." REF ;   (* row range for aggregates, e.g. $1..$5 *)
```

A **range** `$1..$5` is only valid as a function argument. Its endpoints are
bare references — ids (`$1`) or names (`$start`), which resolve to their ids; an
unresolvable endpoint is a dangling reference. It expands to the values of the
existing rows whose id lies between the two endpoints (inclusive, either order)
— **gaps are skipped** (a deleted id in the range is not dangling), and a range
that spans its own row is a circular reference. Ranges feed the variadic
aggregates: `sum`, `product`, `avg`/`mean`, `count`, `min`, `max` — e.g.
`sum($1..$5)`, `avg($start..$end)`.

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
quantity   = single ( single )* ;                     (* juxtaposed parts sum *)
single     = power unitExpr? ;                         (* juxtaposition: 5 km *)
unitExpr   = unitFactor ( ("*" | "/") unitFactor )* ;  (* only when a unit follows *)
unitFactor = ( UNIT | "(" unitExpr ")" ) ( "^" NUMBER )? ;
```

- A number followed by a unit is a quantity: `5 km`, `50 mph`, `20°C`. Compound
  units use `*` `/` `^`: `10 m/s`, `5 m^2`.
- **Juxtaposed quantities sum**: `2h 30min` = `2.5 hours`, `5ft 3inch` = `5.25 ft`.
  The parts must share a dimension (`2h 30m` is an error — `m` is metres; minutes
  are `min`).
- `to` / `in` convert: `50 mph in km/h`, `20°C to °F`, `1 GiB in MB`.
- `+` and `−` require the same dimension; `*` `/` combine dimensions.
- **Unit juxtaposition binds tighter than `/`**: `1/2 rad` parses as `1/(2 rad)`,
  not `(1/2) rad`. Parenthesise if you mean the latter.
- **Families:** length, mass, time (+ derived speed/area/volume), temperature
  (°C/°F/K, affine), digital storage (KB…/KiB…), angles (deg/rad — trig accepts
  degrees), and currency (£/€/¥ + ISO codes, **static approximate rates**).
- `in` is the conversion keyword, so **inches** are written `inch`/`inches`.
- **Currency is postfix only** — `40 USD`, `10 GBP` (symbols `£`/`€`/`¥` are
  accepted as input but display as the ISO code). `$` is the reference sigil, so
  there is no `$40` prefix form; write `40 USD`.
- Temperature accepts lowercase aliases: `20c in f` works (as do `°C`/`°F`).
  It is affine: conversions are correct (`20c in f` = `68°F`). Adding two
  absolute temperatures is rejected (subtract for a difference, or add a change
  in `K`); `20°C + 5K` = `25°C` is fine.
- Units render next to the number with no space (`5.3km`, `68°F`).
- Currency, data and temperature are *amounts*: scale/add/convert and rates
  (`£/month`, `MB/s`) are fine, but a square (`byte²`, `money²`) is an error —
  there's no such thing as a square gigabyte.

## Number bases

Integers can be written in hex, binary, or octal (`0xFF`, `0b1010`, `0o777`),
and any integer result can be *displayed* in a base by reusing the conversion
operator: `255 to hex` → `0xff`, `0b1010 to dec` → `10`. Aliases: `hex`/
`hexadecimal`, `bin`/`binary`, `oct`/`octal`, `dec`/`decimal`. The base is a
display attribute (arithmetic still happens in decimal, `0xFF + 1` = `256`); it
requires a whole, unitless number.

## Dates

Dates are ISO literals (`2026-12-25`) plus the keyword `today`. They ride the
units engine as points in time:

- `date − date` → a duration in **days** (`2026-12-25 - today`, convert with
  `in weeks`).
- `date ± duration` → a date. Fixed durations shift by that many days
  (`today + 3 weeks`); whole **months**/**years** apply calendar arithmetic with
  end-of-month clamping (`2026-01-31 + 1 month` → `2026-02-28`).
- Left-to-right, so `date + 1 month + 5 days` adds the month (calendar) then the
  days. Adding two dates, or a bare number, is an error.
- Durations combine by juxtaposition (`2h 30min`) or `+`; minutes are `min`.

**Clock times** are `H:MM` / `HH:MM:SS` literals plus the keyword `now`:

- `time ± duration` → a time, wrapping past midnight (`23:00 + 3h` → `02:00`).
- `time − time` → a duration in hours (`17:00 - 9:30` → `7.5 hours`).
- Adding two times, or mixing a date with a time, is an error (no combined
  date-time value in this version).

## Lexical grammar (tokens)

```ebnf
NUMBER = RADIX
       | ( DIGIT+ "."? DIGIT* | "." DIGIT+ ) ( ("e"|"E") ("+"|"-")? DIGIT+ )? ;
RADIX  = "0x" HEXDIGIT+ | "0b" ("0"|"1")+ | "0o" OCTDIGIT+ ;  (* 0xFF 0b1010 0o777 *)
DATE   = DIGIT{4} "-" DIGIT{2} "-" DIGIT{2} ;      (* ISO date, 2026-12-25 *)
TIME   = DIGIT DIGIT? ":" DIGIT{2} ( ":" DIGIT{2} )? ; (* clock time, 9:30 *)
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
