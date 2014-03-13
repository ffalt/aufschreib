function barView() {
    var
        options = {
            type: 'bar',
            mode: 'human',
            kind: 'word',
            cat: 'all',

            hidestops: true,
            hidetag: true,
            casesensitiv: false,
            limit: 30,
            id: 'bars_'
        };
    var
        stats,
        svg,
        chart,
        labels;

    function init(id, mode, kind, statshelper) {
        stats = statshelper;
        options.id = id;
        options.mode = mode;
        options.kind = kind;
        initSVG();
        linkUI();
        stats.selectActives(options, ['kind', 'mode']);
        stats.requestData(options, generate);
    }

    function request() {
        stats.requestData(options, generate);
    }

    function linkUI() {
        d3.selectAll('.navbar-form input').on('change', change);
        stats.linkUIDefault(options.id);
        stats.linkUIReloads(options, ['mode', 'kind'], generate);
        stats.linkUIToggles(options, ['hidetag', 'hidestops', 'casesensitiv'], generate);
    }

    function change() {
        if (!isNaN(this.value)) {
            options.limit = this.value;
            generate();
        }
        stats.d3_eventCancel();
    }

    function mergeCases(data) {
        var result = [];
        var entries = {};
        for (var i = 0; i < data.length; i++) {
            var name = '_' + data[i].id.toLowerCase();
            if (entries[name]) {
                entries[name].count += data[i].count;
                for (var key in data[i].counts) {
                    entries[name].counts[key] = (entries[name].counts[key] || 0) + data[i].counts[key];
                }
            } else {
                entries[name] = {id: data[i].id.toLowerCase(), count: data[i].count, stop: data[i].stop, counts: {}};
                for (var key in data[i].counts) {
                    entries[name].counts[key] = data[i].counts[key];
                }
            }
        }
        for (var key in entries)
            result.push(entries[key]);
        return result;
    }

    function initSVG() {
        svg = d3.select('#' + options.id + 'vis').append('svg');

        nv.addGraph(function () {
            chart = nv.models.multiBarChart()
                .transitionDuration(350)
                .stacked(true)
                .reduceXTicks(false)
                .rotateLabels(45)
                .showControls(true)
                .groupSpacing(0.4)
                .margin(
                {top: 30, right: 20, bottom: 140, left: 60}
                )
            ;
            chart.xAxis
                .tickFormat(
                function (d) {
                    return labels[d];
                }
            );

            chart.yAxis
                .tickFormat(d3.format(''));

            return chart;
        });
    }

    function generate() {
        var filterdata;
        if (!options.casesensitiv)
            filterdata = mergeCases(stats.getBaseData());
        else
            filterdata = stats.getBaseData();
        if (options.hidestops) {
            filterdata = filterdata.filter(function (obj) {
                return !obj.stop;
            });
        }
        if (options.hidetag) {
            filterdata = filterdata.filter(function (obj) {
                return (obj.id !== '#aufschrei') && (obj.id !== '#Aufschrei');
            });
        }
        filterdata.sort(function (a, b) {
            return b.count - a.count;
        });


        var tabledata = filterdata.slice(0, 500);

        var table = {
            head: [ options.kind, 'Anzahl'].concat(
                (options.cat === 'all') ?
                    stats.getCats().map(function (c) {
                        return '<i title="' + c.name + '" class="glyphicon ' + c.icon + '"></i>';// + c.name;// JSON.stringify(c);
                    })
                    : []
            ),
            values: tabledata.map(function (entry) {
                var o = [entry.id, entry.count ];
                if (options.cat === 'all')
                    stats.getCats().forEach(function (c) {
                        o.push(entry.counts[c.id] || 0);
                    });
                return o;
            })
//            foot: ['', data.length]
        };
        stats.buildTable('#table', table);


        if (options.limit > 0)
            filterdata = filterdata.splice(0, options.limit);

        var series = {};

        stats.getCats().map(function (c) {
            series[c.id] = {
                c: c,
                values: []
            };
        });


        labels = [];

        filterdata.forEach(function (e, i) {
            labels.push(e.id);
            stats.getCats().map(function (c) {
                series[c.id].values.push({x: i, y: e.counts[c.id] || 0 });
            });
        });

        var data = [];
        for (var key in series) {
            data.push({
                key: series[key].c.name,
                color: series[key].c.color,
                values: series[key].values
            });
        }

        svg.datum(data)
            .call(chart);
        nv.utils.windowResize(chart.update);

        stats.setData(data);
    }

    return {
        init: init,
        request: request
    };
}

