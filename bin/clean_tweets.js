var fs = require('fs');
var OAuth = require('oauth').OAuth;
var config = require('./../config.js');
var async = require('async');
var moment = require('moment');
var tokenizer = require('./../lib/tweet_tokenizer.js').MyLittleTweetTokenizer();

var tweeter = new OAuth(
    "https://api.twitter.com/oauth/request_token", //requestUrl
    "https://api.twitter.com/oauth/access_token",  //accessUrl
    config.twitter_bot.consumerKey,                            //consumerKey
    config.twitter_bot.consumerSecret,                         //consumerSecret
    "1.0",                                         //version
    null,                                          //authorize_callback
    "HMAC-SHA1",                                   //signatureMethod
    null,                                          //nonceSize
    {"Accept": "*/*", "Connection": "close",
        "User-Agent": config.twitter_bot.user_agent}           //customHeaders
);

var Twitter = function () {

    this.api_limits = [];

    this.clearApiLimits = function () {
        this.api_limits = [];
    };

    this.getLowestApiLimit = function () {
        var limit = null;
        for (var i = 0; i < this.api_limits.length; i++) {
            var o = this.api_limits[i];
            if ((!limit) || (limit.retry > o.retry))
                limit = o;
        }
        return limit;
    };

    this.getApiLimit = function (url) {
        for (var i = 0; i < this.api_limits.length; i++) {
            var o = this.api_limits[i];
            if (o.url == url) {
                return o;
            }
        }
        return null;
    };

    this.getApiCallCount = function (response) {
        if (response && (response.headers) && (response.headers["x-rate-limit-remaining"])) {
            return parseInt(response.headers["x-rate-limit-remaining"], 10);
        }
        return 1;
    };

    this.getApiCallMax = function (response) {
        if (response && (response.headers) && (response.headers["x-rate-limit-limit"])) {
            return parseInt(response.headers["x-rate-limit-limit"], 10);
        }
        return 1;
    };

    this.getApiLimitReset = function (response) {
        if (response && (response.headers) && (response.headers["x-rate-limit-reset"])) {
            return parseInt(response.headers["x-rate-limit-reset"], 10) * 1000;
        }
        return 0;
    };

    this.getApiLimitDiff = function (reset) {
        var dest = new Date(reset);
        var now = new Date();
        return dest - now;
    };

    this.canUseApi = function (url) {
        var o = this.getApiLimit(url);
        if (o && (o.count === 0) && (this.getApiLimitDiff(o.retry) > 0)) {
            return false;
        }
        return true;
    };

    this.fillApiCall = function (o, response) {
        o.retry = this.getApiLimitReset(response);
        o.count = this.getApiCallCount(response);
        o.max = this.getApiCallMax(response);
    };

    this.get = function (url, params, callback) {
        var caller = this;
        if (!caller.canUseApi(url)) {
            callback(null, 'rate limit', true);
            return;
        }
        tweeter.get("https://api.twitter.com/1.1/" + url + params,  //url
            config.twitter_bot.token,   //oauth_token
            config.twitter_bot.secret, //oauth_token_secret
            function (error, data, response) {
                var o = caller.getApiLimit(url);
                if (!o) {
                    o = {url: url};
                    caller.api_limits.push(o);
                }
                caller.fillApiCall(o, response);
                console.log('Api Call: ' + o.url + ' ' + o.count + '/' + o.max + ' reset ' + moment(o.retry).format('HH:mm:ss'));
                if (error) {
                    if ([403, 404].indexOf(error.statusCode) >= 0) {
                        var s = null;
                        if (error.data) {
                            var d = JSON.parse(error.data);
                            if (d.errors && d.errors[0] && d.errors[0].message)
                                s = d.errors[0].message;
                        }
                        callback(null, s ? s : JSON.stringify(error), false, true);
                    } else {
                        callback(null, JSON.stringify(error), true);
                    }
                } else if (data) {
                    try {
                        data = JSON.parse(data);
                    } catch (e) {
                        error = e;
                    }
                    callback(data);
                } else {
                    callback(null, 'No data error');
                }
            });
    };

};

var twitter = new Twitter();
var request_ids = JSON.parse(fs.readFileSync(config.datapath + 'tweetids.json', 'utf8'));
var tweets = [];//JSON.parse(fs.readFileSync(config.datapath + 'cleaned.json', 'utf8'));

var prepareCustomFields = function (tweet) {
    tweet.timestamp = new Date().valueOf();
};

var Scanner = function () {

    this.save = function (cb) {
        tokenizer.storeDayJsonFiles(tweets, config.datapath + 'import/cleaned/', cb);
//        var filename = config.datapath + 'cleaned.json';
//        var lines = tweets.map(function (t) {
//            return (JSON.stringify(t));
//        });
//        console.log('Saving...')
//        fs.writeFileSync(filename, '[\n' + lines.join(',\n') + '\n]\n', 'utf8');
    };

    this.scanTweets = function (cb) {
        if (!twitter.canUseApi('statuses/show.json')) {
            return cb(false, false);
        }
        var tweetids = {};
        tweets.forEach(function (t) {
            tweetids[t.id_str] = true;
            if (t.retweet_ids) {
                t.retweet_ids.forEach(function (id) {
                    if (request_ids.indexOf(id) < 0)
                        request_ids.push(id);
                })
            }
        });

        var ids = request_ids.filter(function (id) {
            return (!tweetids[id])
        });

        var ratelimit = false;
        var q = async.queue(function (id, callback) {
            if (ratelimit)
                setImmediate(callback);
            else
                twitter.get('statuses/show.json', '?id=' + id + '&include_entities=true', function (tweet, e, rl, na) {
                        if (tweet) {
                            prepareCustomFields(tweet);
                            tweets.push(tweet);
                        } else if (rl) {
                            ratelimit = true;
                        } else {
                            var tweet = {id_str: id};
                            prepareCustomFields(tweet);
                            tweet.error = e;
                            tweets.push(tweet);
                            console.log(e);
                        }
                        callback();
                    }
                )
        }, 1);
        q.drain = function () {
            cb(!ratelimit, true);
        };
        if (ids.length === 0) {
            cb(true, false);
        } else {
            console.log('scanTweets', ids.length);
            q.push(ids);
        }
    };

    this.scanRetweetIds = function (cb) {
        if (!twitter.canUseApi('statuses/retweeters/')) {
            return cb(false, false);
        }
        var tweetids = {};
        tweets.forEach(function (t) {
            tweetids[t.id_str] = true;
        });
        var tws = tweets.filter(function (t) {
            return ((!t.retweet_ids) && (!t.retweeted_status));
        });
        var ratelimit = false;

        var getRetweetIds = function (tweet, cursor, list, callback) {
            twitter.get('statuses/retweeters/', 'ids.json?id=' + tweet.id_str + '&stringify_ids=true' + (cursor ? '&cursor=' + cursor : ''), function (data, e, rl, na) {
                    if (data) {
                        if (data.ids) {
                            list = list.concat(data.ids);
                        }
                        if ((data.next_cursor_str) && (data.next_cursor_str != "0")) {
                            getRetweetIdsCursor(tweet, data.next_cursor_str, list, callback);
                        } else
                            callback(list);
                        return;
                    } else if (rl) {
                        ratelimit = true;
                    } else {
                        if (na)
                            tweet.retweet_ids = [];
                        console.log(e);
                    }
                    callback(null);
                }
            )
        };

        var q = async.queue(function (tweet, callback) {
            if (ratelimit)
                setImmediate(callback);
            else
                getRetweetIds(tweet, null, [], function (list) {
                    if (list)
                        tweet.retweet_ids = list;
                    callback();
                });
        }, 1);
        q.drain = function () {
            cb(!ratelimit, true);
        };
        if (tws.length === 0) {
            cb(true, false);
        } else {
            console.log('scanRetweetIds', tws.length);
            q.push(tws);
        }
    };

    this.scanRetweets = function (cb) {
        if (!twitter.canUseApi('statuses/retweets/')) {
            return cb(false, false);
        }
        var tweetids = {};
        tweets.forEach(function (t) {
            tweetids[t.id_str] = true;
        });
        var tws = tweets.filter(function (t) {
            return ((!t.retweet_ids) && (!t.retweeted_status));
        });
        var ratelimit = false;
        var q = async.queue(function (tweet, callback) {
            if (ratelimit)
                setImmediate(callback);
            else
                twitter.get('statuses/retweets/', tweet.id_str + ".json?count=100", function (tw, e, rl, na) {
                        if (tw) {
                            if (tw.length) {
                                tw.forEach(function (t) {
                                    if (!tweetids[t.id_str]) {
                                        console.log('New Tweet by Retweet Check: ' + t.id_str);
                                        prepareCustomFields(t);
                                        tweets.push(t);
                                    }
                                });
                            } else {
                                tweet.retweet_ids = [];
                            }
                        } else if (rl) {
                            ratelimit = true;
                        } else {
                            if (na)
                                tweet.retweet_ids = [];
                            console.log(e);
                        }
                        callback();
                    }
                )
        }, 1);
        q.drain = function () {
            cb(!ratelimit, true);
        };
        if (tws.length === 0) {
            cb(true, false);
        } else {
            console.log('scanRetweets', tws.length);
            q.push(tws);
        }
    };

    this.scanUsers = function (cb) {
        if (!twitter.canUseApi('users/lookup.json')) {
            return cb(false, false);
        }
        var missingusers = [];
        tweets.forEach(function (t) {
            if ((t.user) && (!t.user.screen_name)) {
                missingusers.push(t.user.id_str);
            }
        });
        var ratelimit = false;

        var getUsers = function (ids, callback) {
            twitter.get("users/lookup.json", "?user_id=" + ids.join(',') + '&include_entities=false', function (users, e, rl, na) {
                if (users) {
                    users.forEach(function (u) {
                        for (var i = 0; i < tweets.length; i++) {
                            if ((tweets[i].user) && (tweets[i].user.id_str == u.id_str)) {
                                tweets[i].user = u;
                            }
                        }
                    })
                    for (var i = 0; i < tweets.length; i++) {
                        if ((tweets[i].user) && (!tweets[i].user.screen_name) && (ids.indexOf(tweets[i].user.id_str) >= 0)) {
                            tweets[i].user.screen_name = '[Unknown]';
                        }
                    }
                } else if (rl) {
                    ratelimit = true;
                } else {
                    console.log(e);
                }
                callback();
            });
        };

        function getUserPackage(ids) {
            if (ratelimit) {
                cb(false, true);
            } else if (ids.length === 0) {
                cb(true, true);
            } else {
                var request = ids.splice(0, 100);
                getUsers(request, function () {
                    getUserPackage(ids);
                });
            }
        }

        if (missingusers.length === 0) {
            cb(true, false);
        } else {
            console.log('scanUsers', missingusers.length);
            getUserPackage(missingusers.slice());
        }
    };

    this.scan = function (cb) {
        var caller = this;
        var done = true;
        caller.scanTweets(function (d, c) {
            done = done && d;
            caller.scanRetweets(function (d, c) {
                done = done && d;
                caller.scanRetweetIds(function (d, c) {
                    done = done && d;
                    caller.scanUsers(function (d, c) {
                        done = done && d;
                        caller.save(function () {
                            cb(done);
                        });
                    });
                });
            });
        });
    };

};

var scanner = new Scanner();

var scanResult = function (done) {
    var o = twitter.getLowestApiLimit();
    var diff = 3000;
    if (done) {
        console.log('all done');
        return;
    } else if (o && (o.retry > 0)) {
        diff = twitter.getApiLimitDiff(o.retry);
        console.log('Pause: ' + moment(o.retry).format('HH:mm:ss') + ' (' + (diff / 1000).toFixed(2) + 's)' + ' for ApiLimit ' + o.url);
    } else {
        console.log('Restart');
    }
    setTimeout(function () {
        scanner.scan(scanResult);
    }, Math.max(1000, diff));
};

//if (fs.existsSync(config.datapath + 'cleaned.json')) {
//    tweets = JSON.parse(fs.readFileSync(config.datapath + 'cleaned.json', 'utf8'));
//    scanner.scan(scanResult);
//} else {
tokenizer.loadDayJsonFiles(config.datapath + 'import/cleaned/', function (cleaned) {
    tweets = cleaned;
    scanner.scan(scanResult);
});
//}
