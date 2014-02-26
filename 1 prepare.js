/*

 script to prepare the db/files and urls

 */

var fs = require('fs');
var tokenizer = require('./tweet_tokenizer.js').MyLittleTweetTokenizer();
var consts = require('./consts');
var config = require('./config');
var async = require('async');
var storeurls = {};

function getLongUrls(tweet) {
	var hasLongs = false;
	var longurls = {};
	var arr = tokenizer.extractLinks(tweet.text);
	for (var j = arr.length - 1; j >= 0; j--) {
		var url = arr[j];
		if (storeurls[url]) {
			longurls[url] = storeurls[url];
			hasLongs = true;
		}
	}
	return (hasLongs ? JSON.stringify(longurls) : null);
}

function transform(rawTweets) {
	var dupchecker = {};
	console.log('[Prepare] Transforming Tweets ' + rawTweets.length);
	var tweets = rawTweets.filter(function (tweet) {
		if ((!tweet.text) ||
			(!tweet.id_str) ||
			(!tweet.created_at) ||
			(!tweet.source) ||
			(!tweet.user.screen_name) ||
			(!tweet.user.profile_image_url)
			) {
			console.log('Invalid Tweet found --');
			console.log(tweet);
			console.log('--');
			return false;
		}
		if (dupchecker[tweet.id_str]) {
			console.log('Dup Tweet found --');
			console.log(tweet);
			console.log('--');
			return false;
		} else if (tweet.retweeted_status) {
			return false;
		} else {
			var text = tweet.text.substr(0, 3);
			if ((text === 'RT ') || (text === 'RT@') || (text === 'RT:'))
				return false;
		}
		dupchecker[tweet.id_str] = true;
		return true;
	});
	tweets = tweets.map(function (tweet) {
		var longurls = getLongUrls(tweet);
		return {
			id: tweet.id_str,
			created_at: new Date(tweet.created_at),
			source: tokenizer.getCleanedSourceClient(tweet.source),
			userimg: tweet.user.profile_image_url,
			user: tweet.user.screen_name,
			text: tweet.text,
			longurls: longurls
		}
	});
	console.log('[Prepare] Sorting Tweets ' + tweets.length);
	tweets.sort(function (a, b) {
		if (a.created_at > b.created_at)
			return 1;
		if (a.created_at < b.created_at)
			return -1;
		return 0;
	});
	return tweets;
}

function loadRaw(cb) {
	console.log('[Prepare] Load Raw Tweets');
	var filename = config.datapath() + 'messages.json';
	fs.exists(filename, function (exists) {
		var tweets;
		if (exists) {
			tweets = JSON.parse(fs.readFileSync(filename, 'utf8'));
		} else {
			tweets = [];
			console.log('well, you need a messages.json file, this will not work');
		}
		console.log('[Prepare] Raw Tweets loaded: ' + tweets.length);
		cb(tweets);
	});
}

function loadUrls(cb) {
	var filename = config.datapath() + 'urls.json';
	fs.exists(filename, function (exists) {
		if (exists) {
			storeurls = JSON.parse(fs.readFileSync(filename, 'utf8'));
		}
		cb();
	});
}

var
	storage = require('./tweets_couch').MyLittleTweets();
var
	defaultuser = 'admin',
	defaultpass = 'totalsupergehaim';

async.waterfall([
	function (callback) {
		loadUrls(callback);
	},
	function (callback) {
		storage.init(callback);
	},
	function (callback) {
		loadRaw(function (rawTweets) {
			callback(null, rawTweets);
		});
	},
	function (rawTweets, callback) {
		var tweets = transform(rawTweets);
		storage.prepare(tweets, defaultuser, defaultpass, function () {
				callback(null);
			}
		);
	}
], function () {
	storage.deinit();
	console.log('[Prepare] all done.');
});