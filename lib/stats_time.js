/*

 generates data for a timeline

 Format:
 {
 {
	 "time": "1359068400000",
	 "count": 91,
	 "counts": {
		 "unknown": 73,
		 "outcry": 17,
		 "comment": 1
	 }
 },
 ...
 ]

 */

var tokenizer = require('./tweet_tokenizer').MyLittleTweetTokenizer();

exports.MyLittleTimeStat = function () {
	var me = this;

	function getTimeData(params, callback) {
		var data = {};
		params.store.enumerateTweetsAndCats(params.voteuserid, function (tweet) {
			if (tweet) {
				var newdata = new Date(tweet.created_at.getFullYear(), tweet.created_at.getMonth(),
					tweet.created_at.getDate(), tweet.created_at.getHours(), 0, 0, 0).getTime();
				if (!data[newdata])
					data[newdata] = {};

				switch (params.kind) {
					case 'hash':
						var arr = tokenizer.extractHashTags(tweet.text);
						arr.forEach(function (s) {
							data[newdata][s] = (data[newdata][s] || 0) + 1;
						});
						break;
					default: //         case 'cats':
						var s = tweet[params.mode];//consts.tools.catName(tweet[params.mode]);
						data[newdata][s] = (data[newdata][s] || 0) + 1;
						break;
				}
			} else {
				var result = [];
				for (var key in data) {
					var total = 0;
					for (var subkey in data[key]) {
						total += data[key][subkey];
					}
					result.push({time: key, count: total, counts: data[key]});
				}
				callback(result);
			}
		});
	}

	me.prepareData = function (params, data, callback) {
		callback(data);
	};

	me.getData = function (params, callback) {
		getTimeData(params, function (data) {
			me.prepareData(params, data, callback);
		});
	};

	return me;
};
