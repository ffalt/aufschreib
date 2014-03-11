function graphView() {
	var
		options = {
			type: 'graph',
			mode: 'human',
			kind: 'mention',
			cat: null,

			min: 5,
			view: 'svg',
			id: 'graph_'
		};
	var
		stats, graph, renderer;

	function init(id, mode, kind, statshelper) {
		stats = statshelper;
		options.id = id;
		options.mode = mode;
		options.kind = kind;
		linkUI();
		stats.requestData(options, generate);
	}

    function request() {
        stats.requestData(options, generate);
    }


    function change() {
		if (!isNaN(this.value)) {
			options.min = this.value;
			generate();
		}
		stats.d3_eventCancel();
	}

	function linkUI() {
		d3.selectAll('.navbar-form input').on('change', change);
		stats.linkUIDefault(options.id);
		stats.linkUIReloads(options, ['mode', 'kind'], generate);
		stats.linkUIRegens(options, ['view'], generate);
		$('#' + options.id + 'download-svg').hide();
		stats.selectActives(options, ['view', 'mode', 'kind']);
	}

	function generate() {
		var data = stats.getBaseData();
		build(data);
	}

	function getColor(cat) {
		return stats.getCatInfo(cat).color;
	}

	function build(graphdata) {
		if (renderer)
			renderer.pause();
		if (graph)
			graph.clear();
		$('#' + options.id + 'vis').html('');
		graph = Viva.Graph.graph();
		var addednodes = {};
		graphdata.links.forEach(function (link) {
			if (link.value >= options.min) {
				if (!addednodes[link.source]) {
					addednodes[link.source] = true;
					graph.addNode(link.source, graphdata.nodes[link.source]);
				}
				if (!addednodes[link.target]) {
					addednodes[link.target] = true;
					graph.addNode(link.target, graphdata.nodes[link.target]);
				}
				graph.addLink(link.source, link.target);
			}
		});
//		console.log('Nodes: ' + graph.getNodesCount());
//		console.log('Links: ' + graph.getLinksCount());
//		console.log('Min: ' + options.min);

		stats.setData(graphdata); //todo report filtered data

		var graphics;

		if (options.view === 'svg') {

			var highlightRelatedNodes = function (nodeId, isOn) {
				// just enumerate all realted nodes and update link color:
				graph.forEachLinkedNode(nodeId, function (node, link) {
					if (link && link.ui) {
						// link.ui is a special property of each link
						// points to the link presentation object.
						link.ui.attr('stroke', isOn ? 'red' : 'gray');
					}
				});
			};
			var nodeSize = 8;
			graphics = Viva.Graph.View.svgGraphics();
			graphics.node(function (node) {
				var color = getColor(node.data.vote);
				var ui = Viva.Graph.svg("rect")
					.attr("width", nodeSize)
					.attr("height", nodeSize)
					.attr("stroke", color)
					.attr("fill", color);
				ui.append('title').text(node.data.name + "\n" +
					'Mostly: ' + stats.getCatInfo(node.data.vote).name);
//			var ui = Viva.Graph.svg('circle')
//					.attr('r', 4)
//					.attr('stroke', '#fff')
//					.attr('stroke-width', '1.5px')
//				;//.attr("fill", colors[groupId ? groupId - 1 : 5]);

//
//			console.log(node.name);
//			$(ui).hover(function () { // mouse over
//				highlightRelatedNodes(node.id, true);
//			}, function () { // mouse out
//				highlightRelatedNodes(node.id, false);
//			});
				return ui;
			});

		} else {
			graphics = Viva.Graph.View.webglGraphics();
//		graphics.node(function (node) {
//			return Viva.Graph.View.webglSquare(5, 0xffeeffff);
//		});
		}

//			.placeNode(function (nodeUI, pos) {
//				nodeUI.attr('x', pos.x - nodeSize / 2).attr('y', pos.y - nodeSize / 2);
//			});
//		var layout = Viva.Graph.Layout.forceDirected(graph, {
//			springLength: 30,
//			springCoeff: 0.0008,
//			dragCoeff: 0.00,
//			gravity: -1.2,
//			theta: 1
//		});
//		var layout = Viva.Graph.Layout.forceDirected(graph, {
//			springLength : 35,
//			springCoeff : 0.00055,
//			dragCoeff : 0.09,
//			gravity : -1
//		});
//		var layout = Viva.Graph.Layout.forceDirected(graph, {
//			springLength: 30,
//			springCoeff: 0.0008,
//			dragCoeff: 0.009,
//			gravity: -1.2,
//			theta: 0.8
//		});

		renderer = Viva.Graph.View.renderer(graph,
			{
//				layout: layout,
				graphics: graphics,
				renderLinks: true,
				container: document.getElementById(options.id + 'vis'),
				prerender: true
			});

		renderer.run();
	}

	return {
        init: init,
        request:request
	};
}

