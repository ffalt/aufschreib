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

	console.log('[Tweets] Connecting to DB');
	var pool = mysql.createPool(dboptions);

	function getConnection(callback) {
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
			callback(connection);
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

	function createTweetsTable(connection, callback) {
		connection.query('DROP TABLE IF EXISTS tweets;', function (err) {
			if (err) throw err;
			connection.query('CREATE TABLE tweets (' +
				'id BIGINT UNSIGNED NOT NULL,' +
				'created_at DATETIME NOT NULL,' +
				'user VARCHAR(30) NOT NULL,' +
				'source VARCHAR(200),' +
				'userimg VARCHAR(200),' +
				'text VARCHAR(200),' +
				'longurls VARCHAR(800),' +
				'PRIMARY KEY(id),' +
				'INDEX(user),' +
				'FULLTEXT(text),' +
				'FULLTEXT(longurls)' +
				') ENGINE = MYISAM;',
				function (err2) {
					if (err2) throw err2;
					console.log('[DB] Tweet Table Created');
					callback(true);
				});
		});
	}

	function createVotesTable(connection, callback) {
		connection.query('DROP TABLE IF EXISTS votes;', function (err) {
			if (err) throw err;
			connection.query('CREATE TABLE votes (' +
				'id BIGINT UNSIGNED NOT NULL,' +
				'voteuser MEDIUMINT NOT NULL,' +
				'human VARCHAR(10) DEFAULT "' + consts.unknown + '",' +
				'machine VARCHAR(10) DEFAULT "' + consts.unknown + '",' +
				'PRIMARY KEY(id, voteuser)' +
				');',
				function (err2) {
					if (err2) throw err2;
					console.log('[DB] Votes Table Created');
					callback(true);
				});
		});
	}

	function createVoteUserTable(connection, callback) {
		connection.query('DROP TABLE IF EXISTS voteusers;', function (err) {
			if (err) throw err;
			connection.query('CREATE TABLE voteusers (' +
				'id MEDIUMINT NOT NULL AUTO_INCREMENT,' +
				'voteuser VARCHAR(10) NOT NULL,' +
				'PRIMARY KEY(id)' +
				');',
				function (err2) {
					if (err2) throw err2;
					console.log('[DB] VoteUsers Table Created');
					callback(true);
				});
		});
	}

	function beginUpdate(connection, callback) {
		connection.query('START TRANSACTION;', function (err) {
			if (err) throw err;
			callback();
		});
	}

	function endUpdate(connection, callback) {
		connection.query('COMMIT;', function (err) {
			if (err) throw err;
			callback();
		});
	}

	function dofillUser(connection, voteuserid, callback) {
		console.log('[DB] Pumping Default VoteUser Cats to DB');
		connection.query('SELECT id FROM tweets', function (err, result) {
			function storeDefault(index) {
				if (index >= result.length) {
					connection.end();
					callback();
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

	function doloadCatForTweet(connection, voteuserid, tweetid, callback) {
		connection.query('SELECT human,machine FROM votes WHERE id=:id AND voteuser=:voteuser;',
			{id: tweetid, voteuser: voteuserid}, function (err, result) {
				if (err) throw err;
				if (result.length === 0) {
					callback(null);
				} else {
					var cat = new TweetCat();
					cat.machine = result[0].machine;
					cat.human = result[0].human;
					cat.id = tweetid;
					cat.voteuser = voteuserid;
					callback(cat);
				}
			});
	}

	function setCat(connection, voteuserid, mode, tweetid, value, callback) {
		doloadCatForTweet(connection, voteuserid, tweetid, function (result) {
			if (!result) {
				console.log('storing new cat for: ' + tweetid + ' ' + value);
				doStoreNewCatData(connection, voteuserid, tweetid,
					(mode === 'human' ? value : consts.unknown),
					(mode === 'machine' ? value : consts.unknown),
					function (catresult) {
						callback(catresult);
					}
				)
			} else {
				result[mode] = value;
				connection.query('UPDATE votes SET ' + mysql.escapeId(mode) + '=:cat WHERE id=:id AND voteuser=:voteuser;',
					{cat: value, id: tweetid, voteuser: voteuserid}, function (err) {
						if (err) throw err;
						callback(result);
					});
			}
		});
	}

	function setCats(voteuserid, votesarray, mode, callback) {
		getConnection(function (connection) {

			function storeCat(index) {
				if (index >= votesarray.length) {
					endUpdate(connection, function () {
						connection.end();
						callback();
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

	function doStoreNewCatData(connection, voteuserid, tweetid, human, machine, callback) {
		var cat = new TweetCat();
		cat.id = tweetid;
		cat.voteuser = voteuserid;
		cat.human = human;
		cat.machine = machine;
		connection.query('INSERT INTO votes SET ?;', cat, function (err) {
			if (err) throw err;
			callback(cat);
		});
	}

	function doSetHumanCat(connection, voteuserid, tweetid, value, callback) {
		setCat(connection, voteuserid, 'human', tweetid, value, callback);
	}

	function doloadTweet(connection, tweetid, callback) {
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
				callback(tweet);
			} else {
				callback(null);
			}
		});
	}

	function doLoadTweetAndCatsByIds(connection, voteuserid, ids, callback) {
		connection.query('SELECT t.*, v.human, v.machine FROM tweets t, votes v WHERE t.id in (:ids) ' +
			'AND t.id=v.id AND voteuser=:voteuser;', {ids: ids, voteuser: voteuserid}, function (err, result) {
			if (err) throw err;
			if ((result) && (result.length > 0)) {
				callback(result);
			} else {
				callback(null);
			}
		});
	}

	//* used by prepare.js *//

	me.createUser = function (voteusername, callback) {
		getConnection(function (connection) {
			connection.query('INSERT INTO voteusers SET ?;', {voteuser: voteusername}, function (err, result) {
				if (err) throw err;
				console.log('[DB] VoteUser inserted: ' + voteusername + ' ' + result.insertId);
				beginUpdate(connection, function () {
					dofillUser(connection, result.insertId, function () {
						endUpdate(connection, function () {
							connection.end();
							console.log('[DB] VoteUser filled');
							callback(result.insertId);
						});
					});
				});
			});
		});
	};

	me.createTables = function (callback) {
		getConnection(function (connection) {
			createTweetsTable(connection, function () {
				createVoteUserTable(connection, function () {
					createVotesTable(connection, function () {
						connection.end();
						callback();
					});
				});
			});
		});
	};

	me.storeNewTweets = function (tweets, callback) {
		getConnection(function (connection) {
			beginUpdate(connection, function () {
				function store(index) {
					if (index >= tweets.length) {
						endUpdate(connection, callback);
						connection.end();
					} else {
						connection.query('INSERT INTO tweets SET ?', tweets[index], function (err) {
							if (err) throw err;
							store(index + 1);
						});
					}
				}

				store(0);
			});
		});
	};

	me.setHumanCats = function (voteuserid, votesarray, callback) {
		setCats(voteuserid, votesarray, 'human', callback);
	};

	//* api *//

	me.enumerateTweetsAndCats = function (voteuserid, callback) {
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
					callback(row);
					count++;
					//console.log(count);
					connection.resume();
				})
				.on('end', function () {
					connection.end();
					callback(null);
					// all rows have been received
				});
		});
	};

	me.setHumanCatByIds = function (voteuserid, tweetids, value, callback) {
		getConnection(function (connection) {
			var cats = [];

			function saveCat(index) {
				if (index >= tweetids.length) {
					endUpdate(connection, function () {
						doLoadTweetAndCatsByIds(connection, voteuserid, tweetids, function (tweets) {
							connection.end();
							callback(tweets);
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

	me.setHumanCat = function (voteuserid, tweetid, value, callback) {
		getConnection(function (connection) {
			doSetHumanCat(connection, voteuserid, tweetid, value, function (cat) {
				doloadTweet(connection, tweetid, function (tweet) {
					connection.end();
					tweet.human = cat.human;
					tweet.machine = cat.machine;
					callback(tweet);
				});
			});
		});
	};

	me.setMachineCats = function (voteuserid, votesarray, callback) {
		setCats(voteuserid, votesarray, 'machine', callback);
	};

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
							callback()
						} else if (written > maxtweets) {
							connection.end();
							callback(null, result[index].user);
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
												callback(result2, result3[0].total, function () {
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
						callback();
					}
				});
		});
	};

	me.getUserPackage = function (voteuserid, user, callback) {
		getConnection(function (connection) {
			connection.query('SELECT t.*, v.human, v.machine ' +
				'FROM tweets t, votes v WHERE t.user=:user AND v.id=t.id AND v.voteuser=:voteuser;',
				{voteuser: voteuserid, user: user},
				function (err, result) {
					if (err) throw err;
					console.log(result);
					callback(result);
				}
			);
		});
	};

	me.getCountsByCat = function (voteuserid, mode, callback) {
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
					callback(data);
				}
			);
		});
	};

	me.getCats = function (voteuserid, mode, callback) {
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
					callback(data);
				}
			);
		});
	};

	me.initUser = function (user, callback) {
		//noop
		callback();
	};

	return me;
};
