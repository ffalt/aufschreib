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

exports.MyLittleLinkStat = function () {
    var me = this;
    var THRESHOLD = 3;

    function generateData(params, callback) {
        var linkstat = {};
        var getArray = function (tweet) {
            var arr = tokenizer.extractLinks(tweet.text);
            var longurls = tokenizer.validateLongUrls(tweet.longurls);
            arr = arr.map(function (s) {
                if (longurls && (longurls[s])) {
                    s = longurls[s];
                }
                var url = s;
                if (s[s.length - 1] === '/') {
                    s = s.substring(0, s.length - 1);
                }
                var i = s.indexOf('#');
                if (i >= 0) {
                    s = s.substring(0, i);
                }
                if (s.indexOf('https://') == 0)
                    s = s.substr(8);
                else if (s.indexOf('http://') == 0)
                    s = s.substr(7);
                if (s.indexOf('www.') == 0)
                    s = s.substr(4);
                if (s.indexOf('m.') == 0)
                    s = s.substr(2);
                return {key:s, url:url};
            });
            return arr;
        };

        params.store.enumerateTweetsAndCatsRange(params.voteuserid, params.min, params.max, function (tweet) {
            if (tweet) {
                var arr = getArray(tweet);
                arr.forEach(function (s) {
                    linkstat[s.key] = linkstat[s.key] || {url: s.url,tweet: tweet, count: 0};
                    var stat = linkstat[s.key];
                    if (stat.tweet.created_at > tweet.created_at) {
                        stat.tweet = tweet;
                    }
                    stat.count++;
                });
            } else {
                var data = [];
                for (var key in linkstat) {
                    var stat = linkstat[key];
                    if (stat.count > THRESHOLD)
                        data.push({url: stat.url, first: stat.tweet.created_at, count: stat.count});
                }
                data.sort(function (a, b) {
                    return a.first - b.first;
                });
                callback(data);
            }
        });
    }

    me.getData = function (params, callback) {
        generateData(params, callback);
    };

    return me;
};
