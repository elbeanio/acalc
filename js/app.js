var TEMPLATES = {};
var DRAGGING = "";

var DATA = DATA || {
        lines: {
            "_id": "lines",
            "data": {}
        },
        db: new PouchDB("acalc_data"),
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
            switch(token.arity){
                case "literal":
                    return token.value;
                case "binary":
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
                case "tag":
                    var id = token.first["href"].split("#")[1].split("_")[1];
                    var tree = ACALC.parse($("#q_" + id).html());
                    return ACALC.run(tree);
                case "function":
                    console.log(token);
            }
        },
        calculate_line: function (id, question) {
            question = _.trim(question);
            var tree = ACALC.parse(question);
            console.log(tree);
            var answer = ACALC.run(tree);
            DATA.lines.data[id] = question;
            return answer;
        }
    };

var UI = UI || {
        setup: function(){
            TEMPLATES = {
                calc_line: _.template($("#calc_line_template").html())
            }
        },
        refresh: function(){

        },
        recalculate_line: function($question) {
            var question = $question.html();
            console.log(question);
            var $tr = $question.parents("tr");
            var q_value = false;
            try {
                q_value = ACALC.calculate_line($tr.attr("id"), question);
            }
            catch (e) {
                console.log(e);
            }
            finally {
                if(q_value) {
                    var $answer = $("td.answer a", $tr);
                    $answer.html(q_value);
                }
            }
        },
        new_line: function($current) {
            if($current.length > 0) {
                var $tr = $current.parents("tr");
                $tr.after(TEMPLATES.calc_line({"stamp": Date.now()}));
            }
            else {
                $("#workspace").append(TEMPLATES.calc_line({"stamp": Date.now()}));
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
    //TODO: Store the last focused line - use an event rather than peppering the app with calls to "set_line" or whatever
    //TODO: Store the caret position!
    //TODO: Allow the inserted result to be easily deleted

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

    $("#workspace").on("click", ".calc_line .answer a", function(evt){
        evt.preventDefault();
        return false;
    });

    $("#workspace").on("dragstart", ".calc_line .answer a", function(evt){
        DRAGGING = $(evt.target).attr("id").split("_")[1];

    })

    $("#workspace").on("drop", ".question", function(evt){
        var dropping = $(evt.target).attr("id").split("_")[1];
        if (DRAGGING != dropping) {
            return true;
        }
        evt.preventDefault();
    });
});
