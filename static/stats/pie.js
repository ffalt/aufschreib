//based on http://bl.ocks.org/marcbc/3281521

function Pies() {
	var
		options = {
			type: 'pie',
			mode: 'human',
			kind: null,
			cat: null,
			id: 'pie_'
		};
	var
		stats;
	var
		svg, pie, arc, defs, pieChart, arcGroup;
	var
		width = 500,
		height = 500,
		margin = 50,
		legendwidth = 120,
		radius = Math.min(width - margin, height - margin) / 2;

	function initPie(id, mode, kind, forceregenerate, statshelper) {
		stats = statshelper;
		options.id = id;
		options.mode = mode;
		options.kind = kind;
		options.forceregenerate = forceregenerate;
		initSVG();
		linkUI();
		stats.selectActives(options, ['mode']);
		stats.requestData(options, generate);
	}

	function linkUI() {
		stats.linkUIDefault(options.id);
		stats.linkUIReloads(options, ['mode'], generate);
	}

	function initSVG() {
		svg = stats.initSVG(options.id, width + legendwidth, height);
		defs = svg.append("svg:defs");
		var mainGrad = defs.append("svg:radialGradient")
			.attr("gradientUnits", "userSpaceOnUse")
			.attr("cx", 0).attr("cy", 0).attr("r", radius).attr("fx", 0).attr("fy", 0)
			.attr("id", "master");
		arcGroup = svg.append("svg:g")
			.attr("class", "arcGroup")
			.attr("filter", "url(#shadow)")
			.attr("transform", "translate(" + (width / 2) + "," + (height / 2) + ")");
		// Declare shadow filter
		var shadow = defs.append("filter").attr("id", "shadow")
			.attr("filterUnits", "userSpaceOnUse")
			.attr("x", -1 * (width / 2)).attr("y", -1 * (height / 2))
			.attr("width", width).attr("height", height);
		shadow.append("feGaussianBlur")
			.attr("in", "SourceAlpha")
			.attr("stdDeviation", "4")
			.attr("result", "blur");
		shadow.append("feOffset")
			.attr("in", "blur")
			.attr("dx", "4").attr("dy", "4")
			.attr("result", "offsetBlur");
		shadow.append("feBlend")
			.attr("in", "SourceGraphic")
			.attr("in2", "offsetBlur")
			.attr("mode", "normal");
		pieChart = d3.layout.pie().sort(null).value(function (d) {
			return d.value;
		});
		arc = d3.svg.arc().outerRadius(radius);
	}

	function generate() {
		var data = stats.getBaseData();
		stats.setData(data);
		// Create a gradient for each entry (each entry identified by its unique category)
		var gradients = defs.selectAll(".gradient")
			.data(data,function (d) {
				return d.id;
			}).enter().append("svg:radialGradient")
			.attr("class", "gradient")
			.attr("xlink:href", "#master");

		gradients
			.attr("id", function (d) {
				return "gradient" + d.id;
			})

		gradients.append("svg:stop").attr("offset", "0%").attr("stop-color", getColor);
		gradients.append("svg:stop").attr("offset", "90%").attr("stop-color", getColor);
		gradients.append("svg:stop").attr("offset", "100%").attr("stop-color", getDarkerColor);

		var paths = arcGroup.selectAll("path")
			.data(pieChart(data), function (d) {
				return d.data.id;
			});
		paths.enter().append("svg:path").attr("class", "sector");

		var total = 0;
		data.forEach(function (d) {
			total += d.value;
		})
		// Each sector will refer to its gradient fill
		paths
			.attr("fill", function (d, i) {
				return "url(#gradient" + d.data.id + ")";
			})
			.attr("title", function (d, i) {
				return 'Klasse:' + "\t" + stats.getCatInfo(data[i].id).name + "\n" +
					'Prozent:' + "\t" + (d.value * 100 / total).toFixed(2) + '%' + "\n" +
					'Anzahl:' + "\t" + d.value;
			})
			.transition().duration(1000).attrTween("d", tweenIn).each("end", function () {
				this._listenToEvents = true;
			});

		// Mouse interaction handling
		paths
			.on("click", function (d) {
				/*	if (this._listenToEvents) {

				 // Reset inmediatelly
				 d3.select(this).attr("transform", "translate(0,0)")
				 // Change level on click if no transition has started
				 paths.each(function () {
				 this._listenToEvents = false;
				 });
				 }
				 */
			})
			.on("mouseover", function (d) {
				// Mouseover effect if no transition has started
				if (this._listenToEvents) {
					// Calculate angle bisector
					var ang = d.startAngle + (d.endAngle - d.startAngle) / 2;
					// Transformate to SVG space
					ang = (ang - (Math.PI / 2) ) * -1;

					// Calculate a 10% radius displacement
					var x = Math.cos(ang) * radius * 0.1;
					var y = Math.sin(ang) * radius * -0.1;

					d3.select(this).transition()
						.duration(250).attr("transform", "translate(" + x + "," + y + ")");
				}
			})
			.on("mouseout", function (d) {
				// Mouseout effect if no transition has started
				if (this._listenToEvents) {
					d3.select(this).transition()
						.duration(150).attr("transform", "translate(0,0)");
				}
			});

		// Collapse sectors for the exit selection
		paths.exit().transition()
			.duration(1000)
			.attrTween("d", tweenOut).remove();

		stats.legendary(svg, stats.getCats(), width, 30, legendwidth);
	}

	function getColor(d, index) {
		return stats.getCatInfo(stats.getData()[index].id).color;
	}

	// Helper function to extract a darker version of the color
	function getDarkerColor(d, index) {
		return d3.rgb(getColor(d, index)).darker();
	}

	// "Fold" pie sectors by tweening its current start/end angles
	// into 2*PI
	function tweenOut(data) {
		data.startAngle = data.endAngle = (2 * Math.PI);
		var interpolation = d3.interpolate(this._current, data);
		this._current = interpolation(0);
		return function (t) {
			return arc(interpolation(t));
		};
	}

	// "Unfold" pie sectors by tweening its start/end angles
	// from 0 into their final calculated values
	function tweenIn(data) {
		var interpolation = d3.interpolate({startAngle: 0, endAngle: 0}, data);
		this._current = interpolation(0);
		return function (t) {
			return arc(interpolation(t));
		};
	}

	return {
		initPie: initPie
	};
}

