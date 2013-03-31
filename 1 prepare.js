/*

 script to prepare the db/files and urls

 */

var fs = require('fs');
var tokenizer = require('./tweet_tokenizer.js').MyLittleTweetTokenizer();
var consts = require('./consts');
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
		return {
			id: tweet.id_str,
			created_at: new Date(tweet.created_at),
			source: tokenizer.getCleanedSourceClient(tweet.source),
			userimg: tweet.user.profile_image_url,
			user: tweet.user.screen_name,
			text: tweet.text,
			longurls: getLongUrls(tweet)
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

function saveStore(tweets) {
	console.log('[Prepare] Saving Tweets ' + tweets.length);
	fs.writeFileSync('./data/tweetstore.json', JSON.stringify(tweets, null, '\t'), 'utf8');
	console.log('[Prepare] Tweets saved: ' + tweets.length);
}

function loadRaw(cb) {
	console.log('[Prepare] Load Raw Tweets');
	var filename = './data/messages.json';
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
	var filename = './data/urls.json';
	fs.exists(filename, function (exists) {
		if (exists) {
			storeurls = JSON.parse(fs.readFileSync(filename, 'utf8'));
		}
		cb();
	});
}

loadUrls(function () {
	loadRaw(function (rawTweets) {
		var tweets = transform(rawTweets);
		if (consts.usedb) {
			var dbstore = require('./tweets_mysql').MyLittleTweets();
			dbstore.prepare(tweets, function () {
					console.log('[Prepare] all done.');
				}
			);
		} else {
			saveStore(tweets);
			console.log('[Prepare] all done.');
		}
	});
});
