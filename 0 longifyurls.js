var fs = require('fs');
var tokenizer = require('./tweet_tokenizer.js').MyLittleTweetTokenizer();
var fetchUrl = require("fetch").fetchUrl;
var resolver = require("resolver");
var storeurls = {};

function loadRawTweets(cb) {
	console.log('Load Raw Tweets');
	var filename = './data/messages.json';
	fs.exists(filename, function (exists) {
		var tweets;
		if (exists) {
			tweets = JSON.parse(fs.readFileSync(filename, 'utf8'));
		} else {
			tweets = [];
			console.log('well, you need a messages.json file, this will not work');
		}
		cb(tweets);
	});
}

function isShortUrlSupported(url) {
	var shorts = ['bit.ly',
		'cli.gs', 'digg.com', 'fb.me', 'is.gd', 'j.mp', 'kl.am', 'su.pr', 't.co', 'tinyurl.com', 'goo.gl', '307.to',
		'adjix.com', 'b23.ru', 'bacn.me', 'bloat.me', 'budurl.com', 'clipurl.us', 'cort.as',
		'dFL8.me', 'dwarfurl.com', 'ff.im', 'fff.to', 'href.in', 'idek.net', 'korta.nu', 'lin.cr',
		'livesi.de', 'ln-s.net', 'loopt.us', 'lost.in', 'memurl.com', 'merky.de',
		'migre.me', 'moourl.com', 'nanourl.se', 'om.ly', 'ow.ly', 'peaurl.com', 'ping.fm',
		'piurl.com', 'plurl.me', 'pnt.me', 'poprl.com', 'post.ly', 'rde.me', 'reallytinyurl.com', 'redir.ec',
		'retwt.me', 'rubyurl.com', 'short.ie', 'short.to', 'smallr.com', 'sn.im',
		'sn.vc', 'snipr.com',
		'snipurl.com', 'snurl.com', 'tiny.cc', 'tinysong.com', 'togoto.us', 'tr.im', 'tra.kz',
		'trg.li', 'twurl.cc', 'twurl.nl', 'u.mavrev.com',
		'u.nu', 'ur1.ca', 'url.az', 'url.ie', 'urlx.ie', 'w34.us',
		'xrl.us', 'yep.it', 'zi.ma', 'zurl.ws', 'chilp.it', 'notlong.com',
		'qlnk.net', 'trim.li', 'url4.eu'];
	for (var i = 0; i < shorts.length; i++) {
		if (url.indexOf('http://' + shorts[i]) === 0) {
			return true;
		}
	}
	return false;
}

function isShortUrlSupportedExt(url) {
	var result = isShortUrlSupported(url);
	if (!result) {
		result =
			(url.indexOf('http://wp.me/') === 0) ||
				(url.indexOf('http://buff.ly/') === 0) ||
				(url.indexOf('http://spon.de/') === 0) ||
				(url.indexOf('http://snkyt.me/') === 0) ||
				(url.indexOf('http://po.st/') === 0) ||
				(url.indexOf('http://hdz.li/') === 0) ||
				(url.indexOf('http://youtu.be/') === 0) ||
				(url.indexOf('http://gu.com/') === 0) ||
				(url.indexOf('http://on.fb.me/') === 0) ||
				(url.indexOf('http://pocket.co/') === 0) ||
				(url.indexOf('http://flip.it/') === 0) ||
				(url.indexOf('http://ku-rz.de/') === 0) ||
//				(url.indexOf('') === 0) ||
//				(url.indexOf('') === 0) ||
			(url.indexOf('http://dlvr.it/') === 0) ||
			(url.indexOf('http://tl.gd/') === 0) ||
			(url.indexOf('http://shar.es/') === 0)
		;
	}
	return result;
}

function saveUrls(links) {
	console.log('Saving Links');
	fs.writeFileSync('./data/urls.json', JSON.stringify(links, null, '\t'), 'utf8');
//	var urlsonly = [];
//	for (var key in links) {
//		if (links.hasOwnProperty(key)) {
//			urlsonly.push(links[key]);
//		}
//	}
//	fs.writeFileSync('./data/urls_end.json', urlsonly.join("\n"), 'utf8');
}

function longifyUrls(tweets) {
	var links = {};
	var unresolvedlinks = [];

	function collect() {
		console.log('Extracting Links');
		for (var i = tweets.length - 1; i >= 0; i--) {
			var tweet = tweets[i];
			var arr = tokenizer.extractLinks(tweet.text);
			for (var j = arr.length - 1; j >= 0; j--) {
				var url = arr[j];
				if (!storeurls[url]) {
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

	function resolveEvenDeeper(resolvedeeperlinks, totalcount) {
		if (resolvedeeperlinks.length === 0) {
			saveUrls(links);
		} else {
			var resolve = resolvedeeperlinks.pop();
			resolver.resolve(resolve.short, function (error, resolved) {
				if ((error) || (resolved === resolve.short)) {
					console.log((totalcount - resolvedeeperlinks.length) + '/' + totalcount + ' could not even deeper resolve ' + resolve.short + ' - ' + error);
				} else {
					links[resolve.org] = resolved;
					console.log((totalcount - resolvedeeperlinks.length) + '/' + totalcount + ' resolved even deeper ' + resolve.org + ' -> ' + resolve.short + ' -> ' + resolved);
				}
				resolveEvenDeeper(resolvedeeperlinks, totalcount);
			});
		}
	}

	function resolveDeeper(resolvedeeperlinks, sucessfullyresolved, totalcount) {
		if (resolvedeeperlinks.length === 0) {

			for (var key in links) {
				if (links.hasOwnProperty(key) && isShortUrlSupportedExt(links[key])) {
					resolvedeeperlinks.push({org: key, short: links[key]});
				}
			}
			resolveEvenDeeper(resolvedeeperlinks, resolvedeeperlinks.length);

		} else {
			var resolve = resolvedeeperlinks.pop();
			if (sucessfullyresolved[resolve.short]) {
				links[resolve.org] = sucessfullyresolved[resolve.short];
				resolveDeeper(resolvedeeperlinks, sucessfullyresolved, totalcount);
			} else {
				fetchUrl("http://www.longurlplease.com/api/v1.1?q=" + resolve.short, function (error, meta, body) {
					if (error) {
						console.log((totalcount - resolvedeeperlinks.length) + '/' + totalcount + ' could not deeper resolve ' + resolve.short + ' - ' + error);
					} else {
						var resolved = JSON.parse(body.toString());
						if ((resolved) && (resolved[resolve.short])) {
							var result = resolved[resolve.short];
							links[resolve.org] = result;
							sucessfullyresolved[resolve.short] = result;
							console.log((totalcount - resolvedeeperlinks.length) + '/' + totalcount + ' resolved deeper ' + resolve.org + ' -> ' + resolve.short + ' -> ' + result);
							if (isShortUrlSupported(result)) {
								resolve.short = result;
								resolvedeeperlinks.push(resolve); //longifyception!!1!
							}
						}
						else {
							console.log((totalcount - resolvedeeperlinks.length) + '/' + totalcount + ' empty answer for deeper resolve ' + resolve.short);
						}
					}
					resolveDeeper(resolvedeeperlinks, sucessfullyresolved, totalcount);
				});
			}
		}
	}

	function resolve(index) {
		if (index >= unresolvedlinks.length) {
			var resolvedeeperlinks = [];
			for (var key in links) {
				if (links.hasOwnProperty(key) && isShortUrlSupported(links[key])) {
					resolvedeeperlinks.push({org: key, short: links[key]});
				}
			}
			resolveDeeper(resolvedeeperlinks, {}, resolvedeeperlinks.length);
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
						console.log(index + 1 + '/' + unresolvedlinks.length + ' empty answer for ' + link);
				}
				resolve(index + 1);
			});
		}
	}

	collect();
	resolve(0);
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
	loadRawTweets(function (rawTweets) {
		longifyUrls(rawTweets);
	});
});
