/*

 deliver the pages & the data to the user

 */
var url = require('url');
var fs = require('fs');
var ejs = require('ejs');
exports.MyLittleCmds = function () {
	var me = this;
	var consts = require('./consts');
	var config = require('./config');
	var tokenizer = require('./tweet_tokenizer.js').MyLittleTweetTokenizer();
	var classifier = require('./classify').MyLittleClassifier();
	var stats = require('./stats').MyLittleStats();
	var store = require('./tweets_' + config.storage).MyLittleTweets();

	me.init = function (cb) {
		store.init(cb);
	};

	function responseError(res, msg) {
		res.send(400, msg);
	}

	function responseUnknown(res) {
		responseError(res, 'Unknown command, go home, you\'re drunk');
		console.log('[Server] Error');
	}

	function responseSite(req, res) {
		res.render('index', {
			user: req.user,
			consts: consts
		});
	}

	function responseTweetList(req, res, startnr, filter, search) {
		var written = 0;
		if (search) {
			search = decodeURIComponent(search);
		}
		if (!filter) {
			filter = '';
		}
		res.writeHead(200, {
			'Content-Type': 'text/html; charset=utf-8'
		});
		var start = +new Date();
		store.getUserPackages(req.user.id, startnr, filter, search, 100,
			function (tweets, data, callback) {
				if ((tweets) && (tweets.length > 0)) {
					res.render('user', {
						textutils: tokenizer,
						consts: consts,
						tweets: tweets,
						user_tweet_total_count: data,
						user_id: tweets[0].user,
						user_name: '@' + tweets[0].user,
						user_img: tweets[0].userimg

					}, function (err, str) {
						if (str)
							res.write(str);
						else
							console.log('[Server] warning, something is wrong with: ' + JSON.stringify(str));
						written += tweets.length;
						callback();
					});
				} else {
					function endIt(err, str) {
						if (str)
							res.write(str);
						res.end();
						var end = +new Date();
						console.log('[Server] Tweets: ' + written + ' spilled in ' + (end - start) + 'ms');
					}

					if (data) {
						res.render('nextlink', {id: data}, endIt);
					} else if (written === 0) {
						endIt(null, 'Nix :]');
					} else {
						endIt();
					}
				}
			});
	}

	function responseUserTweetList(req, res, userid) {
		var start = +new Date();
		store.getUserPackage(req.user.id, userid,
			function (tweets) {
				res.render('user', {
					textutils: tokenizer,
					consts: consts,
					tweets: tweets,
					user_tweet_total_count: tweets.length,
					user_id: tweets[0].user,
					user_name: '@' + tweets[0].user,
					user_img: tweets[0].userimg
				});
				var end = +new Date();
				console.log('[Server] Tweets by User: ' + tweets.length + ' spilled in ' + (end - start) + 'ms');
			}
		);
	}

	function responseVote(req, res, cat, id) {
		if (cat && id) {
			store.setHumanCat(req.user.id, id, cat, function (err) {
				if (!err) {
					res.send('ok');
					console.log('[Server] Tweet categorized');
				} else {
					responseUnknown(res);
				}
			});
		} else {
			responseUnknown(res);
		}
	}

	function responseVoteAll(req, res, cat, ids) {
		ids = ids.split(',');
		if ((!cat) || (ids.length === 0)) {
			responseUnknown(res);
		} else {
			store.setHumanCats(req.user.id, ids, cat, function (err) {
				if (!err) {
					res.send('ok');
					console.log('[Server] Tweets categorized');
				} else {
					responseUnknown(res);
				}
			});
		}
	}

	function responseCmdCommands(req, res) {
		var params_machine = stats.getParams(req.user.id, store, 'pie', 'machine', null, null, true);
		var params_human = stats.getParams(req.user.id, store, 'pie', 'human', null, null, true);
		res.render('commands', {
			user: req.user,
			chart_machine_params: params_machine,
			chart_human_params: params_human,
			consts: consts,
			hide_head: true
		});
	}

	function responseCmdUpdateCache(req, res) {
		stats.cacheStats(req.user.id, store, console.log, function () {
			res.send('OK');
		});
	}

	function socket_updatecache(socket) {
		socket.emit('news', { msg: 'Update Cache started' });
		stats.cacheStats(socket.handshake.user.id, store, function (log) {
			console.log('[Stats] ' + log);
			socket.emit('news', { msg: log });
		}, function () {
			socket.emit('success', { msg: 'Done.' });
		});
	}

	function responseCmdClassifiction(req, res, mode) {
		store.getCats(req.user.id, mode, function (data) {
			res.json(data);
		});
	}

	function responseCmdClassify(req, res) {
		classifier.classify(req.user.id, store, console.log, function (isdone) {
				if (isdone) {
					var params = stats.getParams(req.user.id, store, 'pie', 'machine', null, null, true);
					res.render('stats/' + 'pie_commands', {
						chartparams: params,
						consts: consts,
						hide_head: true,
						container_id: params.getChartContainerId() + '_after'});
				} else {
					responseError(res, 'no data for classifying :.(');
				}
			}
		);
	}

	function responseChart(req, res, type, mode, cat, kind, force) {
		var start = +new Date();
		var params = stats.getParams(req.user.id, store, type, mode || consts.defaultmode, cat, kind, force);
		if (!params.isValid()) {
			responseError(res, 'Invalid Command');
			return;
		}
		res.render('stats/' + params.type, {
			chartparams: params,
			consts: consts,
			hide_head: false,
			container_id: params.getChartContainerId()
		});
		var end = +new Date();
		console.log('[Server] Stat ' + params.type + ' served in ' + (end - start) + 'ms');
	}

	function responseCmdJson(req, res, type, mode, cat, kind, force) {
		var start = +new Date();
		var params = stats.getParams(req.user.id, store, type, mode || consts.defaultmode, cat, kind, force);
		if (!params.isValid()) {
			responseError(res, 'Invalid Command type:' + type + ' mode:' + mode + ' kind:' + kind + ' cat:' + cat);
			return;
		}
		stats.getChartData(params, function (data) {
			res.json(data);
			var end = +new Date();
			console.log('[Server] JSON ' + params.type + ' served in ' + (end - start) + 'ms');
		});
	}

	function processCmd(req, res) {
		var url_parts = url.parse(req.url, true),
			query = url_parts.query,
			cmd = query.cmd;
		if (!cmd) {
			responseSite(req, res);
		} else {
			switch (cmd) {
				case 'set':
					responseVote(req, res, query.cat, query.id);
					break;
				case 'setall':
					responseVoteAll(req, res, query.cat, query.ids);
					break;
				case 'chart':
					responseChart(req, res, query.type, query.mode, query.cat, query.kind, query.force);
					break;
				case 'list':
					responseTweetList(req, res, query.id, query.filter, query.search);
					break;
				case 'user':
					responseUserTweetList(req, res, query.id);
					break;
				case 'commands':
					responseCmdCommands(req, res);
					break;
				case 'classify':
					responseCmdClassify(req, res);
					break;
				case 'classifiction':
					responseCmdClassifiction(req, res, query.mode);
					break;
				case 'updatecache':
					responseCmdUpdateCache(req, res);
					break;
				case 'json':
					responseCmdJson(req, res, query.type, query.mode, query.cat, query.kind, query.force);
					break;
				default:
					responseUnknown(res);
					break;
			}
		}
	}

	me.initUser = function (req, res, callback) {
		store.initUser(req.user, callback);
	};

	me.bulkinsert = function (req, res) {
		var file = req.files.file;
		if (file) {
			fs.readFile(file.path, function (err, data) {
				data = JSON.parse(data);
				store.importHumanCats(req.user.id, data, function (err) {
					if (err)
						res.send(400, err);
					else {
						var params = stats.getParams(req.user.id, store, 'pie', 'human', null, null, true);
						res.render('stats/' + 'pie_commands', {
							chartparams: params,
							consts: consts,
							hide_head: true,
							container_id: params.getChartContainerId() + '_after'});
					}
				})
			});
		} else {
			res.send(400);
		}
	};

	me.createuser = function (req, res) {
		console.log(req.body);
		res.send(200);
		//processCmd(req, res);
	};

	me.process = function (req, res) {
		processCmd(req, res);
	};
	function socket_classify(socket) {
		socket.emit('news', { msg: 'Classify started' });
		classifier.classify(socket.handshake.user.id, store, function (log) {
				console.log('[Classify] ' + log);
				socket.emit('news', { msg: log });
			}, function (isdone) {
				console.log('next');
				if (isdone) {
					var params = stats.getParams(socket.handshake.user.id, store, 'pie', 'machine', null, null, true);
					var filePath = __dirname + '/views/stats/' + 'pie_commands.ejs';
					fs.readFile(filePath, 'utf-8', function (err, content) {
						if (err)
							throw err;
						var data = ejs.render(content, {
							chartparams: params,
							consts: consts,
							hide_head: true,
							container_id: params.getChartContainerId() + '_after'});
						socket.emit('success', { msg: data });
					});
				} else {
					socket.emit('fail', { msg: 'No data for classifying :.(' });
				}
			}
		);
	}

	me.socket = function (socket) {
		//socket.emit('news', { msg: 'Connection established ' + socket.handshake.user.id });
		socket.on('start', function (data) {
			if (data['cmd'] === 'classify') {
				socket_classify(socket);
			} else if (data['cmd'] === 'updatecache') {
				socket_updatecache(socket);
			} else {
				socket.emit('fail', { msg: 'unknown command' });
			}
		});
	};

	return me;
};