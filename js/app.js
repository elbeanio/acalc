var DATA = DATA || {
        lines: {
            "_id": "lines",
            "data": []
        },
        db: new PouchDB('acalc_data'),
        load_lines: function () {
            DATA.db.get("lines").then(function (doc) {
                DATA.lines = doc;
            }).catch(function (err) {
                DATA.db.put(DATA.lines);
                console.log(err);
            });
        },
        save_lines: function () {
            DATA.db.get("lines").then(function (doc) {
                doc.data = DATA.lines.data;
                return DATA.db.put(doc);
            }).then(function () {
                return DATA.db.get("lines");
            }).then(function (doc) {
                DATA.lines = doc;
            });
        },
        empty: function () {
            if (confirm("Clear all calculations?")) {
                DATA.lines.data = [];
                this.save_lines();
            }
        }
    };


var ACALC = ACALC || {
        parse: make_parse(),
        run: function (token) {
            if (token.arity == "literal") {
                return token.value
            }
            if (token.arity == "binary") {
                switch (token.value) {
                    case "+":
                        return ACALC.run(token.first) + ACALC.run(token.second);
                    case "-":
                        return ACALC.run(token.first) - ACALC.run(token.second);
                    case "*":
                        return ACALC.run(token.first) * ACALC.run(token.second);
                    case "/":
                        return ACALC.run(token.first) / ACALC.run(token.second);
                }
            }
        },
        calculate_line: function (question) {
            question = _.trim(question);
            var tree = ACALC.parse(question);
            var answer = ACALC.run(tree);
            DATA.lines.data.push(question);
            return answer;
        },
    };

var UI = UI || {
        refresh: function(){

        },
        recalculate_line: function(idx) {

        },
        new_line: function($current) {
            $current.after('<div class="calc_line" contenteditable="true"></div>');
        },
        move_next: function($current) {
            try {
                var $next = $current.next("div.calc_line");
                $next.focus();
            } catch(e) {
                console.log(e);
                if (e instanceof TypeError) {
                    UI.new_line($current);
                }
            }
        },
        move_prev: function($current) {
            try {
                $current.prev("div.calc_line").focus();
            } catch(e){

            }
        }
    };


$(function(){
    $(".calc_line:last").focus();

    $(".workspace").on("keydown", ".calc_line", function(evt){
        if(evt.keyCode == 187 && !evt.shiftKey) {
            evt.preventDefault();
            var $target = $(evt.target);
            // get text on line
            var question = $target.text();
            var answer = ACALC.calculate_line(question);
            $target.text(question + " = " + answer + "\n");
            UI.new_line($target);
        }
        if(evt.keyCode == 13 && !evt.shiftKey) {
            evt.preventDefault();
            UI.new_line($(evt.target));
        }
        if(evt.keyCode == 38 && !evt.shiftKey) {
            evt.preventDefault();
            UI.move_prev($(this));

        }
        if(evt.keyCode == 40 && !evt.shiftKey) {
            evt.preventDefault();
            UI.move_next($(this));
        }
    });
});
