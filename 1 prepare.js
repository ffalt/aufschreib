/*

 script to prepare the db/files and urls

 */

var longifylinks = false;
var reparse = true;
var fs = require('fs');
var tweets = [];
var tokenizer = require('./tweet_tokenizer.js').MyLittleTweetTokenizer();
var consts = require('./consts');
var storeurls = {};

function getLongUrls(text) {
	var arr = tokenizer.extractLinks(text);
	var longurls = {};
	var count = 0;
	for (var j = arr.length - 1; j >= 0; j--) {
		var url = arr[j];
		if (storeurls[url]) {
			longurls[url] = storeurls[url];
			count++;
		}
	}
	if (count > 0)
		return JSON.stringify(longurls);
	else
		return null;
}

function dbinsert(cb) {
	var dbstore = require('./tweets_mysql').MyLittleTweets();

	console.log('[DB] Preparing Tweets');
	var dbtweets = [];
	tweets.forEach(function (tweet) {
		dbtweets.push({
			id: tweet.id,
			created_at: new Date(tweet.created_at),
			source: tweet.source,
			text: tweet.text,
			user: tweet.user,
			userimg: tweet.userimg,
			longurls: (typeof(tweet.longurls) == 'string' ? tweet.longurls : JSON.stringify(tweet.longurls))
		});
	});

	console.log('[DB] Creating Tables');
	dbstore.createTables(function () {
		console.log('[DB] Pumping Tweets to DB');
		dbstore.storeNewTweets(dbtweets, function () {
			console.log('[DB] Tweets stored');
			dbstore.closePool();
			cb();
		});
	});
}

function transform() {
	var maxlongurl = 0;

	console.log('Transforming Tweets ' + tweets.length);
	for (var i = tweets.length - 1; i >= 0; i--) {
		var tweet = tweets[i];
		var text = tweet.text;
		var skip = true;
		if ((text.substr(0, 3) !== 'RT ') &&
			(text.substr(0, 3) !== 'RT@') &&
			(text.substr(0, 4) !== 'RT:@') &&
			(text.substr(0, 4) !== 'RT: ')) {
			skip = false;
		}
		if (!skip) {
			for (var j = i - 1; j >= 0; j--) {
				if (tweets[i].id === tweets[j].id) {
					skip = true;
					break; //j
				}
			}
		}
		if (skip) {
			tweets.splice(i, 1);
		} else {
			tweet.created_at = new Date(tweet.created_at);
			tweet.source = tokenizer.getCleanedSourceClient(tweet.source);
			tweet.userimg = tweet.user.profile_image_url;
			tweet.user = tweet.user.screen_name;

			var longy = getLongUrls(tweet.text);
			if (longy)
				maxlongurl = Math.max(maxlongurl, longy.length);
			tweet.longurls = longy;

		}
	}
	console.log('Info: LongUrls Field must be ' + maxlongurl + 'long');

	console.log('Sorting Tweets ' + tweets.length);
	tweets.sort(function (a, b) {
		if (a.created_at > b.created_at)
			return 1;
		if (a.created_at < b.created_at)
			return -1;
		return 0;
	});
}

function saveStore() {
	console.log('Saving Tweets ' + tweets.length);
	fs.writeFileSync('./data/tweetstore.json', JSON.stringify(tweets, null, '\t'), 'utf8');
	console.log('Tweets saved: ' + tweets.length);
}

function loadRaw(callback) {
	console.log('Load Raw Tweets');
	var filename = './data/messages.json';
	fs.exists(filename, function (exists) {
		if (exists) {
			tweets = JSON.parse(fs.readFileSync(filename, 'utf8'));
		} else {
			console.log('well, you need a messages.json file, this will not work');
		}
		console.log('Raw Tweets loaded: ' + tweets.length);
		callback();
	});
}

function loadStore(callback) {
	console.log('Load Tweets Store');
	var filename = './data/tweetstore.json';
	fs.exists(filename, function (exists) {
		if (exists) {
			tweets = JSON.parse(fs.readFileSync(filename, 'utf8'));
		} else {
			console.log('well, you need to reparse and create tweetstore.json');
		}
		callback();
		console.log('Store Tweets loaded: ' + tweets.length);
	});
}

function savelinks() {
	var links = {};
	var unresolvedlinks = [];
	console.log('Extracting Links');
	for (var i = tweets.length - 1; i >= 0; i--) {
		var tweet = tweets[i];
		var arr = tokenizer.extractLinks(tweet.text);
		for (var j = arr.length - 1; j >= 0; j--) {
			var url = arr[j];
			if (!storeurls[url]) {
				unresolvedlinks.push(url);
			} else {
				links[url] = storeurls[url];
			}
		}
	}
	var fetchUrl = require("fetch").fetchUrl;
	var resolver = require("resolver");

	function resolveEvenDeeper(index) {
		var keys = Object.keys(links);
		if (index >= keys.length) {
			console.log('Saving Links');
			fs.writeFileSync('./data/urls.json', JSON.stringify(links, null, '\t'), 'utf8');
		} else {
			var org = keys[index];
			var link = links[org];
			if (
				(link.indexOf('http://gd.is/') === 0) ||
					(link.indexOf('http://tinyurl.com/') === 0) ||
					(link.indexOf('http://is.gd/') === 0) ||
					(link.indexOf('http://nyti.ms/') === 0) ||
					(link.indexOf('http://fb.me/') === 0)
				) {
				resolver.resolve(link, function (error, resolved) {
					if (error) {
						console.log(index + 1 + '/' + keys.length + ' could not even deeper resolve ' + link + ' - ' + error);
					} else {
						links[org] = resolved[link];
						console.log(index + 1 + '/' + keys.length + ' resolved ' + org + ' -> ' + link + ' -> ' + resolved[link]);
					}
					resolveEvenDeeper(index + 1);
				});
			} else
				resolveEvenDeeper(index + 1);
		}
	}

	function resolveDeeper(index) {
		var keys = Object.keys(links);
		if (index >= keys.length) {
			resolveEvenDeeper(0);
		} else {
			var org = keys[index];
			var link = links[org];
			if (
				(link.indexOf('http://bit.ly/') === 0) ||
					(link.indexOf('http://tinyurl.com/') === 0) ||
					(link.indexOf('http://goo.gl/') === 0) ||
					(link.indexOf('http://fb.me/') === 0)
				) {
				fetchUrl("http://www.longurlplease.com/api/v1.1?q=" + link, function (error, meta, body) {
					if (error) {
						console.log(index + 1 + '/' + keys.length + ' could not deeper resolve ' + link + ' - ' + error);
					} else {
						var resolved = JSON.parse(body.toString());
						if ((resolved) && (resolved[link])) {
							links[org] = resolved[link];
							console.log(index + 1 + '/' + keys.length + ' resolved ' + org + ' -> ' + link + ' -> ' + resolved[link]);
						}
						else
							console.log(index + 1 + '/' + keys.length + ' could not deeper resolve ' + link);
					}
					resolveDeeper(index + 1);
				});
			} else
				resolveDeeper(index + 1);
		}
	}

	function resolve(index) {
		if (index >= unresolvedlinks.length) {
			resolveDeeper(0);
		} else {
			var link = unresolvedlinks[index];
			fetchUrl("http://www.longurlplease.com/api/v1.1?q=" + link, function (error, meta, body) {
				if (error) {
					console.log(index + 1 + '/' + unresolvedlinks.length + ' could not resolve ' + link + ' - ' + error);
				} else {
					var resolved = JSON.parse(body.toString());
					if ((resolved) && (resolved[link])) {
						links[link] = resolved[link];
						console.log(index + 1 + '/' + unresolvedlinks.length + ' resolved ' + link + ' ' + resolved[link]);
					}
					else
						console.log(index + 1 + '/' + unresolvedlinks.length + ' could not resolve ' + link);
				}
				resolve(index + 1);
			});
		}
	}

	resolve(0);
}

function loadUrls(callback) {
	var filename = './data/urls.json';
	fs.exists(filename, function (exists) {
		if (exists) {
			storeurls = JSON.parse(fs.readFileSync(filename, 'utf8'));
		}
		callback();
	});
}

function processTweets() {
	if (longifylinks) {
		savelinks();
	}
	if (consts.usedb) {
		dbinsert();
	}
}

loadUrls(function () {
	if (reparse) {
		loadRaw(function () {
			transform();
			saveStore();
			processTweets();
		});
	} else {
		loadStore(function () {
			processTweets();
		});
	}
});
