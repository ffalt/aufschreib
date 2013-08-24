const basecats = [
	{
		id: 'outcry',
		name: 'Aufschrei',
		icon: 'glyphicon-bullhorn',
		color: '#5e8c6A'
	},
	{
		id: 'report',
		name: 'Links',
		icon: 'glyphicon-share-alt',
		color: '#98abc5'
	},
	{
		id: 'comment',
		name: 'Kommentar',
		icon: 'glyphicon-comment',
		color: '#bfb35a'
	},
	{
		id: 'troll',
		name: 'Troll',
		icon: 'glyphicon-thumbs-down',
		color: '#8c2318'
	},
	{
		id: 'spam',
		name: 'Spam',
		icon: 'glyphicon-trash',
		color: '#ff8c00'
	},
	{
		id: 'unknown',
		name: 'Unbekannt',
		icon: 'glyphicon-question-sign',
		color: '#f2c45a'
	}
];
const unknown = 'unknown';
const defaultmode = 'human';
const modes = [
	{
		id: 'human',
		name: 'Human',
		icon: 'glyphicon-user'
	},
	{
		id: 'machine',
		name: 'Machine',
		icon: 'glyphicon-th'
	}
];
const wordkinds = [
	{
		id: 'word',
		name: 'Words',
		icon: 'glyphicon-quote-left'
	},
	{
		id: 'user',
		name: 'Users',
		icon: 'glyphicon-user'
	},
	{
		id: 'hash',
		name: 'Hashtags',
		icon: 'glyphicon-hash'
	},
	{
		id: 'client',
		name: 'Clients',
		icon: 'glyphicon-desktop'
	},
	{
		id: 'link',
		name: 'Links',
		icon: 'glyphicon-link'
	}
];
const graphkinds = [
	{
		id: 'mention',
		name: 'Mentions',
		icon: 'glyphicon-reply'
	}
];
const stats = [
	{
		id: 'pie',
		name: 'Pie',
		kinds: [],
		maxentries: 0,
		defaultkind: null,
		icon: 'glyphicon-circle-blank',
		usesCats: false
	},
	{
		id: 'bar',
		name: 'Bar',
		thresholds: 1,
		maxentries: 30,
		defaultkind: 'word',
		kinds: wordkinds,
		icon: 'glyphicon-bar-chart',
		usesCats: true
	},
	{
		id: 'time',
		name: 'Time',
		maxentries: 0,
		defaultkind: null,
		kinds: [],
		icon: 'glyphicon-indent-left',
		usesCats: false
	},
	{
		id: 'cloud',
		name: 'Cloud',
		maxentries: 250,
		thresholds: 10,
		defaultkind: 'word',
		kinds: wordkinds,
		icon: 'glyphicon-cloud',
		usesCats: true
	},
	{
		id: 'graph',
		name: 'Graph',
		maxentries: 0,
		defaultkind: 'mention',
		kinds: graphkinds,
		icon: 'glyphicon-sitemap',
		usesCats: false
	}
];
const thresholds = {
	spam: 3,
	troll: 2,
	report: 2,
	comment: 1,
	outcry: 1
};

function findbyid(array, id) {
	for (var i = 0; i < array.length; i++) {
		if (array[i].id === id)
			return array[i];
	}
	return null;
}

var tools = (function () {

	function catName(catid) {
		var cat = findbyid(basecats, catid);
		if (cat)
			return cat.name;
		else
			return '';
	}

	function statinfo(statid) {
		return findbyid(stats, statid);
	}

	function validcat(catid) {
		return (findbyid(basecats, catid) !== null);
	}

	function validkind(type, kindid) {
		var info = statinfo(type);
		if (info) {
			return (findbyid(info.kinds, kindid) !== null);
		}
		return false;
	}

	function validstat(statid) {
		return (findbyid(stats, statid) !== null);
	}

	function validmode(mode) {
		return ((mode === 'human') || (mode === 'machine'));
	}

	function modeName(mode) {
		return ((mode === 'human') ? modes[0] : modes[1]);
	}

	return {
		statinfo: statinfo,
		validstat: validstat,
		validmode: validmode,
		validcat: validcat,
		validkind: validkind,
		catName: catName,
		modeName: modeName
	};
})();

module.exports = {
	cats: basecats,
	unknown: unknown,
	defaultmode: defaultmode,
	thresholds: thresholds,
	stats: stats,
	tools: tools,
	modes: modes
};
