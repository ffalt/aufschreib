function hashtagsView() {
    var
        options = {
            type: 'hashtags',
            mode: 'human',
            cat: 'all',
            kind: 'tags',
            id: 'hashtags_'
        };
    var chart = null;
    var svg = null;

    function init(id, mode, kind, statshelper) {
        stats = statshelper;
        options.id = id;
        options.mode = mode;
        initSVG();
        linkUI();
        request();
    }

    function request() {
        stats.requestData(options, generate);
    }

    function generate() {
        var data = stats.getBaseData();
        if (data.length > 0)
            data[0].disabled = false;
        stats.setData(data);
        svg
            .datum(data)
            .call(chart);
        nv.utils.windowResize(function () {
            chart.update()
        });
    }

    function initSVG() {
        svg = d3.select('#' + options.id + 'vis').append('svg');
        var
            formatDate = d3.time.format("%d"),
            formatHour = d3.time.format("%H"),
            formatDay = d3.time.format("%d.%m %Hh"),
            formatTime = function (d) {
                d = new Date(d);
//                if (d.getHours() === 0)
                return formatDay(d);
//                else
//                    return formatHour(d);
            };

        chart = nv.models.lineWithFocusChart();
        chart.xAxis
            .ticks(d3.time.hours)
            .tickFormat(formatTime);

        chart.x2Axis
            .ticks(d3.time.days)
            .tickFormat(formatTime);
    }

    function linkUI() {
        stats.linkUIDefault(options.id);
        stats.linkUIReloads(options, ['mode'], request);
        stats.linkUIRegens(options, ['cat'], request);
        stats.selectActives(options, ['mode', 'cat']);
    }

    return {
        init: init,
        request: request
    };
}