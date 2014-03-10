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

//        nv.addGraph(function () {
//            chart = nv.models.pieChart()
//                .x(function (d) {
//                    return d.label
//                })
//                .y(function (d) {
//                    return d.value
//                })
//                .showLabels(true)
//                .color(function(d){
//                    return d.data.color;
//                });
//
//
//            return chart;
//        });
//

        stats.requestData(options, generate);
    }

    function request() {
        stats.requestData(options, generate);
    }

    function generate() {
        var data = stats.getBaseData();
        stats.setData(data);
        var total = data.count;
        var values = [];
//        var pie_values = [];
        for (var key in data.cats) {
            var v = data.cats[key];
            values.push([stats.getCatInfo(key).name , (v * 100 / total).toFixed(2) + '%', v ]);
//            pie_values.push({label:stats.getCatInfo(key).name ,value:v,color:stats.getCatInfo(key).color});
        }

//        $('#count_pie').removeClass('hidden');
//        d3.select("#count_pie svg")
//            .datum(pie_values)
//            .transition().duration(350)
//            .call(chart);

        var table = {
            head: ['Bewertung', 'Prozent', 'Anzahl'],
            values: values,
            foot: ['', '100%', total]
        };
        stats.buildTable('#table', table);
    }

    return {
        init: init,
        request:request
    };
}

