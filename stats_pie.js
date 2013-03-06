/*

 Generiert Daten für einen Kuchen

 Format:
  [
   {id: 'kategorie-id', value: anzahl),
   ...
  ]

 */

var consts = require('./consts');

exports.MyLittlePieStat = function () {
	var me = this;

	function getPieData(params, callback) {
		params.store.getCountsByCat(params.voteuserid, params.mode, function (stat) {
			var data = [];
			consts.cats.forEach(function (cat) {
				if (stat[cat.id] > 0) {
					data.push({id: cat.id, value: stat[cat.id]});
				}
			});
			callback(data);
		});
	}

	me.prepareData = function (params, data, callback) {
		callback(data);
	};

	me.getData = function (params, callback) {
		getPieData(params, function (data) {
			me.prepareData(params, data, callback);
		});
	};

	return me;
};
