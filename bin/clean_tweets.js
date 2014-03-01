var fs = require('fs');
var OAuth = require('oauth').OAuth;
var config = require('./../config.js');

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
var ids = JSON.parse(fs.readFileSync(config.datapath + 'tweetids.json', 'utf8'));
var tweets = JSON.parse(fs.readFileSync(config.datapath + 'cleaned.json', 'utf8'));

var getApiCallCount = function (response) {
    if (response && (response.headers)) {
        if ((response.headers["x-rate-limit-remaining"]) && (response.headers["x-rate-limit-remaining"])) {
            var remain = parseInt(response.headers["x-rate-limit-remaining"], 10);
            var max = parseInt(response.headers["x-rate-limit-limit"], 10);
            return remain + '/' + max;
        }
    }
    return "";
};

var getApiLimitResetDiff = function (response) {
    if (response && (response.headers)) {
        if (response.headers["x-rate-limit-reset"]) {
            var time = parseInt(response.headers["x-rate-limit-reset"], 10) * 1000;
            var dest = new Date(time);
            var now = new Date();
            var diff = dest - now;
            return diff;
        }
    }
    return 0;
};

var getTweet = function (id, callback) {
    tweeter.get("https://api.twitter.com/1.1/statuses/show.json?id=" + id + '&trim_user=true&include_entities=true',  //url
        config.twitter_bot.token,   //oauth_token
        config.twitter_bot.secret, //oauth_token_secret
        function (error, data, response) {
            console.log('Api Call: ' + getApiCallCount(response) + ' statuses/statuses/show: ' + id);
            if (data) {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    error = e;
                }
            }
            if (error) {
                if ([403, 404].indexOf(error.statusCode) >= 0) {
                    callback({id_str: id, error: error});
                } else {
                    console.log(error);
                    var retry = getApiLimitResetDiff(response);
                    if (retry > 0) {
                        console.log('Pause: ' + (retry / 1000).toFixed(2) + 's' + ' for ApiLimit on https://api.twitter.com/1.1/statuses/show.json');
                        setTimeout(function () {
                            getTweet(id, callback);
                        }, retry);
                    } else {
                        console.log('Error: Something is wrong.\n' + JSON.stringify(error));
                        callback(null, JSON.stringify(error));
                    }
                }
            } else {
                callback(data);
            }
        });
};

var needsRetweetCheck = function (id, callback) {
    tweeter.get("https://api.twitter.com/1.1/statuses/retweets/" + id + ".json?count=100",  //url
        config.twitter_bot.token,   //oauth_token
        config.twitter_bot.secret, //oauth_token_secret
        function (error, data, response) {
            if ((!error) && (data)) {
                try {
                    data = JSON.parse(data);
                    if (data.length) {
                        data.forEach(function (tweet) {
                            var tweetids = {};
                            tweets.forEach(function (t) {
                                tweetids[t.id_str] = true;
                            });
                            if (!tweetids[tweet.id_str]) {
                                console.log('   New Tweet by Retweet Check: ' + tweet.id_str);
                                prepareCustomFields(tweet);
                                tweets.push(tweet);
                            }
                        });
                    }
                    callback((data.length > 0));
                    return;
                } catch (e) {
                }
            }
            callback(true);
        }
    );
};

var prepareCustomFields = function (tweet) {
    if (!tweet.retweet_ids)
        tweet.retweet_ids = [];
    tweet.timestamp = new Date().valueOf();
};

var getRetweetIdsCursor = function (id, cursor, list, callback) {
    tweeter.get("https://api.twitter.com/1.1/statuses/retweeters/ids.json?id=" + id + '&stringify_ids=true' + (cursor ? '&cursor=' + cursor : ''),  //url
        config.twitter_bot.token,   //oauth_token
        config.twitter_bot.secret, //oauth_token_secret
        function (error, data, response) {
            console.log('   Api Call: ' + getApiCallCount(response) + ' statuses/retweeters/ids: ' + id);
            if (data) {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    error = e;
                }
            }
            if (error) {
                if ([403, 404].indexOf(error.statusCode) >= 0) {
                    callback([]);
                } else {
                    var retry = getApiLimitResetDiff(response);
                    if (retry > 0) {
                        console.log('   Pause: ' + (retry / 1000).toFixed(2) + 's' + ' for ApiLimit on https://api.twitter.com/1.1/retweeters/ids.json');
                        setTimeout(function () {
                            getRetweetIdsCursor(id, cursor, list, callback);
                        }, retry);
                    } else {
                        console.log('Error: Something is wrong with retweeters.\n' + JSON.stringify(error));
                        callback(null, JSON.stringify(error));
                    }
                }
            } else {
                if (data.ids) {
                    list = list.concat(data.ids);
                }
                if (!data.next_cursor_str) {
                    return;
                }
                if (data.next_cursor_str != "0") {
                    getRetweetIdsCursor(id, data.next_cursor_str, list, callback);
                } else {
                    callback(list);
                }
            }
        });
};

var getRetweetIds = function (id, callback) {
    getRetweetIdsCursor(id, null, [], callback);
};

var getNext = function (callback) {
    var tweetids = {};
    tweets.forEach(function (t) {
        tweetids[t.id_str] = true;
    });
    var nextids = ids.filter(function (id) {
        return (!tweetids[id])
    });
    if (nextids.length) {
        getTweet(nextids[0], function (tweet, error) {
            if (tweet) {
                if (tweet.retweeted_status) {
                    tweet.retweet_ids = [];
                    callback(tweet);
                } else {
                    needsRetweetCheck(nextids[0], function (needscheck) {
                        console.log('  Check Retweets: ' + nextids[0] + ' = ' + needscheck);
                        if (!needscheck) {
                            tweet.retweet_ids = [];
                            callback(tweet);
                        } else {
                            getRetweetIds(nextids[0], function (ids, error) {
                                if (ids) {
                                    tweet.retweet_ids = ids;
                                    callback(tweet);
                                }
                            });
                        }
                    });
                }
            }
        });
    } else {
        callback(null);
    }
};

function saveLineJsonArray(filename, a) {
    var lines = a.map(function (t) {
        return (JSON.stringify(t));
    });
    fs.writeFileSync(filename, '[\n' + lines.join(',\n') + '\n]\n', 'utf8');
}

function tick(callback) {
    getNext(function (tweet) {
        if (tweet) {
            prepareCustomFields(tweet);
            tweets.push(tweet);
//            console.log(JSON.stringify(tweet));
            saveLineJsonArray(config.datapath + 'cleaned.json', tweets);
            callback(false);
        } else {
            console.log('all done <3');
            callback(true);
        }
    });
}

function startTick() {
    tick(function (done) {
        if (!done) {
            setTimeout(function () {
                startTick();
            }, 1 * 1000);
        }
    });
}

startTick();
