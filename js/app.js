var TEMPLATES = {};

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
        }
    };

var UI = UI || {
        setup: function(){
            TEMPLATES = {
                calc_line: _.template($('#calc_line_template').html())
            }
        },
        refresh: function(){

        },
        recalculate_line: function($question) {
            var question = $question.text();
            var $tr = $question.parents("tr")
            var q_value = false;
            try {
                q_value = ACALC.calculate_line(question);
            }
            catch (e) {
                console.log(e);
            }
            finally {
                if(q_value) {
                    var $answer = $("td.answer", $tr);
                    $answer.html(q_value);
                }
            }
        },
        new_line: function($current) {
            if($current.length > 0) {
                var $tr = $current.parents("tr");
                $tr.after(TEMPLATES.calc_line({}));
            }
            else {
                $('#workspace').append(TEMPLATES.calc_line({}));
            }
        },
        move_next: function($current) {
            var $tr = $current.parents("tr");
            try {
                var $next = $("div.question", $tr.next("tr.calc_line"));
                $next.focus();
            } catch(e) {
                console.log(e);
                if (e instanceof TypeError) {
                    UI.new_line($current);
                }
            }
        },
        move_prev: function($current) {
            console.log("prev");
            var $tr = $current.parents("tr");
            try {
                var $prev = $("div.question", $tr.prev("tr.calc_line"));
                $prev.focus();
            } catch(e){
                console.log(e);
            }
        }
    };


$(function(){
    UI.setup();
    UI.new_line([]);
    $(".calc_line .question:last").focus();

    $("#workspace").on("keydown", ".calc_line", function(evt){
        var $target = $(evt.target);
        if(!evt.shiftKey) {
            switch (evt.keyCode) {
                case 13:
                    evt.preventDefault();
                    UI.new_line($target);
                    UI.move_next($target);
                    break;
                case 40:
                    evt.preventDefault();
                    UI.move_next($target);
                    break;
                case 38:
                    evt.preventDefault();
                    UI.move_prev($target);
                    break;
            }
        }
    });

    $("#workspace").on("keyup", ".calc_line", function(evt){
        var $target = $(evt.target);
        if(!evt.shiftKey) {
            UI.recalculate_line($target, evt.value);
        }
    });
});
