/*

 generates data for a timeline

 */

var tokenizer = require('./utils').Utils();
var consts = require('./consts');

exports.MyLittleTimeStat = function () {
    var me = this;

    function getTimeData(params, callback) {
        var data = {};
        var min = 0, max = 0;
        params.store.enumerateTweetsAndCatsRange(params.voteuserid, params.min, params.max, function (tweet) {
            if (tweet) {
                var newdata = tokenizer.getCreatedHourOf(tweet.created_at);
                min = min == 0 ? newdata : Math.min(min, newdata);
                max = Math.max(max, newdata);
                var s = tweet[params.mode];
                if (!data[s])
                    data[s] = {};
                data[s][newdata] = (data[s][newdata] || 0) + 1;
            } else {
                var result = [];
                var times = [];

                for (var i = min; i < max; i += (1000 * 60 * 60)) {
                    times.push(i);
                }
                for (var key in data) {
                    var ser = data[key];
                    var series = {
                        "key": consts.tools.catName(key),
                        "color": consts.tools.catColor(key),
                        "values": times.map(function (t) {
                            return [t, ser[t] || 0];
                        })
                    };
                    result.push(series);
                }
                callback(result);
            }
        });
    }

    me.getData = function (params, callback) {
        getTimeData(params, callback);
    };

    return me;
};
