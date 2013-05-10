function Clouds() {

	//Based on http://www.jasondavies.com/wordcloud/

	var
		options = {
			type: 'cloud',
			mode: 'human',
			kind: 'word',
			cat: 'all',

			hidestops: false,
			spiral: 'archimedean',
			scale: 'log',
			casesensitiv: false,
			fontname: 'Impact',
			limit: 30,
			angle_from: -60,
			angle_to: 60,
			angle_count: 5,
			id: 'cloud_'
		};
	var
		sizes = {
			width: 960,
			height: 600
		};
	var
		angle = {
			r: 20.5,
			radians: Math.PI / 180,
			px: 0,
			py: 0
		};
	var
		words = [],
		stats;
	var
		svg,
		cloudgraph = {
			fill: null,
			layout: null,
			fontSize: null,
			background: null,
			vis: null,
			zoomscale: 1
		};
	var
		progress = {
			complete: 0,
			max: 0,
			statusText: null
		};
	var
		angles;

	function initCloud(id, mode, kind, statshelper) {
		stats = statshelper;
		options.id = id;
		options.mode = mode;
		options.kind = kind;
		initSVG();
		initAngleUI();
		linkUI();
		stats.selectActives(options, ['cat', 'kind', 'mode', 'scale', 'spiral']);
		stats.requestData(options, generate);
	}

	function generate() {
		var data = stats.getBaseData();
		var tags = {};
		data.forEach(function (entry) {
				if ((!options.hidestops) || (!entry.stop)) {
					var count = entry.count;
					if (options.cat !== 'all') {
						count = entry.counts[options.cat];
					}
					if (count) {
						var word = entry.id;
						if (!options.casesensitiv) {
							word = word.toLowerCase();
						}
						tags[word] = (tags[word] || 0) + count;
					}
				}
			}
		);
		stats.setData(tags);
		tags = d3.entries(tags).sort(function (a, b) {
			return b.value - a.value;
		});
		cloudgraph.layout
			.font(options.fontname)
			.spiral(options.spiral);
		cloudgraph.fontSize = d3.scale[options.scale]().range([10, 100]);
		if (tags.length)
			cloudgraph.fontSize.domain([+tags[tags.length - 1].value || 1, +tags[0].value]);
		progress.statusText.style('display', null);
		var howmuch = Math.min(tags.length, options.limit);
		words = [];
		progress.complete = 0;
		progress.max = howmuch;
		cloudgraph.layout.stop().words(tags.slice(0, howmuch)).start();
	}

	function prepareUrl(url) {
		return url.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i)[1];
	}

	function initSVG() {
		svg = stats.initSVG(options.id, sizes.width, sizes.height);

		cloudgraph.fill = d3.scale.category20b();
		cloudgraph.layout = d3.layout.cloud()
			.timeInterval(10)
			.size([sizes.width, sizes.height])
			.text(function (d) {
				if (options.kind === 'link')
					return prepareUrl(d.key);
				else
					return d.key;

			})
			.fontSize(function (d) {
//				if (options.kind === 'link')
//					return cloudgraph.fontSize(+d.value / 10);
//				else
				return cloudgraph.fontSize(+d.value);
			})
			.on('word', notifyprogress)
			.on('end', draw);

		cloudgraph.background = svg.append('g');
		cloudgraph.vis = svg.append('g')
			.attr('transform', 'translate(' + [sizes.width >> 1, sizes.height >> 1] + ')');

	}

	function change() {
		if (this.id === 'cloud_font') {
			options.fontname = this.value;
			generate();
		} else if (!isNaN(this.value)) {
			switch (this.id) {
				case 'cloud_angle-count':
					options.angle_count = Math.max(0, this.value);
					break;
				case 'cloud_angle-from':
					options.angle_from = Math.max(-90, Math.min(90, this.value));
					break;
				case 'cloud_angle-to':
					options.angle_to = Math.max(-90, Math.min(90, this.value));
					break;
				case 'cloud_count':
					options.limit = Math.max(0, this.value);
					break;
				default:
					break;
			}
			updateAngleUI();
			generate();
		}
		stats.d3_eventCancel();
	}

	function toggleStop() {
		options.hidestops = (!options.hidestops);
		this.value = options.hidestops;
		d3.selectAll('#' + options.id + 'stop li').attr('class', (options.hidestops ? 'active' : null));
		generate();
		stats.d3_eventCancel();
	}

	function toggleCase() {
		options.casesensitiv = (!options.casesensitiv);
		this.value = options.casesensitiv;
		d3.selectAll('#' + options.id + 'case li').attr('class', (options.casesensitiv ? 'active' : null));
		generate();
		stats.d3_eventCancel();
	}

	function linkUI() {
		progress.statusText = d3.select('#' + options.id + 'status');
		d3.selectAll('.navbar-form input').on('change', change);
		d3.select('#' + options.id + 'case a').on('click', toggleCase);
		d3.select('#' + options.id + 'stop a').on('click', toggleStop);
		stats.linkUIDefault(options.id);
		//d3.select('#' + options.id + 'download-png').on('click', downloadPNG);
		stats.linkUIReloads(options, ['mode', 'kind'], generate);
		stats.linkUIRegens(options, ['spiral', 'cat', 'scale'], generate);
	}

	function notifyprogress(d) {
		progress.statusText.text(++(progress.complete) + '/' + progress.max);
	}

	function draw(data, bounds) {
		words = data;
		progress.statusText.style('display', 'none');
		cloudgraph.zoomscale = bounds ? Math.min(
			sizes.width / Math.abs(bounds[1].x - sizes.width / 2),
			sizes.width / Math.abs(bounds[0].x - sizes.width / 2),
			sizes.height / Math.abs(bounds[1].y - sizes.height / 2),
			sizes.height / Math.abs(bounds[0].y - sizes.height / 2)) / 2 : 1;
		if (isNaN(cloudgraph.zoomscale))
			cloudgraph.zoomscale = 1;
		var text = cloudgraph.vis.selectAll('text')
			.data(words);
		text.transition()
			.duration(1000)
			.attr('transform', function (d) {
				return 'translate(' + [d.x, d.y] + ')rotate(' + d.rotate + ')';
			})
			.style('font-size', function (d) {
				return d.size + 'px';
			});
		text.enter().append('text')
			.attr('text-anchor', 'middle')
			.attr('transform', function (d) {
				return 'translate(' + [d.x, d.y] + ')rotate(' + d.rotate + ')';
			})
			.style('font-size', function (d) {
				return d.size + 'px';
			})
			.on('click', function (d) {
				alert(d.text);
			})
			.style('opacity', 1e-6)
			.transition()
			.duration(1000)
			.style('opacity', 1);
		text.attr('title',function (d) {
			return 'Eintrag:' + "\t" + d.key + "\n" +
				'Anzahl:' + "\t" + d.value;
		}).style('font-family',function (d) {
				return d.font;
			}).style('fill',function (d) {
				return cloudgraph.fill(d.text);
			}).text(function (d) {
				return d.text;
			});
		var exitGroup = cloudgraph.background.append('g')
			.attr('transform', cloudgraph.vis.attr('transform'));
		var exitGroupNode = exitGroup.node();
		text.exit().each(function () {
			exitGroupNode.appendChild(this);
		});
		exitGroup.transition()
			.duration(1000)
			.style('opacity', 1e-6)
			.remove();
		cloudgraph.vis.transition()
			.delay(1000)
			.duration(750)
			.attr('transform', 'translate(' + [sizes.width >> 1, sizes.height >> 1] + ')scale(' + cloudgraph.zoomscale + ')');
	}

	function downloadPNG() {
		var canvas = document.createElement('canvas'),
			c = canvas.getContext('2d');
		canvas.width = sizes.width;
		canvas.height = sizes.height;
		c.translate(sizes.width >> 1, sizes.height >> 1);
		c.scale(cloudgraph.zoomscale, cloudgraph.zoomscale);
		words.forEach(function (word) {
			c.save();
			c.translate(word.x, word.y);
			c.rotate(word.rotate * Math.PI / 180);
			c.textAlign = 'center';
			c.fillStyle = cloudgraph.fill(word.text.toLowerCase());
			c.font = word.size + 'px ' + word.font;
			c.fillText(word.text, 0, 0);
			c.restore();
		});
		d3.select(this).attr('href', canvas.toDataURL('image/png'));
	}

	function initAngleUI() {
		angles = d3.select('#cloud_angles_view').append('svg')
			.attr('width', 2 * (angle.r + angle.px))
			.attr('height', angle.r + 1.5 * angle.py)
			.append('g')
			.attr('transform', 'translate(' + [angle.r + angle.px, angle.r + angle.py] + ')');

		angles.append('path')
			.style('fill', 'none')
			.attr('d', ['M', -angle.r, 0, 'A', angle.r, angle.r, 0, 0, 1, angle.r, 0].join(' '));

		angles.append('line')
			.attr('x1', -angle.r - 7)
			.attr('x2', angle.r + 7);

		angles.append('line')
			.attr('y2', -angle.r - 7);
		/*
		 angles.selectAll('text')
		 .data([-90, 0, 90])
		 .enter().append('text')

		 .attr('text-anchor', function (d, i) {
		 return ['end', 'middle', 'start'][i];
		 })
		 .attr('transform', function (d) {
		 d += 90;
		 return 'rotate(' + d + ')translate(' + -(angle.r + 10) + ')rotate(' + -d + ')translate(2)';
		 })
		 .style('fill', 'white')
		 .text(function (d) {
		 return d + '°';
		 });*/
		updateAngleUI();
	}

	function updateAngleUI() {
		var angle_scale = d3.scale.linear();
		angle_scale.domain([0, options.angle_count - 1]).range([options.angle_from, options.angle_to]);
		var step = (options.angle_to - options.angle_from) / options.angle_count;

		var path = angles.selectAll('path.angle')
			.data([
				{startAngle: options.angle_from * angle.radians, endAngle: options.angle_to * angle.radians}
			]);
		path.enter().insert('path', 'circle')
			.attr('class', 'angle')
			.style('fill', '#fc0');
		var
			arc = d3.svg.arc()
				.innerRadius(0)
				.outerRadius(angle.r);
		path.attr('d', arc);

		var line = angles.selectAll('line.angle')
			.data(d3.range(options.angle_count).map(angle_scale));
		line.enter().append('line')
			.attr('class', 'angle');
		line.exit().remove();
		line.attr('transform',function (d) {
			return 'rotate(' + (90 + d) + ')';
		}).attr('x2', function (d, i) {
				return !i || i === options.angle_count - 1 ? -angle.r - 5 : -angle.r;
			});

		var drag = angles.selectAll('path.drag')
			.data([options.angle_from, options.angle_to]);
		drag.enter().append('path')
			.attr('class', 'drag')
			.attr('d', 'M-9.5,0L-3,3.5L-3,-3.5Z')
			.call(d3.behavior.drag()
				.on('drag', function (d, i) {
					d = (i ? options.angle_to : options.angle_from) + 90;
					var start = [-angle.r * Math.cos(d * angle.radians), -angle.r * Math.sin(d * angle.radians)],
						m = [d3.event.x, d3.event.y],
						delta = ~~(Math.atan2(cross(start, m), dot(start, m)) / angle.radians);
					d = Math.max(-90, Math.min(90, d + delta - 90)); // remove this for 360°
					delta = options.angle_to - options.angle_from;
					if (i) {
						options.angle_to = d;
						if (delta > 360) options.angle_from += delta - 360;
						else if (delta < 0) options.angle_from = options.angle_to;
					} else {
						options.angle_from = d;
						if (delta > 360) options.angle_to += 360 - delta;
						else if (delta < 0) options.angle_to = options.angle_from;
					}
					updateAngleUI();
					generate();
				})
				.on('dragend', generate));
		drag.attr('transform', function (d) {
			return 'rotate(' + (d + 90) + ')translate(-' + angle.r + ')';
		});
		cloudgraph.layout.rotate(function () {
			return angle_scale(~~(Math.random() * options.angle_count));
		});
	}

	function cross(a, b) {
		return a[0] * b[1] - a[1] * b[0];
	}

	function dot(a, b) {
		return a[0] * b[0] + a[1] * b[1];
	}

	return {
		initCloud: initCloud
	};
}