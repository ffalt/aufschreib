function timeView() {
    var
        options = {
            type: 'time',
            mode: 'human',
            cat: 'all',
            kind: null,
            id: 'times_',
            view: 'zero'
        };
    var
        stats, chart, svg;

    function init(id, mode, kind, statshelper) {
        stats = statshelper;
        options.id = id;
        options.mode = mode;
        options.kind = (kind === '' ? null : kind);
        initSVG();
        linkUI();
        stats.selectActives(options, ['mode', 'view']);
        stats.requestData(options, generate);
    }

    function request() {
        stats.requestData(options, generate);
    }

    function initSVG() {
        svg = d3.select('#' + options.id + 'vis').append('svg');

        nv.addGraph(function () {
            chart = nv.models.stackedAreaChart()
                .x(function (d) {
                    return d[0]
                })
                .y(function (d) {
                    return d[1]
                })
                .color(function (d) {
                    return d.color
                })
                .clipEdge(true)
                .useInteractiveGuideline(true)
            ;

            chart.controlLabels({
                stacked: 'Fläche',
                stream: 'Mittig',
                expanded: 'Expandieren',
                stack_percent: 'Fläche %'
            });

            chart.xAxis
//                .showMaxMin(false)
                .tickFormat(function (d, p) {
                    if (p == undefined)
                        return d3.time.format('%d.%m.%y %H:%M')(new Date(parseInt(d)));
                    else
                        return d3.time.format('%d.%m.%y')(new Date(parseInt(d)));

                });

            chart.yAxis
                .tickFormat(d3.format(''));

            return chart;
        });
    }

    function linkUI() {
        stats.linkUIDefault(options.id);
        stats.linkUIReloads(options, ['mode'], generate);
        stats.linkUIRegens(options, ['view'], generate);
    }

    function generate() {
        var data = stats.getBaseData();
        stats.setData(data);
        svg
            .datum(data)
            .transition().duration(500).call(chart);
        nv.utils.windowResize(chart.update);
    }

    return {
        init: init,
        request: request
    };
}