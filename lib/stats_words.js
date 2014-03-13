/*

 Generates Data for a count-statistic words/links/hashtags...

 Format:
 {
 {
 "id": "#aufschrei",
 "count": 48232,
 "counts": {
 "unknown": 38193,
 "outcry": 1294,
 "comment": 2283,
 "troll": 5513,
 "report": 413,
 "spam": 536
 }
 },
 ...
 ]

 */
var tokenizer = require('./utils').Utils();
var fs = require('fs');
var config = require('./../config');

exports.MyLittleWordStat = function () {
    var me = this;
    var THRESHOLD = 5;
    var stopwords = [];

    function init() {
        var filename = config.datapath + 'stop.txt';
        fs.exists(filename, function (exists) {
            if (exists) {
                var data = fs.readFileSync(filename, 'utf8').split("\n");
                data.forEach(function (s) {
                    if (stopwords.indexOf(s) < 0)
                        stopwords.push(s.trim());
                });
                //fs.writeFileSync(filename, stopwords.join("\n"), 'utf8');
            }
        });
    }

    function isStopWord(text) {
        var s = text.toLowerCase();
        return stopwords.indexOf(s) >= 0;
    }

    init();

    function sortdDataByCat(data, cat) {
        data.sort(
            function (a, b) {
                if ((a.counts[cat] || 0) > (b.counts[cat] || 0)) {
                    return -1;
                }
                if ((a.counts[cat] || 0) < (b.counts[cat] || 0)) {
                    return 1;
                }
                return 0;
            });
        return data;
    }

    function generateData(params, callback) {
        var wordstat = {};
        var getArray = null;
        switch (params.kind) {
            case 'hash':
                getArray = function (tweet) {
                    return tokenizer.extractHashTags(tweet.text);
                };
                break;
            case 'user':
                getArray = function (tweet) {
                    return [tweet.user];
                };
                break;
            case 'client':
                getArray = function (tweet) {
                    return [tokenizer.extractClient(tweet.source)];
                };
                break;
            case 'link':
                getArray = function (tweet) {
                    var arr = tokenizer.extractLinks(tweet.text);
                    var longurls = tokenizer.validateLongUrls(tweet.longurls);
                    arr = arr.map(function (s) {
                        if (longurls && (longurls[s])) {
                            s = longurls[s];
                        }
                        if (s[s.length - 1] === '/') {
                            s= s.substring(0, s.length - 1);
                        }
                        if (s.indexOf('https://')==0)
                            s = s.substr(8);
                        else if (s.indexOf('http://')==0)
                            s = s.substr(7);
                        if (s.indexOf('www.')==0)
                            s = s.substr(4);
                        if (s.indexOf('m.')==0)
                            s = s.substr(2);
                        return s;
                    });
                    return arr;
                };
                break;
            case 'mention':
                getArray = function (tweet) {
                    var arr = [];
                    if (tweet.cleantext)
                        arr = tweet.cleantext;
                    else
                        arr = tokenizer.tokenize(tweet.text);
                    arr = arr.filter(function (w) {
                        return ('@' == w[0]);
                    });
                    return arr;
                };
                break;
            default: //case 'word':
                getArray = function (tweet) {
                    var arr = [];
                    if (tweet.cleantext)
                        arr = tweet.cleantext;
                    else
                        arr = tokenizer.tokenize(tweet.text);

                    arr = arr.filter(function (w) {
                        return (['@', '#'].indexOf(w[0]) < 0);
                    });

                    return arr;
                };
                break;
        }


        params.store.enumerateTweetsAndCatsRange(params.voteuserid, params.min, params.max, function (tweet) {
            if (tweet) {
                var arr = getArray(tweet);
                var tweetcat = tweet[params.mode];
                arr.forEach(function (s) {
                    if (s.length > 1) {
                        var stat = wordstat[s] || {};
                        stat[tweetcat] = (stat[tweetcat] || 0) + 1;
                        wordstat[s] = stat;
                    }
                });
            } else {
                var data = [];
                for (var key in wordstat) {
                    var stat = wordstat[key];
                    var total = 0;
                    for (var cat in stat) {
                        total += stat[cat];
                    }
                    if (total >= THRESHOLD) {
                        var obj = {id: key, count: total, counts: stat};
                        if ((params.kind === 'word') && isStopWord(key)) {
                            obj.stop = true;
                        }
                        data.push(obj);
                    }
                }
                data.sort(
                    function (a, b) {
                        if (a.count > b.count) {
                            return -1;
                        }
                        if (a.count < b.count) {
                            return 1;
                        }
                        return 0;
                    });
                callback(data);
            }
        });
    }

    function filter(data, cat) {
        data = sortdDataByCat(data, cat);
        var result = {};
        data.forEach(function (entry) {
            var count = entry.counts[cat] || 0;
            if (count > 0) {
                result[entry.id] = count;
            }
        });
        return result;
    }

    me.prepareData = function (params, data, callback) {
        if (params.cat) {
            callback(filter(data, params.cat));
        } else {
            callback(data);
        }
    };

    me.getData = function (params, callback) {
        generateData(params, function (data) {
            me.prepareData(params, data, callback);
        });
    };

    return me;
};
