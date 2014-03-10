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

var consts = require('./consts');
var tokenizer = require('./tweet_tokenizer').MyLittleTweetTokenizer();

exports.MyLittleHashtagStat = function () {
    var me = this;

    var allowHashtags = [ '#aufschrei',
        '#gegenschrei',
        '#brüderle',
        '#bruederle',
        '#ard',
        '#jauch',
        '#lanz',
        '#rtl',
        '#annewill',
        '#zdflogin',
        '#sexisten',
        '#sterntv'
//        '#sexismus',
//        '#aufschrei-debatte',
//        '#outcry',
//        '#fdp-mann',
//        '#fdp',
//        '#spd',
//        '#cdu',
//        '#piraten',
//        '#csu',
//        '#gruene',
//        '#politik',
//        '#focus',
//        '#stern',
//        '#himmelreich',
//        '#feminismus'
//        '#sexismus-debatte',
//        '#frauen',
//        '#domian',
//        '#wizorek',
//        '#aufschrei-tweets',
//        '#sexism'
//        '#schavan'
    ];

    function getHashtagTimeData(params, callback) {
        var data = {};
        params.store.enumerateTweetsAndCatsRange(params.voteuserid,params.min, params.max,  function (tweet) {
            if (tweet) {
                var newdata = tokenizer.getCreatedHourOf(tweet.created_at);
                if (!data[newdata])
                    data[newdata] = {};
                var arr = tokenizer.extractHashTags(tweet.text);
                arr.forEach(function (s) {
                    s = s.toLowerCase();
                    if (s == '#bruederle')
                        s = '#brüderle';
                    if (allowHashtags.indexOf(s) >= 0)
                        data[newdata][s] = (data[newdata][s] || 0) + 1;
                });

            } else {
                var result = [];
                for (var key in data) {
                    var total = 0;
                    for (var subkey in data[key]) {
                        total += data[key][subkey];
                    }
                    result.push({time: key, count: total, counts: data[key]});
                }

                var hashseries = {};
//                var usedtimes = result.map(function (d) {
//                    return parseInt(d.time);
//                });
                result.forEach(function (d) {
                    for (var key in d.counts) {
                        hashseries[key] = hashseries[key] || {
                            values: [],
                            key: key,
                            count: 0,
                            disabled: true
                        };
                        hashseries[key].values.push({x: parseInt(d.time), y: d.counts[key]});
                        hashseries[key].count += d.counts[key];
                    }
                });
                var series = [];
                for (var key in hashseries) {
                    var serie = hashseries[key];
                    series.push(serie);
//                    var newtimes = usedtimes.filter(function (t) {
//                        for (var i = 0; i < serie.values.length; i++)
//                            if (serie.values[i].x == t)
//                                return false;
//                        return true;
//                    });
//                    serie.values = serie.values.concat(newtimes.map(function (t) {
//                        return {x: t, y: 0};
//                    }));
                    serie.values.sort(function (a, b) {
                        return a.x - b.x;
                    });
                }
                series.sort(function (a, b) {
                    return b.count - a.count;
                });
                result = series;//.slice(0, 50);

//                var temp = result.map(function(d){
//                    return d.key;
//                });
//                console.log(temp);

                callback(result);
            }
        });
    }

    me.prepareData = function (params, data, callback) {
        callback(data);
    };

    me.getData = function (params, callback) {
        getHashtagTimeData(params, function (data) {
            me.prepareData(params, data, callback);
        });
    };

    return me;
};
