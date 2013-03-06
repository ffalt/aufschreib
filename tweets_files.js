var fs = require('fs');
var consts = require('./consts');

exports.MyLittleTweets = function () {
	var me = this;
	var list = JSON.parse(fs.readFileSync('./data/tweetstore.json', 'utf8'));
	console.log('[Files] Tweets loaded');

	function Tweet() {
		this.id = 0;
		this.created_at = '';
		this.source = '';
		this.text = '';
		this.user = '';
		this.userimg = '';
		this.longurls = null;
	}

	var usersdata = {};

	function Userdata() {
		this.machine = {};
		this.human = {};
	}

	function getUserData(voteuserid) {
		return usersdata['_' + voteuserid];
	}

	function loadData(filename, callback) {
		fs.exists(filename, function (exists) {
			if (exists) {
				fs.readFile(filename, function (err, data) {
					callback(JSON.parse(data));
				});
			} else {
				callback();
			}
		});
	}

	function matches(userdata, tweet, filter, search) {
		var hcat = 'human_' + (userdata.human[tweet.id] || consts.unknown);
		var mcat = 'machine_' + (userdata.machine[tweet.id] || consts.unknown);
		if ((filter.indexOf(hcat) !== -1) && (filter.indexOf(mcat) !== -1)) {
			if (search) {
				return ((!search) || (tweet.text.indexOf(search) >= 0) || ((tweet.longurls) && (tweet.longurls.indexOf(search) >= 0)  ) );
			} else
				return true;
		}
		return false;
	}

	function cloneObject(obj) {
		// TODO; read the fucking manual how to clone objects in js ^^
		var clone = {};
		for (var i in obj) {
			if (typeof(obj[i]) == "object")
				clone[i] = cloneObject(obj[i]);
			else
				clone[i] = obj[i];
		}
		return clone;
	}

	function prepareVoteUserTweet(userdata, tweet) {
		var newtweet = new Tweet();
		newtweet.id = tweet.id;
		newtweet.created_at = new Date(tweet.created_at);
		newtweet.source = tweet.source;
		newtweet.text = tweet.text;
		newtweet.user = tweet.user;
		newtweet.userimg = tweet.userimg;
		newtweet.longurls = tweet.longurls;
		newtweet.human = (userdata.human[tweet.id] || consts.unknown);
		newtweet.machine = (userdata.machine[tweet.id] || consts.unknown);
		return newtweet;
	}

	function getMatchingUsersTweets(start, userdata, user, filter, search) {
		var result = [];
		var count = 0;
		for (var i = start; i < list.length; i++) {
			var tweet = list[i];
			if (tweet.user == user) {
				count++;
				if (matches(userdata, tweet, filter, search)) {
					result.push(prepareVoteUserTweet(userdata, tweet));
				}
			}
		}
		return {tweets: result, count: count};
	}

	function reportPackage(index, packages, last, callback) {
		if (index >= packages.length) {
			//console.log('last ' + last);
			callback(null, last);
		} else {
			callback(packages[index].tweets, packages[index].count, function () {
				reportPackage(index + 1, packages, last, callback);
			})
		}
	}

	function getTweetByID(id) {
		for (var i = 0; i < list.length; i++) {
			if (list[i].id === id)
				return list[i];
		}
		return null;
	}

	function saveMachine(voteuserid, userdata, callback) {
		fs.writeFile('./data/users/' + voteuserid + '-tweets-bayes.json', JSON.stringify(userdata.machine, null, '\t'), 'utf8', function (err) {
			if (err) {
				console.log('[Files] Machine Opinion could not be written');
			} else {
				console.log('[Files] Machine Opinion stored');
			}
			callback();
		});
	}

	function saveHuman(voteuserid, userdata, callback) {
		fs.writeFile('./data/users/' + voteuserid + '-tweets-human.json', JSON.stringify(userdata.human, null, '\t'), 'utf8', function (err) {
			if (err) {
				console.log('[Files] Human Opinion could not be written');
			} else {
				console.log('[Files] Human Opinion stored');
			}
			callback();
		});
	}

	function getTweetsByIDs(ids) {
		return list.filter(function (tweet) {
			return ids.indexOf(tweet.id) >= 0;
		});
	}

	me.initUser = function (user, callback) {
		var userdata = new Userdata();
		loadData('./data/users/' + user.id + '-tweets-human.json', function (data) {
			userdata.human = (data || {});
			loadData('./data/users/' + user.id + '-tweets-bayes.json', function (data2) {
				userdata.machine = (data2 || {});
				usersdata['_' + user.id] = userdata;
				console.log('[Files] User loaded');
				callback();
			});
		});
	};

	me.setHumanCat = function (voteuserid, tweetid, value, callback) {
		var tweet = getTweetByID(tweetid);
		var userdata = getUserData(voteuserid);
		userdata.human[tweet.id] = value;
		saveHuman(voteuserid, userdata, function () {
			callback(prepareVoteUserTweet(userdata, tweet));
		});
	};

	me.getUserPackages = function (voteuserid, start, filter, search, maxtweets, callback) {
		var userdata = getUserData(voteuserid);
		start = (start || 0);
		//console.log('start ' + start);
		var written = 0,
			checkedusers = [];
		var packages = [];
		var last = null;
		for (var i = start; i < list.length; i++) {
			if (written > maxtweets) {
				last = i;
				break;
			} else {
				var tweet = list[i];
				if ((!checkedusers[tweet.user]) && (matches(userdata, tweet, filter, search))) {
					checkedusers[tweet.user] = true;
					var pack = getMatchingUsersTweets(i, userdata, tweet.user, filter, search);
					written += pack.tweets.length;
					packages.push(pack);
				}
			}
		}
		reportPackage(0, packages, last, callback);
	};

	me.getUserPackage = function (voteuserid, user, callback) {
		var result = [];
		var userdata = getUserData(voteuserid);
		list.forEach(function (tweet) {
			if (tweet.user === user)
				result.push(prepareVoteUserTweet(userdata, tweet));
		});
		callback(result);
	};

	me.setHumanCatByIds = function (voteuserid, tweetids, value, callback) {
		var result = [];
		var userdata = getUserData(voteuserid);
		var tweets = getTweetsByIDs(tweetids);
		tweets.forEach(function (tweet) {
			userdata.human[tweet.id] = value;
			result.push(prepareVoteUserTweet(userdata, tweet));
		});
		saveHuman(voteuserid, userdata, function () {
			callback(result);
		});
	};

	me.setMachineCats = function (voteuserid, votesarray, callback) {
		var userdata = getUserData(voteuserid);
		votesarray.forEach(function (entry) {
			userdata.machine[entry.id] = entry.machine;
		});
		saveMachine(voteuserid, userdata, function () {
			callback();
		})
	};

	me.enumerateTweetsAndCats = function (voteuserid, callback) {
		var userdata = getUserData(voteuserid);
		list.forEach(function (tweet) {
			callback(prepareVoteUserTweet(userdata, tweet));
		});
		callback(null);
	};

	me.getCountsByCat = function (voteuserid, mode, callback) {
		var userdata = getUserData(voteuserid);
		var stat = [];
		consts.cats.forEach(function (cat) {
			stat[cat.id] = 0;
		});
		list.forEach(function (tweet) {
			var cat = (userdata[mode][tweet.id] || consts.unknown);
			stat[cat] += 1;
		});
		callback(stat);
	};

	me.getCats = function (voteuserid, mode, callback) {
		var userdata = getUserData(voteuserid);
		callback(userdata[mode]);
	};

	return me;
};
