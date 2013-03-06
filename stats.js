/*

    API für Stats-Data, liefert wenn vorhanden aus dem File-basierten Cache

    in Pfad /data/stats

	Parameter: (siehe auch consts.js)
	type - Typ der Daten (für Kuchen, Zeitleiste, etc)
	mode - die menschliche Bewertung oder die des Algorithmus
	cat - Kategorie zum Filtern (wird aber auch von den d3-charts im Client-Browser gemaacht, damit dafür nicht neu geholt werden muss)
	kind - ggf. Untertyp der Daten, z.B. Wortstatistik für Twitterclients|Links|Hashtags

	store - die Tweet-Daten-Ablage (DB|Files)
 	voteuserid - UserID der Bewertungen
 	forcegenerate - Daten nicht aus dem Cache nehmen

*/

var fs = require('fs');
var consts = require('./consts');
var wordstat = require('./stats_words').MyLittleWordStat();
var timestat = require('./stats_time').MyLittleTimeStat();
var piestat = require('./stats_pie').MyLittlePieStat();

exports.MyLittleStats = function () {
	var me = this;

	/* ParameterHelper (Validierung  etc.) */

	function StatsParams() {
		this.voteuserid = 0;
		this.store = null;
		this.type = ''; //data-ttype
		this.mode = ''; //human / machine
		this.cat = null; //classification
		this.kind = null; //data-subtype
		this.forcegenerate = false;

		this.isActiveType = function (type) {
			return (this.type === type);
		};

		this.isActiveMode = function (mode) {
			return (this.mode === mode);
		};

		this.isActiveCat = function (cat) {
			return (this.cat === cat);
		};

		this.isActiveKind = function (kind) {
			var info = consts.tools.statinfo(this.type);
			if (info) {
				return (this.kind === kind) ||
					( (!this.kind) && (info.defaultkind === kind)  );
			} else {
				return false;
			}
		};

		this.getHrefCat = function (cat) {
			return '#!/stats/' + this.type + '/' + this.mode + (this.kind ? '/' + this.kind : '') + '/' + cat;
		};

		this.getHrefMode = function (mode) {
			return '#!/stats/' + this.type + '/' + mode + (this.kind ? '/' + this.kind : '') + (this.cat ? '/' + this.cat : '');
		};

		this.getHrefKind = function (kind) {
			return '#!/stats/' + this.type + '/' + this.mode + '/' + kind + (this.cat ? '/' + this.cat : '');
		};

		this.getChartRawJsonURL = function () {
			return'?cmd=json&type=' + this.type +
				'&mode=' + this.mode +
				(this.cat ? '&cat=' + this.cat : '') +
				(this.kind ? '&kind=' + this.kind : '');
		};

		this.getChartContainerId = function () {
			return 'stats_' + this.type +
				(this.cat ? '_all' : '') + '_' +
				this.mode + (this.kind ? '_' + this.kind : '');
		};

		this.isValid = function () {
			return consts.tools.validstat(this.type) &&
				consts.tools.validmode(this.mode) &&
				( (!this.cat) || consts.tools.validcat(this.cat) ) &&
				( (!this.kind) || consts.tools.validkind(this.type, this.kind) );
		};
	}

	/* bring ParameterHelper to life */

	me.getParams = function (voteuserid, store, type, mode, cat, kind, forcegenerate) {
		var result = new StatsParams();
		result.voteuserid = voteuserid;
		result.store = store;
		result.type = type;
		result.mode = mode;
		result.cat = cat;
		result.kind = kind;
		result.forcegenerate = forcegenerate;
		return result;
	}

	/* welches Schweinderl hättens denn gern */

	function getStat(params) {
		switch (params.type) {
			case 'time':
				return timestat;
				break;
			case 'cloud':
				return wordstat;
				break;
			case 'bar':
				return wordstat;
				break;
			default: //'pie'
				return piestat;
				break;
		}
	}

	/* laden wenn im Cache vorhanden, sonst eben nicht */

	function loadDataFromCache(filename, callback) {
		fs.exists(filename, function (exists) {
			if (exists) {
				fs.readFile(filename, function (err, data) {
					callback(JSON.parse(data));
				});
			} else {
				callback();
			}
		});
	}

	/* Cache-Dateinamen kleben */

	function getFileName(params) {
		return './data/stats/' + params.voteuserid + '_' +
			(params.type === 'cloud' ? 'bar' : params.type) + '_' + params.mode
			+ (params.kind ? '_' + params.kind : '')
			+ '.json';
	}

	/** API **/

	me.getChartData = function (params, callback) {
		var file = getFileName(params);
		loadDataFromCache(file, function (rawdata) {
			if ((!params.forcegenerate) && (rawdata)) {
				getStat(params).prepareData(params, rawdata, function (data) {
					callback(data);
				});
			} else {
				getStat(params).getData(params, function (data) {
					callback(data);
				});
			}
		});
	};

	/* Cache erstellen */

	function writeCacheFile(params, callback) {
		var file = getFileName(params);
		getStat(params).getData(params, function (data) {
			fs.writeFile(file, JSON.stringify(data, null, '\t'), 'utf8', function (err) {
				if (err) {
					console.log('[Stats] Error:' + err);
				} else {
					console.log('[Stats] ' + file + " was saved!");
				}
				callback();
			});
		});

	}

	function writeCacheModeWhatTypeKindNr(nr, params, callback) {
		if (nr >= consts.tools.statinfo(params.type).kinds.length) {
			params.kind = null;
			callback();
		} else {
			params.kind = consts.tools.statinfo(params.type).kinds[nr].id;
			writeCacheFile(params, function () {
				writeCacheModeWhatTypeKindNr(nr + 1, params, callback);
			})
		}
	}

	function writeCacheModeWhatType(params, callback) {
		if (consts.tools.statinfo(params.type).kinds.length > 0) {
			writeCacheModeWhatTypeKindNr(0, params, callback);
		} else {
			writeCacheFile(params, function () {
				callback();
			});
		}
	}

	function writeCacheModeWhat(index, params, callback) {
		if (index >= consts.stats.length)
			callback();
		else {
			params.type = consts.stats[index].id;
			if (params.type === 'cloud') { //skip, same as 'bar'
				writeCacheModeWhat(index + 1, params, callback);
			} else
				writeCacheModeWhatType(params, function () {
					writeCacheModeWhat(index + 1, params, callback);
				});
		}
	}

	function writeCacheMode(params, callback) {
		writeCacheModeWhat(0, params, callback);
	}

	me.cacheStats = function (voteuserid, store, callback) {
		console.log('[Stats] Creating Stats Cache');
		var params = me.getParams(voteuserid, store);
		params.mode = 'human';
		writeCacheMode(params, function () {
			params.mode = 'machine';
			writeCacheMode(params, function () {
				console.log('[Stats] Cache created');
				callback();
			});
		});
	};

	return me;
};
