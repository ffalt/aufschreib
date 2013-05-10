/*

 Storage for tweets & user-vites in a mongodb

 */

var consts = require('./consts');
var config = require('./config');
var async = require('async');

exports.MyLittleTweets = function () {
	var me = this;
	var tweetcollection;
	var votescollection;
	var userscollection;
	var mongodb;

	var generate_mongo_url = function (obj) {
		obj.hostname = (obj.hostname || 'localhost');
		obj.port = (obj.port || 27017);
		obj.db = (obj.db || 'test');
		if (obj.username && obj.password) {
			return "mongodb://" + obj.username + ":" + obj.password + "@" + obj.hostname + ":" + obj.port + "/" + obj.db;
		}
		else {
			return "mongodb://" + obj.hostname + ":" + obj.port + "/" + obj.db;
		}
	};

	var mongourl = generate_mongo_url(config.mongo_settings);
	var MongoClient = require('mongodb').MongoClient;

	me.init = function (cb) {
		console.log('[MongoDB] Connecting to DB');
		MongoClient.connect(mongourl, function (err, db) {
			if (!err) {
				console.log("[MongoDB] we are connected");
				mongodb = db;
				tweetcollection = db.collection('tweets');
				tweetcollection.ensureIndex({ "id": 1 }, { unique: true }, function (err) {
					if (err)
						throw err;
				});
				votescollection = db.collection('votes');
				votescollection.ensureIndex({ "tweetid": 1 }, function (err) {
					if (err)
						throw err;
					votescollection.ensureIndex({ "voteuserid": 1 }, function (err) {
						if (err)
							throw err;
					});
				});
				userscollection = db.collection('users');
				cb();
			} else {
				console.log("[MongoDB] we are NOT connected: " + err);
				cb(err);
			}
		});
	};

	me.clearAll = function (cb) {
		me.init(function () {
			votescollection.remove(function () {
				userscollection.remove(function () {
					tweetcollection.remove(function () {
						cb();
					});
				});
			});
		})
	};


	me.initUser = function (user, callback) {
		callback();
	};

	me.setHumanCat = function (voteuserid, tweetid, value, cb) {
		votescollection.update({voteuserid: voteuserid, tweetid: tweetid}, {$set: {human: value}}, cb);
	};

	me.setHumanCats = function (voteuserid, tweetids, value, cb) {
		votescollection.update({voteuserid: voteuserid, tweetid: { $in: tweetids }}, {$set: {human: value}}, {multi: true}, cb);
	};

	me.setMachineCats = function (voteuserid, votesarray, cb) {
		var count = 0;
		var q = async.queue(function (tweet, callback) {
			votescollection.update({voteuserid: voteuserid, tweetid: tweet.id}, {$set: {machine: tweet.machine}}, function (err) {
					if (err)
						console.log("[MongoDB] Error on saving votes " + err);
					count++;
					callback();
				}
			);
		}, 3);
		q.drain = function () {
			cb();
		};
		if (votesarray.length === 0) {
			cb();
		} else {
			q.push(votesarray);
		}
	};

	me.importHumanCats = function (voteuserid, votes, cb) {
		var q = async.queue(function (entry, callback) {
			votescollection.update({voteuserid: voteuserid, tweetid: entry.id}, {$set: {human: entry.human}}, function (err) {
					if (err)
						console.log("[MongoDB] Error on saving vote " + entry.id + " " + err);
					callback();
				}
			);
		}, 3);
		q.drain = function () {
			cb();
		};
		var founddata = false;
		for (var key in votes) {
			if (votes.hasOwnProperty(key) && (votes[key] !== consts.unknown)) {
				//console.log('Importing2 ' + key + ' = ' + votes[key]);
				q.push({id: key, human: votes[key]});
				founddata = true;
			}
		}
		if (!founddata)
			cb();
	};

	function loadUserTweets(votes, cb) {
		var ids = votes.map(function (vote) {
			return vote.tweetid
		});
		tweetcollection.find({id: {$in: ids}}).toArray(function (err, entries) {
			if (err) {
				throw err;
			} else {
				for (var i = 0; i < entries.length; i++) {
					var index = ids.indexOf(entries[i].id);
					entries[i].human = votes[index].human;
					entries[i].machine = votes[index].machine;
				}
				cb(entries);
			}
		});
	}

	function prepareSearch(search, cb) {
		/* there is no stable full text search in mongodb right now.
		 * so, well, this.
		 */
		if (!search) {
			cb()
		} else {
			console.log('[MongoDB] Searching Text');
			tweetcollection.find({}, function (err, cursor) {
				var ids = [];
				cursor.each(function (err, tweet) {
						if (!tweet) {
							console.log('[MongoDB] Found Tweets: ' + ids.length);
							cb(ids)
						} else if ((tweet.text.indexOf(search) >= 0) ||
							((tweet.longurls) && (tweet.longurls.indexOf(search) >= 0))) {
							ids.push(tweet.id);
						}
					}
				);
			});
		}
	}

	me.getUserPackages = function (voteuserid, start, filter, search, maxtweets, callback) {
		var humanfilter = [];
		var machinefilter = [];
		filter = filter.split(',');
		filter.forEach(function (cat) {
			if (cat.indexOf('human_') === 0) {
				humanfilter.push(cat.substring(6));
			} else if (cat.indexOf('machine_') === 0) {
				machinefilter.push(cat.substring(8));
			}
		});
		var sendtweets = 0;
		prepareSearch(search, function (allowedids) {
			var query = {voteuserid: voteuserid,
				human: {$in: humanfilter},
				machine: {$in: machinefilter}
			};
			if (allowedids) {
				query.tweetid = {$in: allowedids};
			}
			votescollection.find(query).toArray(function (err, entries) {
				if (err) {
					throw err;
				} else {
					var doneusers = [];

					function processUsers(index) {
						if (index >= entries.length) {
							callback(null, null);
						} else if ((start) && (entries[index].tweetuser === start)) {
							start = null;
							processUsers(index);
						} else if (start) {
							processUsers(index + 1);
						} else if (sendtweets >= maxtweets) {
							callback(null, entries[index].tweetuser);
						} else if (doneusers.indexOf(entries[index].tweetuser) >= 0) {
							processUsers(index + 1);
						} else {
							var entry = entries[index];
							var votes = entries.filter(function (testentry) {
								return testentry.tweetuser === entry.tweetuser;
							});
							doneusers.push(entry.tweetuser);
							loadUserTweets(votes, function (usertweets) {
								votescollection.count({voteuserid: voteuserid, tweetuser: entry.tweetuser}, function (err, count) {
									callback(usertweets, count, function () {
										sendtweets += usertweets.length;
										processUsers(index + 1);
									})
								});
							});
						}
					}

					processUsers(0);

				}
			});
		});
	};

	me.getUserPackage = function (voteuserid, user, callback) {
		votescollection.find({voteuserid: voteuserid, tweetuser: user},
			function (err, cursor) {
				if (err) {
					throw err;
				} else {
					cursor.toArray(function (err, votes) {
						loadUserTweets(votes, callback);
					});
				}
			});
	};

	function storeTweets(newtweets, cb) {
		console.log('[MongoDB] Inserting Tweets');
		var q = async.queue(function (tweet, callback) {
			tweetcollection.insert(tweet, {safe: true}, function (err) {
				if (err)
					console.log('[MongoDB] Error saving ' + tweet.id + ' ' + err);
				callback();
			});
		}, 2);
		q.drain = function () {
			console.log('[MongoDB] Tweets stored');
			cb();
		};
		if (newtweets.length === 0) {
			cb();
		} else {
			q.push(newtweets);
		}
	}

	me.prepareUser = function (username, password, cb) {
		createUser(username, password, function (user) {

			tweetcollection.find({}, function (err, cursor) {

				function saveTweetObj(tweet) {
					if (!tweet) {
						cb(user);
					} else {
						votescollection.save(
							{voteuserid: user.id,
								tweetid: tweet.id,
								tweetuser: tweet.user,
								human: consts.unknown,
								machine: consts.unknown
							}, function (err) {
								if (err) {
									throw err;
								}
								cursor.nextObject(function (err, item) {
									saveTweetObj(item);
								});
							});
					}
				}

				cursor.nextObject(function (err, item) {
					saveTweetObj(item);
				});

			});


		});
	};

	function updateUserVotes(voteuserid, newtweets, cb) {
		votescollection.find({voteuserid: voteuserid}).toArray(function (err, votes) {
			var votesids = votes.map(function (vote) {
				return vote.tweetid;
			});
			newtweets = newtweets.filter(function (tweet) {
				return votesids.indexOf(tweet.id) < 0;
			});
			if (newtweets.length === 0) {
				console.log('[MongoDB] Votes for User #' + voteuserid + ' are already fine');
				cb();
			} else {
				var q = async.queue(function (tweet, callback) {
					votescollection.save(
						{voteuserid: voteuserid,
							tweetid: tweet.id,
							tweetuser: tweet.user,
							human: consts.unknown,
							machine: consts.unknown
						}, callback);
				}, 2);
				q.drain = function () {
					console.log('[MongoDB] Votes for User #' + voteuserid + ' updated');
					cb();
				};
				if (newtweets.length === 0) {
					cb();
				} else {
					q.push(newtweets);
				}
			}
		});
	}

	function updateUsersVotes(newtweets, cb) {
		userscollection.find({}).toArray(function (err, users) {
			var q = async.queue(function (user, callback) {
				console.log('[MongoDB] Update Votes for User #' + user.id);
				updateUserVotes(user.id, newtweets, callback);
			}, 2);
			q.drain = function () {
				console.log('[MongoDB] All User votes updated');
				cb();
			};
			if (users.length === 0) {
				cb();
			} else {
				q.push(users);
			}
		});
	}

	function getUnusedUserId(cb) {
		userscollection.find().toArray(function (err, users) {
			var newid = 1;
			users.forEach(function (user) {
				if (newid <= user.id)
					newid = user.id + 1;
			});
			cb(newid);
		});
	}

	function getUserByName(name, cb) {
		userscollection.findOne({name: name}, function (err, user) {
			cb(err, user);
		});
	}

	function getUserById(id, cb) {
		userscollection.findOne({id: id}, function (err, user) {
			cb(err, user);
		});
	}

	function createUser(name, password, cb) {
		getUnusedUserId(function (newid) {
			var user = {name: name, password: password, id: newid};
			userscollection.save(user, function (err) {
				if (err)
					throw err;
				cb(user);
			});
		});
	}

	function getOrCreateUser(name, password, cb) {
		getUserByName(name, function (err, user) {
			if (user) {
				cb(user);
			} else {
				createUser(name, password, cb);
			}
		});
	}

	me.findUserById = function (id, cb) {
		getUserById(id, cb);
	};

	me.findUserByName = function (username, cb) {
		getUserByName(username, cb);
	};

	me.prepare = function (newtweets, defaultuser, defaultpass, cb) {
		async.series([
			function (callback) {
				tweetcollection.remove(callback);
			},
			function (callback) {
				storeTweets(newtweets, callback);
			},
			function (callback) {
				console.log('[MongoDB] Ensure existence of default user');
				getOrCreateUser(defaultuser, defaultpass, function (user) {
					callback(null, user);
				});
			},
			function (callback) {
				console.log('[MongoDB] Update votes');
				updateUsersVotes(newtweets, callback);
			}
		], cb);
	};

	me.enumerateTweetsAndCats = function (voteuserid, callback) {
		votescollection.find({voteuserid: voteuserid}, function (err, cursor) {

			function loadTweetObj(vote, cursor) {
				if (!vote) {
					callback(null)
				} else {
					tweetcollection.findOne({id: vote.tweetid}, function (err, tweet) {
						tweet.human = vote.human;
						tweet.machine = vote.machine;
						callback(tweet);
						cursor.nextObject(function (err, item) {
							loadTweetObj(item, cursor);
						});
					});
				}
			}

			cursor.nextObject(function (err, item) {
				loadTweetObj(item, cursor);
			});

		});
	};

	me.getCountsByCat = function (voteuserid, mode, callback) {
		var stat = [];
		consts.cats.forEach(function (cat) {
			stat[cat.id] = 0;
		});
		votescollection.find({voteuserid: voteuserid}, function (err, cursor) {
			cursor.each(function (err, vote) {
				if (!vote) {
					callback(stat);
				} else {
					var cat = (vote[mode] || consts.unknown);
					stat[cat] += 1;
				}
			});
		});
	};

	me.getCats = function (voteuserid, mode, callback) {
		var cats = {};
		votescollection.find({voteuserid: voteuserid}, function (err, cursor) {
			cursor.each(function (err, vote) {
				if (!vote) {
					callback(cats);
				} else {
					cats[vote.tweetid] = (vote[mode] || consts.unknown);
				}
			});
		});
	};

	me.deinit = function () {
		mongodb.close();
	};

	return me;
}
;
