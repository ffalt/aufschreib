function Stats(cats, hashBangNotifyDisabeld) {
    var
        basedata = [], // the data from the server
        data = [], // possibly filtered data by the chart
        svg; //the svg, duh!

    function legendary(graph, catsInView, left, width) {
        var legend = graph.selectAll('.legend');
        var top = 16;
        if (legend.empty()) {
            graph
                .append('g')
                .attr('class', 'legend')
                .append('svg:rect')
                .attr('class', 'legend-background')
                .attr('y', 4)
                .attr('opacity', 0.8)
                .attr('fill', 'white');
            legend = graph.selectAll('.legend');
        }
        legend.select('.legend-background')
            .attr('x', left - 10)
            .attr('width', width)
            .attr('height', (catsInView.length * 25) + 10);
        var legendentries = legend.selectAll('.legend-entry')
            .data(catsInView)
            .enter()
            .append('g')
            .attr('class', 'legend-entry');
        legendentries.append('svg:rect')
            .attr('x', left)
            .attr('y', function (d, i) {
                return top + (25 * i);
            })
            .attr('width', 10)
            .attr('height', 10)
            .attr('class', 'legend-color');
        legendentries.append('svg:text')
            .attr('x', left + 15)
            .attr('y', function (d, i) {
                return top + (25 * i) + 10
            });
        legend.selectAll('text')
            .data(catsInView)
            .text(function (d) {
                return d.name;
            });
        legend.selectAll('.legend-color')
            .data(catsInView)
            .attr('fill', function (d) {
                return d.color;
            });
        legend
            .selectAll('.legend-entry')
            .data(catsInView)
            .exit()
            .remove();

    }

    function requestData(options, callback) {
        var params = {
            cmd: 'json',
            type: options.type,
        };
        if (options.mode)
            params.mode = options.mode;
        if (aufschreib.range.min)
            params.min = aufschreib.range.min.valueOf();
        if (aufschreib.range.max)
            params.max = aufschreib.range.max.valueOf();
        if (options.kind)
            params.kind = options.kind;
        if (options.cat)
            params.cat = options.cat;
        aufschreib.getJson('#' + options.id + 'vis', params, function (rawdata) {
            if (!hashBangNotifyDisabeld)
                aufschreib.setStatsSilent(options.type, options.mode, options.kind, (options.cat === 'all' ? null : options.cat));
            basedata = rawdata;
            callback();
        })
    }

    function linkUIDefault(id) {
        d3.select('#' + id + 'download-svg').on('click', downloadSVG);
        d3.select('#' + id + 'download-json').on('click', downloadJSON);
        d3.select('#' + id + 'current-json a').on('click', function () {
            toggleJsonView(id);
        });
    }

    function selectActives(options, optionnames) {
        optionnames.forEach(function (s) {
            selectActive(options, s);
        });
    }

    function linkUIReloads(options, optionnames, callback) {
        optionnames.forEach(function (s) {
            linkUIReload(options, s, callback);
        });
    }

    function linkUIRegens(options, optionnames, callback) {
        optionnames.forEach(function (s) {
            linkUIRegen(options, s, callback);
        });
    }

    function linkUIToggles(options, optionnames, callback) {
        optionnames.forEach(function (s) {
            linkUIToggle(options, s, callback);
        });
    }

    function initSVG(id, width, height) {
        svg = d3.select('#' + id + 'vis').append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', '0 0 ' + width + ' ' + height)
            .attr('perserveAspectRatio', 'xMinYMid')
            .style("background-color", "white");
        var
            aspect = width / height,
            container = $('#' + id + 'vis').parent();
        $(window).on("resize", function () {
            var targetWidth = Math.min(width, container.width());
            svg.attr("width", targetWidth);
            svg.attr("height", Math.round(targetWidth / aspect));
        }).trigger("resize");
        return svg;
    }

    function openSVG(svg) {
        d3.select(this).attr('href', 'data:image/svg+xml;charset=utf-8;base64,' + btoa(unescape(encodeURIComponent(
            svg.attr('version', '1.1')
                .attr('xmlns', 'http://www.w3.org/2000/svg')
                .attr('xmlns:xmlns:xlink', 'http://www.w3.org/1999/xlink')   //double declaration is not a type
                .node().parentNode.innerHTML))));
    }

    function downloadSVG() {
        if (svg) {
            openSVG(svg);
        }
    }

    function downloadJSON() {
        d3.select(this).attr('href', 'data:application/json;charset=utf-8;base64,' + btoa(unescape(encodeURIComponent(
            JSON.stringify(data)
        ))));
    }

    function selectActive(options, optionname) {
        d3.selectAll('#' + options.id + optionname + ' li').attr('class', function () {
                var li = d3.select(this);
                var a = li.select('a');
                if ((!a.empty()) && (a.attr('value') === options[optionname]))
                    return 'active';
                return '';
            }
        );
    }

    function d3_eventCancel() {
        d3.event.stopPropagation();
        d3.event.preventDefault();
    }

    function toggleJsonView(id) {
        var link = d3.select('#' + id + 'current-json');
        var div = d3.select('#' + id + 'json');
        if (link.attr('class') !== 'active') {
            link.attr('class', 'active');
            div.text(JSON.stringify(data, null, '\t'));
            div.style('display', null);
        } else {
            link.attr('class', null);
            div.text('');
            div.style('display', 'none');
        }
        d3_eventCancel();
    }

    function linkUIReload(options, optionname, callback) {
        d3.selectAll('#' + options.id + optionname + ' a').on('click', function () {
            options[optionname] = d3.select(this).attr('value');
            requestData(options, callback);
            selectActive(options, optionname);
            d3_eventCancel();
        });
    }

    function linkUIRegen(options, optionname, callback) {
        d3.selectAll('#' + options.id + optionname + ' a').on('click', function () {
            options[optionname] = d3.select(this).attr('value');
            if (!hashBangNotifyDisabeld)
                aufschreib.setStatsSilent(options.type, options.mode, options.kind, (options.cat === 'all' ? null : options.cat));
            callback();
            selectActive(options, optionname);
            d3_eventCancel();
        });
    }

    function linkUIToggle(options, optionname, callback) {

        function toggleOption() {
            options[optionname] = (!options[optionname]);
            this.value = options[optionname];
            d3.selectAll('#' + options.id + optionname).attr('class', (options[optionname] ? 'active' : null));
            callback();
            d3_eventCancel();
        }

        d3.select('#' + options.id + optionname + ' a').on('click', toggleOption);
    }

    function getBaseData() {
        return basedata;
    }

    function getData() {
        return data;
    }

    function setData(newdata) {
        data = newdata;
    }

    function buildTable(container, table) {
        var tables = '<table class="table table-condensed"><thead><tr>';
        table.head.forEach(function (h) {
            tables += '<th>' + h + '</th>';
        });
        tables += '</tr></thead>';

        table.values.forEach(function (vals) {
            tables += '<tr>';
            vals.forEach(function (v) {
                tables += '<td>' + v + '</td>';
            });
            tables += '</tr>';
        });

        if (table.foot) {
            tables += '<tfoot>';
            table.foot.forEach(function (h) {
                tables += '<th>' + h + '</th>';
            });
            tables += '</tr></tfoot>'
        }
        tables += '</table>';
        $('#table').html(tables);

    }


    function getCatInfo(catid) {
        for (var i = 0; i < cats.length; i++)
            if (cats[i].id === catid)
                return cats[i];
        return null;
    }

    function getCats() {
        return cats;
    }

    return {
        getCats: getCats,
        getCatInfo: getCatInfo,
        getBaseData: getBaseData,
        getData: getData,
        setData: setData,
        initSVG: initSVG,
        legendary: legendary,
        requestData: requestData,
        downloadSVG: downloadSVG,
        downloadJSON: downloadJSON,
        selectActive: selectActive,
        d3_eventCancel: d3_eventCancel,
        linkUIReloads: linkUIReloads,
        linkUIRegens: linkUIRegens,
        selectActives: selectActives,
        linkUIDefault: linkUIDefault,
        linkUIReload: linkUIReload,
        linkUIRegen: linkUIRegen,
        linkUIToggles: linkUIToggles,
        buildTable: buildTable,
        openSVG: openSVG
    };
}

