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
        stats, chart;

    function init(id, mode, kind, statshelper, forceregenerate) {
        stats = statshelper;

        options.id = id;
        options.mode = mode;
        options.forceregenerate = forceregenerate;
        options.min = parseInt($("#slider").attr("min"));
        options.max = parseInt($("#slider").attr("max"));
        options.range_min = options.min;
        options.range_max = options.max;


        $('#count_edit_min').datetimepicker({
            format: 'd.m.y H:i',
            value: moment(options.min).format("D.MM.YY HH:mm"),
            onChangeDateTime: function (dp, $input) {
                options.min = dp.valueOf();
                $("#count_slider").dateRangeSlider('values',
                    dp,
                    options.max
                );
            }
        });

        $('#count_edit_max').datetimepicker({
            format: 'd.m.y H:i',
            value: moment(options.min).format("D.MM.YY HH:mm"),
            onChangeDateTime: function (dp, $input) {
                options.max = dp.valueOf();
                $("#count_slider").dateRangeSlider('values',
                    options.min,
                    dp
                );
            }
        });


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
            $('#count_edit_min').datetimepicker({
                value: moment(data.values.min).format("DD.MM.YY HH:mm")
            });
            $('#count_edit_max').datetimepicker({
                value: moment(data.values.max).format("DD.MM.YY HH:mm")
            });


            options.max = data.values.max.valueOf();
            stats.requestData(options, generate);

            $('#count_pie').addClass('hidden');
            $('#table').empty();
        });


        nv.addGraph(function () {
            chart = nv.models.pieChart()
                .x(function (d) {
                    return d.label
                })
                .y(function (d) {
                    return d.value
                })
                .showLabels(true)
                .color(function(d){
                    return d.data.color;
                });


            return chart;
        });


        stats.requestData(options, generate);
    }

    function generate() {
        var data = stats.getBaseData();
        stats.setData(data);
        var total = data.count;
        var values = [];
        var pie_values = [];
        for (var key in data.cats) {
            var v = data.cats[key];
            values.push([stats.getCatInfo(key).name , (v * 100 / total).toFixed(2) + '%', v ]);
            pie_values.push({label:stats.getCatInfo(key).name ,value:v,color:stats.getCatInfo(key).color});
        }

        $('#count_pie').removeClass('hidden');
        d3.select("#count_pie svg")
            .datum(pie_values)
            .transition().duration(350)
            .call(chart);


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

