var fs = require('fs');
var utils = require('./../lib/utils.js').Utils();
var resolver = require("resolver");
var async = require("async");
var config = require('./../config.js');
var request = require('request');
var storeurls = {};

function loadRawTweets(cb) {
    console.log('Load Raw Tweets');
    utils.loadDayJsonFiles(config.datapath + 'tweets/', function (tweets) {
        console.log('[Prepare] Raw Tweets loaded: ' + tweets.length);
        cb(tweets);
    });
}


function resolveWithResolve(url, cb) {
    resolver.resolve(url, function (err, longurl, filename, contentType) {
        cb(err, longurl);
    });
}

function resolveWithExpandURL(url, cb) {
    request(
        {url: 'http://expandurl.me/expand?url=' + encodeURI(url), json: true}
        , function (error, response, body) {
            if (!error && (response.statusCode == 200) && (body) && /*(body.status == 'OK') &&*/ (body.end_url)) {
                //console.log(body);
                cb(null, body.end_url);
            } else {
                console.log(body);
                console.log(error);
                cb(error || response.statusCode);
            }
        });
}

function validShortUrl(url, longurl) {
    return (longurl && (longurl.length) && (url !== longurl));
}

function resolve(url, cb) {
    resolveWithResolve(url, function (err, longurl) {
        if (!validShortUrl(url, longurl)) {
            resolveWithExpandURL(url, cb);
        } else {
            cb(err, longurl);
        }
    });
}


function longifyUrls(tweets, cb) {
    var links = {};
    var unresolvedlinks = [];

    function collect() {
        console.log('Extracting Links');
        for (var i = tweets.length - 1; i >= 0; i--) {
            var tweet = tweets[i];
            var arr = utils.extractLinks(tweet.text);
            for (var j = arr.length - 1; j >= 0; j--) {
                var url = arr[j];
                var oldurl = storeurls[url];
                if ((!oldurl)
//                    || (oldurl.indexOf('http://bit.ly/') == 0)
//                    || (oldurl.indexOf('http://via.me/') == 0)
                    ) {
                    if (unresolvedlinks.indexOf(url) < 0)
                        unresolvedlinks.push(url);
                } else {
                    links[url] = storeurls[url];
                }
            }
            if ((tweet.entities) && (tweet.entities.urls)) {
                tweet.entities.urls.forEach(function (url) {
                    if (!storeurls[url.url]) {
                        links[url.url] = url.expanded_url;
                    }
                });
            }
        }
    }

    collect();
    var count = 0;

    var q = async.queue(function (url, callback) {
        resolve(url, function (err, longurl) {
            count++;
            if (validShortUrl(url, longurl)) {
                console.log(count + '/' + unresolvedlinks.length + ' resolved ' + url + ' ' + longurl);
                links[url] = longurl;
                if (count % 100 == 0) {
                    saveUrls(links);
                }
                callback();
            } else {
                console.log(count + '/' + unresolvedlinks.length + ' NOT resolved ' + url, err);
                if (err) {
                    cb(links);
                } else {
                    links[url] = url; //do not check again
                    callback();
                }
            }
        });

    }, 1);
    q.drain = function () {
        cb(links);
    };
    q.push(unresolvedlinks);
}

function saveUrls(links) {
    console.log('Saving Links');
    fs.writeFileSync(config.datapath + 'urls.json', JSON.stringify(links, null, '\t'), 'utf8');
}

function loadUrls(cb) {
    var filename = config.datapath + 'urls.json';
    fs.exists(filename, function (exists) {
        if (exists) {
            storeurls = JSON.parse(fs.readFileSync(filename, 'utf8'));
        }
        cb();
    });
}

loadUrls(function () {
    loadRawTweets(function (rawTweets) {
        longifyUrls(rawTweets, function (links) {
            saveUrls(links);
        });
    });
});
