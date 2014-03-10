/*

 generates data for a pie

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
        var stat = [];
        consts.cats.forEach(function (cat) {
            stat[cat.id] = 0;
        });
        params.store.enumerateVotesCatsRange(params.voteuserid, params.min, params.max, function (vote) {
                if (vote) {
                    var cat = (vote[params.mode] || consts.unknown);
                    stat[cat] += 1;
                } else {
                    var data = [];
                    consts.cats.forEach(function (cat) {
                        if (stat[cat.id] > 0) {
                            data.push({id: cat.id, value: stat[cat.id]});
                        }
                    });
                    callback(data);
                }
            }
        )
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
