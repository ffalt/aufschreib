function Times() {
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
		margin = {top: 20, right: 30, bottom: 30, left: 80},
		focus_height = 80,
		charts_padding = 50,
		legendwidth = 100,
		width = 960 - margin.left - margin.right,
		height = 500,
		chart_height = height - charts_padding - margin.top - margin.bottom - focus_height
		;
	var
		default_in_view = 3600000 * 24; // 1 day
	var
		stats;
	var
		svg, area, area2, chart, focus_chart, chartgroup, focus_chartgroup, xAxis, xAxis2, yAxis, brush, x, x2, y, y2;

	function initTimes(id, mode, kind, statshelper) {
		stats = statshelper;
		options.id = id;
		options.mode = mode;
		options.kind = (kind === '' ? null : kind);
		initSVG();
		linkUI();
		stats.selectActives(options, ['mode', 'view']);
		stats.requestData(options, generate);
	}

	function initSVG() {
		svg = stats.initSVG(options.id, width + margin.left + margin.right, height);
		x = d3.time.scale()
			.range([0, width]);
		x2 = d3.time.scale()
			.range([0, width]);
		y = d3.scale.linear()
			.range([chart_height, 0]);
		y2 = d3.scale.linear()
			.range([focus_height, 0]);
		area = d3.svg.area()
//			.interpolate("cardinal")
			.interpolate("monotone")
			.x(function (d) {
				return x(d.x);
			})
			.y0(function (d) {
				return y(d.y0);
			})
			.y1(function (d) {
				return y(d.y0 + d.y);
			});
		area2 = d3.svg.area()
			.interpolate("cardinal")
			.x(function (d) {
				return x2(d.x);
			})
			.y0(function (d) {
				return y2(d.y0);
			})
			.y1(function (d) {
				return y2(d.y0 + d.y);
			});
		chartgroup = svg
			.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
		focus_chartgroup = svg
			.append("g")
			.attr("transform", "translate(" + margin.left + "," + (margin.top + chart_height + charts_padding) + ")");
		chart = chartgroup.append("g");
		focus_chart = focus_chartgroup.append("g");
		brush = d3.svg.brush()
			.x(x2)
			.on("brush", onBrush);
		svg.append("defs").append("clipPath")
			.attr("id", "clip")
			.append("rect")
			.attr("width", width)
			.attr("height", height);

		var
			formatDate = d3.time.format("%d"),
			formatHour = d3.time.format("%H"),
			formatDay = d3.time.format("%a %d"),
			formatTime = function (d) {
				if (d.getHours() === 0)
					return formatDay(d);
				else
					return formatHour(d);
			};

		xAxis = d3.svg.axis()
			.scale(x)
			.orient("bottom")
			.ticks(d3.time.hours)
			.tickFormat(formatTime);
		xAxis2 = d3.svg.axis()
			.scale(x2)
			.orient("bottom")
			.ticks(d3.time.days)
			.tickFormat(formatDate);
		yAxis = d3.svg.axis()
			.scale(y)
			.orient("left");

		chartgroup.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + chart_height + ")")
			.call(xAxis);
		focus_chartgroup.append("g")
			.attr("class", "x axis focus")
			.attr("transform", "translate(0," + focus_height + ")")
			.call(xAxis2);

		chartgroup.append("g")
			.attr("class", "y axis")
			.call(yAxis);

		focus_chartgroup.append("g")
			.attr("class", "x brush")
			.call(brush)
			.selectAll("rect")
			.attr("height", focus_height);

	}

	function linkUI() {
		stats.linkUIDefault(options.id);
		stats.linkUIReloads(options, ['mode'], generate);
		stats.linkUIRegens(options, ['view'], generate);
	}

	function generate() {
		var data = stats.getBaseData();
		stats.setData(data);
		var catsInView = [];
		var usedCat = [];
		var collect = {};
		var mi = data[0].time;
		var ma = data[0].time;
		data.forEach(function (entry) {
			for (var key in entry.counts) {
				if (usedCat.indexOf(key) < 0) {
					usedCat.push(key);
					catsInView.push(stats.getCatInfo(key));
				}
			}
			entry.time = parseInt(entry.time);
			collect[entry.time] = entry;
			mi = Math.min(mi, entry.time);
			ma = Math.max(ma, entry.time);
		});
		for (var i = mi; i < ma; i += 3600000) {
			if (!collect[i]) {
				data.push({time: i, count: 0, counts: {}});
			}
		}
		data.sort(function (a, b) {
			if (a.time < b.time)
				return -1;
			else if (a.time > b.time)
				return 1;
			return 0;
		});

		var stack = d3.layout.stack().offset(options.view);

		var gdata =
			d3.range(catsInView.length).map(
				function (layernr) {
					var cat = catsInView[layernr].id;
					return data.map(function (d) {
						return {x: d.time, y0: 0, y: (d.counts[cat] || 0)};
					});
				}
			);
		var layers = stack(gdata);

		var xGroupMax = d3.max(layers, function (layer) {
			return d3.max(layer, function (d) {
				return d.x;
			});
		});
		var xGroupMin = d3.min(layers, function (layer) {
			return d3.min(layer, function (d) {
				return d.x;
			});
		});
		var yDomain = d3.max(layers, function (d) {
			return d3.max(d, function (d1) {
				return d1.y0 + d1.y;
			})
		});
		var xDefaultGroupMax = Math.min(xGroupMin + default_in_view, xGroupMax);
		x.domain([xGroupMin, xDefaultGroupMax]);
		x2.domain([xGroupMin, xGroupMax]);
		y.domain([0, yDomain]);
		y2.domain([0, yDomain]);
		chartgroup.select(".x.axis").call(xAxis);
		chartgroup.select(".y.axis").call(yAxis);
		focus_chartgroup.select(".x.axis").call(xAxis2);

		chart.selectAll(".layer")
			.data(layers)
			.enter().append("path")
			.attr("class", "layer");

		chart.selectAll(".layer")
			.data(layers)
			.transition()
			.duration(500).attr("d", function (d) {
				return area(d);
			})
			.style("fill", function (d, i) {
				return catsInView[i].color;
			})
			.attr('title', function (d, i) {
				return catsInView[i].name;
			});

		focus_chart.selectAll(".focuslayer")
			.data(layers)
			.enter().append("path")
			.attr("class", "focuslayer")
			.attr("clip-path", "url(#clip)");

		focus_chart.selectAll(".focuslayer")
			.transition()
			.duration(500).attr("d", function (d) {
				return area2(d);
			})
			.style("fill", function (d, i) {
				return catsInView[i].color;
			})
			.attr('title', function (d, i) {
				return catsInView[i].name;
			});

		chartgroup.select(".y.axis")
			.style('display', ( (options.view === "zero") ? null : 'none'));

		svg.select(".brush").call(brush.extent([xGroupMin, xDefaultGroupMax]));

		stats.legendary(chartgroup, catsInView, width -legendwidth, 10, legendwidth);

		//onBrush();
	}

	function onBrush() {
		x.domain(brush.empty() ? x2.domain() : brush.extent());
		chart.selectAll("path").attr("d", area);
		chartgroup.select(".x.axis").call(xAxis);
	}

	return {
		initTimes: initTimes
	};
}