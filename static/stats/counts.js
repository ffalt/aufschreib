//based on http://bl.ocks.org/marcbc/3281521

function countsView() {
    var
        options = {
            type: 'counts',
            mode: 'human',
            kind: null,
            cat: null,
            id: 'counts_'
        };
    var
        stats;

    function init(id, mode, kind, statshelper, forceregenerate) {
        stats = statshelper;
        options.id = id;
        options.mode = mode;
        options.forceregenerate = forceregenerate;
        options.min = parseInt($("#slider").attr("min"));
        options.max = parseInt($("#slider").attr("max"));
        $("#count_slider").dateRangeSlider({
            defaultValues: {min: options.min, max: options.max},
            bounds: {min: options.min, max: options.max},
            formatter: function (val) {
                return moment(val).format("MMM D, HH:mm");
            },
            scales: [
                {
                    first: function (value) {
                        return value;
                    },
                    end: function (value) {
                        return value;
                    },
                    next: function (value) {
                        return moment(value).add('days', 1);
                    },
                    label: function (value) {
                        return moment(value).date();
                    }
                }
            ]
        });
        $("#count_slider").bind("valuesChanged", function (e, data) {
            options.min = data.values.min.valueOf();
            options.max = data.values.max.valueOf();
            stats.requestData(options, generate);
            $('#table').empty();
        });
        stats.requestData(options, generate);
    }

    function generate() {
        var data = stats.getBaseData();
        stats.setData(data);
        var total = data.count;
        var values = [];
        for (var key in data.cats) {
            var v = data.cats[key];
            values.push([stats.getCatInfo(key).name , (v * 100 / total).toFixed(2) + '%', v ]);
        }
        var table = {
            head: ['Bewertung', 'Prozent', 'Anzahl'],
            values: values,
            foot: ['', '100%', total]
        };
        stats.buildTable('#table', table);

//        var total = 0;
//        data.forEach(function (d) {
//            total += d.value;
//        });
//        $('#table').text(JSON.stringify(data));
    }

    return {
        init: init
    };
}

