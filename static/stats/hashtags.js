function hashtagsView() {
    var
        options = {
            type: 'hashtags',
            mode: 'human',
            cat: 'all',
            kind: null,
            id: 'hashtags_'
        };
    var chart = null;
    var svg = null;
//    var
//        margin = {top: 20, right: 30, bottom: 30, left: 80},
//        focus_height = 80,
//        charts_padding = 50,
//        legendwidth = 120,
//        width = 1300 - margin.left - margin.right,
//        height = 500,
//        chart_height = height - charts_padding - margin.top - margin.bottom - focus_height
//        ;
//    var
//        default_in_view = 3600000 * 24; // 1 day
//    var
//        stats;
//    var
//        svg, area, area2, chart, focus_chart, chartgroup, focus_chartgroup, xAxis, xAxis2, yAxis, brush, x, x2, y, y2;

    function init(id, mode, kind, statshelper, forceregenerate) {
        stats = statshelper;
        options.id = id;
        options.mode = mode;
        options.kind = null;
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
//        chart = nv.models.lineChart()
//            .margin({left: 100}) //Adjust chart margins to give the x-axis some breathing room.
//            .transitionDuration(350) //how fast do you want the lines to transition?
//            .showLegend(true) //Show the legend, allowing users to turn on/off line series.
//            .showYAxis(true) //Show the y-axis
//            .showXAxis(true) //Show the x-axis
//        ;
//    .transition().duration(500)

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

//
//    function generate() {
//        var data = stats.getBaseData();
//        stats.setData(data);
//        var catsInView = [];
//        var usedCat = [];
//        var collect = {};
//        var mi = data[0].time;
//        var ma = data[0].time;
//        data.forEach(function (entry) {
//            for (var key in entry.counts) {
//                if (usedCat.indexOf(key) < 0) {
//                    usedCat.push(key);
//                    catsInView.push(stats.getCatInfo(key));
//                }
//            }
//            entry.time = parseInt(entry.time);
//            collect[entry.time] = entry;
//            mi = Math.min(mi, entry.time);
//            ma = Math.max(ma, entry.time);
//        });
//        for (var i = mi; i < ma; i += 3600000) {
//            if (!collect[i]) {
//                data.push({time: i, count: 0, counts: {}});
//            }
//        }
//        data.sort(function (a, b) {
//            if (a.time < b.time)
//                return -1;
//            else if (a.time > b.time)
//                return 1;
//            return 0;
//        });
//
//        var stack = d3.layout.stack().offset(options.view);
//
//        var gdata =
//            d3.range(catsInView.length).map(
//                function (layernr) {
//                    var cat = catsInView[layernr].id;
//                    return data.map(function (d) {
//                        return {x: d.time, y0: 0, y: (d.counts[cat] || 0)};
//                    });
//                }
//            );
//        var layers = stack(gdata);
//
//        var xGroupMax = d3.max(layers, function (layer) {
//            return d3.max(layer, function (d) {
//                return d.x;
//            });
//        });
//        var xGroupMin = d3.min(layers, function (layer) {
//            return d3.min(layer, function (d) {
//                return d.x;
//            });
//        });
//        var yDomain = d3.max(layers, function (d) {
//            return d3.max(d, function (d1) {
//                return d1.y0 + d1.y;
//            })
//        });
//        var xDefaultGroupMax = Math.min(xGroupMin + default_in_view, xGroupMax);
//        x.domain([xGroupMin, xDefaultGroupMax]);
//        x2.domain([xGroupMin, xGroupMax]);
//        y.domain([0, yDomain]);
//        y2.domain([0, yDomain]);
//        chartgroup.select(".x.axis").call(xAxis);
//        chartgroup.select(".y.axis").call(yAxis);
//        focus_chartgroup.select(".x.axis").call(xAxis2);
//
//        chart.selectAll(".layer")
//            .data(layers)
//            .enter().append("path")
//            .attr("class", "layer");
//
//        chart.selectAll(".layer")
//            .data(layers)
//            .transition()
//            .duration(500).attr("d", function (d) {
//                return area(d);
//            })
//            .style("fill", function (d, i) {
//                return catsInView[i].color;
//            })
//            .attr('title', function (d, i) {
//                return catsInView[i].name;
//            });
//
//        focus_chart.selectAll(".focuslayer")
//            .data(layers)
//            .enter().append("path")
//            .attr("class", "focuslayer")
//            .attr("clip-path", "url(#clip)");
//
//        focus_chart.selectAll(".focuslayer")
//            .transition()
//            .duration(500).attr("d", function (d) {
//                return area2(d);
//            })
//            .style("fill", function (d, i) {
//                return catsInView[i].color;
//            })
//            .attr('title', function (d, i) {
//                return catsInView[i].name;
//            });
//
//        chartgroup.select(".y.axis")
//            .style('display', ( (options.view === "zero") ? null : 'none'));
//
//        svg.select(".brush").call(brush.extent([xGroupMin, xDefaultGroupMax]));
//
//        stats.legendary(svg, catsInView, width - legendwidth, legendwidth);
//
//        //onBrush();
//    }
//
//    function onBrush() {
//        x.domain(brush.empty() ? x2.domain() : brush.extent());
//        chart.selectAll("path").attr("d", area);
//        chartgroup.select(".x.axis").call(xAxis);
//    }

    return {
        init: init,
        request:request
    };
}