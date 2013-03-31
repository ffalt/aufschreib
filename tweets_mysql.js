/*

 Storage for tweets & user-vites in a mysql-db

 */

var mysql = require('mysql');
var consts = require('./consts');
var SqlString = require('mysql/lib/protocol/SqlString');

exports.MyLittleTweets = function () {
	var me = this;

	var dboptions = {
		host: 'localhost',
		user: 'aufschreib',
		password: 'secret',
		database: 'aufschreib',
		supportBigNumbers: true,
		debug: false,
		connectionLimit: 100
	};

	console.log('[DB] Connecting to DB');
	var pool = mysql.createPool(dboptions);

	function getConnection(cb) {
		pool.getConnection(function (err, connection) {
			if (err) {
				throw err;
			}
			connection.config.queryFormat = function (query, values) {
				if (!values) {
					return query;
				}
				if (query.indexOf('?') >= 0) {
					return SqlString.format(query, values, connection.config.timezone);
				}
				return query.replace(/\:(\w+)/g, function (txt, key) {
					if (values.hasOwnProperty(key)) {
						return this.escape(values[key]);
					}
					return txt;
				}.bind(this));
			};
			cb(connection);
		});
	}

	function TweetCat() {
		this.voteuser = 0;
		this.id = 0;
		this.human = consts.unknown;
		this.machine = consts.unknown;
	}

	function Tweet() {
		this.id = 0;
		this.created_at = '';
		this.source = '';
		this.text = '';
		this.user = '';
		this.userimg = '';
		this.longurls = '';
	}

	me.closePool = function () {
		pool.end();
	};

	function createTweetsTable(connection, maxlengths, cb) {
		connection.query('CREATE TABLE IF NOT EXISTS tweets (' +
			'id BIGINT UNSIGNED NOT NULL,' +
			'created_at DATETIME NOT NULL,' +
			'user VARCHAR(' + (maxlengths.user + 1) + ') NOT NULL,' +
			'source VARCHAR(' + (maxlengths.source + 1) + '),' +
			'userimg VARCHAR(' + (maxlengths.userimg + 1) + '),' +
			'text VARCHAR(' + (maxlengths.text + 1) + '),' +
			'longurls VARCHAR(' + (maxlengths.longurls + 1) + '),' +
			'PRIMARY KEY(id),' +
			'INDEX(user),' +
			'FULLTEXT(text),' +
			'FULLTEXT(longurls)' +
			') ENGINE = MYISAM;',
			function (err2, result) {
				if (err2) throw err2;
				if (result)
					console.log('[DB] Tweet Table Created');
				cb(true);
			});
	}

	function createVotesTable(connection, cb) {
		connection.query('CREATE TABLE IF NOT EXISTS votes (' +
			'id BIGINT UNSIGNED NOT NULL,' +
			'voteuser MEDIUMINT NOT NULL,' +
			'human VARCHAR(10) DEFAULT "' + consts.unknown + '",' +
			'machine VARCHAR(10) DEFAULT "' + consts.unknown + '",' +
			'PRIMARY KEY(id, voteuser)' +
			');',
			function (err2, result) {
				if (err2) throw err2;
				if (result)
					console.log('[DB] Votes Table Created');
				cb(true);
			});
	}

	function createVoteUserTable(connection, cb) {
		connection.query('CREATE TABLE IF NOT EXISTS voteusers (' +
			'id MEDIUMINT NOT NULL AUTO_INCREMENT,' +
			'voteuser VARCHAR(10) NOT NULL,' +
			'PRIMARY KEY(id)' +
			');',
			function (err2, result) {
				if (err2) throw err2;
				if (result)
					console.log('[DB] VoteUsers Table Created');
				cb(true);
			});
	}

	function beginUpdate(connection, cb) {
		connection.query('START TRANSACTION;', function (err) {
			if (err) throw err;
			cb();
		});
	}

	function endUpdate(connection, cb) {
		connection.query('COMMIT;', function (err) {
			if (err) throw err;
			cb();
		});
	}

	function dofillUser(connection, voteuserid, cb) {
		console.log('[DB] Pumping Default VoteUser Cats to DB');
		connection.query('SELECT id FROM tweets', function (err, result) {
			function storeDefault(index) {
				if (index >= result.length) {
					cb();
				} else {
					connection.query('INSERT INTO votes SET ?;', {id: result[index].id, voteuser: voteuserid}, function (err) {
						if (err) throw err;
						storeDefault(index + 1);
					});
				}
			}

			storeDefault(0);
		});
	}

	function doloadCatForTweet(connection, voteuserid, tweetid, cb) {
		connection.query('SELECT human,machine FROM votes WHERE id=:id AND voteuser=:voteuser;',
			{id: tweetid, voteuser: voteuserid}, function (err, result) {
				if (err) throw err;
				if (result.length === 0) {
					cb(null);
				} else {
					var cat = new TweetCat();
					cat.machine = result[0].machine;
					cat.human = result[0].human;
					cat.id = tweetid;
					cat.voteuser = voteuserid;
					cb(cat);
				}
			});
	}

	function setCat(connection, voteuserid, mode, tweetid, value, cb) {
		doloadCatForTweet(connection, voteuserid, tweetid, function (result) {
			if (!result) {
				console.log('storing new cat for: ' + tweetid + ' ' + value);
				doStoreNewCatData(connection, voteuserid, tweetid,
					(mode === 'human' ? value : consts.unknown),
					(mode === 'machine' ? value : consts.unknown),
					function (catresult) {
						cb(catresult);
					}
				)
			} else {
				result[mode] = value;
				connection.query('UPDATE votes SET ' + mysql.escapeId(mode) + '=:cat WHERE id=:id AND voteuser=:voteuser;',
					{cat: value, id: tweetid, voteuser: voteuserid}, function (err) {
						if (err) throw err;
						cb(result);
					});
			}
		});
	}

	function setCats(voteuserid, votesarray, mode, cb) {
		getConnection(function (connection) {
			function storeCat(index) {
				if (index >= votesarray.length) {
					endUpdate(connection, function () {
						connection.end();
						cb();
					});
				} else {
					setCat(connection, voteuserid, mode, votesarray[index].id, votesarray[index][mode], function () {
						storeCat(index + 1);
					});
				}
			}

			beginUpdate(connection, function () {
				storeCat(0);
			});
		});
	}

	function doStoreNewCatData(connection, voteuserid, tweetid, human, machine, cb) {
		var cat = new TweetCat();
		cat.id = tweetid;
		cat.voteuser = voteuserid;
		cat.human = human;
		cat.machine = machine;
		connection.query('INSERT INTO votes SET ?;', cat, function (err) {
			if (err) throw err;
			cb(cat);
		});
	}

	function doSetHumanCat(connection, voteuserid, tweetid, value, cb) {
		setCat(connection, voteuserid, 'human', tweetid, value, cb);
	}

	function doloadTweet(connection, tweetid, cb) {
		connection.query('SELECT * FROM tweets WHERE id=:id', {id: tweetid}, function (err, result) {
			if (err) throw err;
			if ((result) && (result.length === 1)) {
				var tweet = new Tweet();
				tweet.id = tweetid;
				tweet.source = result[0].source;
				tweet.text = result[0].text;
				tweet.user = result[0].user;
				tweet.created_at = result[0].created_at;
				tweet.userimg = result[0].userimg;
				tweet.longurls = result[0].longurls;
				cb(tweet);
			} else {
				cb(null);
			}
		});
	}

	function doLoadTweetAndCatsByIds(connection, voteuserid, ids, cb) {
		connection.query('SELECT t.*, v.human, v.machine FROM tweets t, votes v WHERE t.id in (:ids) ' +
			'AND t.id=v.id AND voteuser=:voteuser;', {ids: ids, voteuser: voteuserid}, function (err, result) {
			if (err) throw err;
			if ((result) && (result.length > 0)) {
				cb(result);
			} else {
				cb(null);
			}
		});
	}

	//* used by prepare.js *//

	function createUser(connection, voteusername, cb) {
		connection.query('INSERT INTO voteusers SET ?;', {voteuser: voteusername}, function (err, result) {
			if (err) throw err;
			console.log('[DB] VoteUser inserted: ' + voteusername + ' ' + result.insertId);
			beginUpdate(connection, function () {
				dofillUser(connection, result.insertId, function () {
					endUpdate(connection, function () {
						console.log('[DB] VoteUser filled');
						cb(result.insertId);
					});
				});
			});
		});
	}

	me.createUser = function (voteusername, cb) {
		getConnection(function (connection) {
			createUser(connection, voteusername, function (id) {
				connection.end();
				cb(id);
			})
		});
	};

	function createTables(connection, maxlengths, cb) {
		createTweetsTable(connection, maxlengths, function () {
			createVoteUserTable(connection, function () {
				createVotesTable(connection, cb);
			});
		});
	}

	function storeNewTweets(connection, tweets, cb) {
		beginUpdate(connection, function () {
			function store(index) {
				if (index >= tweets.length) {
					endUpdate(connection, cb);
				} else {
					connection.query('INSERT INTO tweets SET ?', tweets[index], function (err) {
						if (err) throw err;
						store(index + 1);
					});
				}
			}

			store(0);
		});
	}

	me.setHumanCats = function (voteuserid, votesarray, cb) {
		setCats(voteuserid, votesarray, 'human', cb);
	};

	//* api *//

	me.enumerateTweetsAndCats = function (voteuserid, cb) {
		getConnection(function (connection) {
			var count = 0;
			var query = connection.query('SELECT t.*, v.human, v.machine FROM tweets t, votes v WHERE t.id=v.id AND v.voteuser=:voteuser;', {voteuser: voteuserid});
			query
				.on('error', function (err) {
					// Handle error, an 'end' event will be emitted after this as well
				})
				.on('fields', function (fields) {
					// the field packets for the rows to follow
				})
				.on('result', function (row) {
					// Pausing the connnection is useful if your processing involves I/O
					connection.pause();
					//console.log(row);
					//TODO: hotfix for null as string, check where does that come from?
					if (row.longurls === 'null')
						row.longurls = null;
					cb(row);
					count++;
					//console.log(count);
					connection.resume();
				})
				.on('end', function () {
					connection.end();
					cb(null);
					// all rows have been received
				});
		});
	};

	me.setHumanCatByIds = function (voteuserid, tweetids, value, cb) {
		getConnection(function (connection) {
			var cats = [];

			function saveCat(index) {
				if (index >= tweetids.length) {
					endUpdate(connection, function () {
						doLoadTweetAndCatsByIds(connection, voteuserid, tweetids, function (tweets) {
							connection.end();
							cb(tweets);
						});
					})
				}
				else {
					doSetHumanCat(connection, voteuserid, tweetids[index], value, function (err, cat) {
						cats.push(cat);
						saveCat(index + 1);
					});
				}
			}

			beginUpdate(connection, function () {
				saveCat(0);
			})
		});
	};

	me.setHumanCat = function (voteuserid, tweetid, value, cb) {
		getConnection(function (connection) {
			doSetHumanCat(connection, voteuserid, tweetid, value, function (cat) {
				doloadTweet(connection, tweetid, function (tweet) {
					connection.end();
					tweet.human = cat.human;
					tweet.machine = cat.machine;
					cb(tweet);
				});
			});
		});
	};

	me.setMachineCats = function (voteuserid, votesarray, cb) {
		setCats(voteuserid, votesarray, 'machine', cb);
	};

	me.getUserPackages = function (voteuserid, start, filter, search, maxtweets, cb) {
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
		var filtercondition = 'v.id=t.id' + ' AND v.voteuser=:voteuser';
		if ((humanfilter.length > 0) && humanfilter.length < consts.cats.length) {
			if (humanfilter.length === 1) {
				filtercondition += ' AND v.human=:human';
				humanfilter = humanfilter[0];
			} else {
				filtercondition += ' AND (v.human in (:human))';
			}
		}
		if ((machinefilter.length > 0) && machinefilter.length < consts.cats.length) {
			if (humanfilter.length === 1) {
				filtercondition += ' AND v.machine=:machine';
				humanfilter = humanfilter[0];
			} else {
				filtercondition += ' AND (v.machine in (:machine))';
			}
		}

		var textsearch = '';
		if (search)
			textsearch = '((t.text LIKE(:search)) OR (t.longurls LIKE(:search)))';

		getConnection(function (connection) {
			connection.query('SELECT DISTINCT t.user' +
				' FROM tweets t WHERE ' +
				((search) ? textsearch + ' AND ' : '') +
				'EXISTS (SELECT v.id FROM votes v WHERE ' + filtercondition + ')' +
				' ORDER BY t.created_at;',
				{voteuser: voteuserid, human: humanfilter, machine: machinefilter, search: '%' + search + '%'},
				function (err, result) {
					if (err) throw err;
					//console.log('result: ' + result.length);

					var written = 0;
					var canwrite = (!start);

					function processUser(index) {
						if (index >= result.length) {
							connection.end();
							cb()
						} else if (written > maxtweets) {
							connection.end();
							cb(null, result[index].user);
						} else {
							var user = result[index].user;
							if ((!canwrite) && (start === user)) {
								canwrite = true;
							}
							if (!canwrite) {
								processUser(index + 1);
							} else {
								connection.query('SELECT t.*, v.human, v.machine ' +
									'FROM tweets t, votes v WHERE ' +
									't.user=:user AND ' +
									filtercondition +
									((search) ? ' AND ' + textsearch : '') +
									' ORDER BY t.created_at;',
									{user: user, voteuser: voteuserid, human: humanfilter, machine: machinefilter, search: '%' + search + '%'},
									function (err2, result2) {
										if (err2) throw err2;
										if ((result2) && (result2.length > 0)) {
											connection.query('SELECT COUNT(user) as total FROM tweets WHERE user=:user;', {user: user}, function (err3, result3) {
												if (err3) throw err3;
												written += result2.length;
												cb(result2, result3[0].total, function () {
													processUser(index + 1);
												});
											});
										}
									});
							}
						}

					}

					if (result.length > 0)
						processUser(0);
					else {
						connection.end();
						cb();
					}
				});
		});
	};

	me.getUserPackage = function (voteuserid, user, cb) {
		getConnection(function (connection) {
			connection.query('SELECT t.*, v.human, v.machine ' +
				'FROM tweets t, votes v WHERE t.user=:user AND v.id=t.id AND v.voteuser=:voteuser;',
				{voteuser: voteuserid, user: user},
				function (err, result) {
					if (err) throw err;
					console.log(result);
					cb(result);
				}
			);
		});
	};

	me.getCountsByCat = function (voteuserid, mode, cb) {
		getConnection(function (connection) {
			connection.query('SELECT ' + mysql.escapeId(mode) + ', COUNT(' + mysql.escapeId(mode) + ') as total ' +
				'FROM votes WHERE voteuser=:voteuser GROUP BY ' + mysql.escapeId(mode) + ';',
				{voteuser: voteuserid},
				function (err, result) {
					if (err) throw err;
					var data = [];
					result.forEach(function (entry) {
						data[entry[mode]] = entry.total;
					});
					connection.end();
					cb(data);
				}
			);
		});
	};

	me.getCats = function (voteuserid, mode, cb) {
		getConnection(function (connection) {
			connection.query('SELECT id,' + mysql.escapeId(mode) +
				' FROM votes WHERE voteuser=:voteuser;',
				{voteuser: voteuserid},
				function (err, result) {
					if (err) throw err;
					connection.end();
					var data = {};
					result.forEach(function (entry) {
						if (entry[mode] !== consts.unknown)
							data[entry.id] = entry[mode];
					});
					cb(data);
				}
			);
		});
	};

	me.initUser = function (user, cb) {
		//noop
		cb();
	};

//	me.dropAllTables = function (connection, cb) {
//		connection.query('DROP TABLE IF EXISTS tweets;', function (err) {
//			if (err) throw err;
//		});
//		connection.query('DROP TABLE IF EXISTS votes;', function (err) {
//			if (err) throw err;
//		});
//		connection.query('DROP TABLE IF EXISTS voteusers;', function (err) {
//			if (err) throw err;
//		});
//	}

	function dropTweetsTables(connection, cb) {
		connection.query('DROP TABLE IF EXISTS tweets;', function (err) {
			if (err) throw err;
			cb();
		});
	}

	function findUser(connection, voteusername, cb) {
		connection.query('SELECT id FROM voteusers WHERE voteuser=:voteuser;',
			{voteuser: voteusername},
			function (err, result) {
				if (err) throw err;
				if (result.length === 0)
					cb(null);
				else
					cb(result[0].id);
			}
		);
	}

	function updateUserTable(connection, tweets, voteuserid, cb) {
		console.log('[DB] Filling VoteUser... ' + voteuserid);

		connection.query('SELECT id FROM votes WHERE voteuser=:voteuser;', {voteuser: voteuserid}, function (err, tweetids) {
			if (err) throw err;
			tweetids = tweetids.map(function (entry) {
				return entry.id;
			});
			tweets = tweets.filter(function (entry) {
				return tweetids.indexOf(entry.id) < 0;
			});

			beginUpdate(connection, function () {

				function updateVoteUserTweet(index) {
					if (index >= tweets.length) {
						endUpdate(connection, function () {
							cb();
						});
					} else {
						connection.query('INSERT INTO votes SET ?;', {id: tweets[index].id, voteuser: voteuserid}, function (err) {
							if (err) throw err;
							updateVoteUserTweet(index + 1);
						});
					}
				}

				updateVoteUserTweet(0);
			});
		});
	}

	function updateUserTables(connection, tweets, cb) {
		connection.query('SELECT id FROM voteusers;',
			function (err, result) {
				if (err) throw err;

				function updateUserTableID(index) {
					if (index >= result.length) {
						cb();
					} else {
						updateUserTable(connection, tweets, result[index].id, function () {
							updateUserTableID(index + 1);
						})
					}
				}

				updateUserTableID(0);
			}
		);
	}

	me.prepare = function (tweets, cb) {
		console.log('[DB] Preparing Tweets');
		var dbtweets = [];
		var maxlengths = {
			user: 0,
			source: 0,
			text: 0,
			userimg: 0,
			longurls: 0
		};
		tweets.forEach(function (tweet) {
			var longy = (typeof(tweet.longurls) == 'string' ? tweet.longurls : JSON.stringify(tweet.longurls));
			maxlengths.longurls = Math.max(maxlengths.longurls, (longy ? longy.length : 0));
			maxlengths.user = Math.max(maxlengths.user, tweet.user.length);
			maxlengths.source = Math.max(maxlengths.source, tweet.source.length);
			maxlengths.text = Math.max(maxlengths.text, tweet.text.length);
			maxlengths.userimg = Math.max(maxlengths.userimg, tweet.userimg.length);
			dbtweets.push({
				id: tweet.id,
				created_at: new Date(tweet.created_at),
				source: tweet.source,
				text: tweet.text,
				user: tweet.user,
				userimg: tweet.userimg,
				longurls: longy
			});
		});
		//console.log('Info: LongUrls Field must be at least ' + maxlongurl + 'long');
		getConnection(function (connection) {
			console.log('[DB] Cleaning Tweets-Table');
			dropTweetsTables(connection, function () {
				console.log('[DB] Creating Tables');
				createTables(connection, maxlengths, function () {
					console.log('[DB] Pumping Tweets to DB');
					storeNewTweets(connection, dbtweets, function () {
						findUser(connection, 'admin', function (userid) {
							if (userid) {
								console.log('[DB] Updating User Tables');
								updateUserTables(connection, tweets, function () {
									console.log('[DB] done.');
									connection.end();
									me.closePool();
									cb();
								});
							} else {
								console.log('[DB] Creating default user');
								createUser(connection, 'admin', function (userid) {
									console.log('[DB] Updating User Tables');
									updateUserTables(connection, tweets, function () {
										console.log('[DB] done.');
										connection.end();
										me.closePool();
										cb();
									});
								});
							}
						});
					});
				});
			});
		});
	};

	return me;
};
