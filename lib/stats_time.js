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
                var newdata = tokenizer.getCreatedHourOf(tweet.created_at);
                if (!data[newdata])
                    data[newdata] = {};
                var s = tweet[params.mode];
                data[newdata][s] = (data[newdata][s] || 0) + 1;
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
