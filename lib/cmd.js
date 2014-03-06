/*

 deliver the pages & the data to the user

 */
var url = require('url');
var fs = require('fs');
var path = require('path');
var ejs = require('ejs');
exports.MyLittleCmds = function () {
    var me = this;
    var consts = require('./consts');
    var config = require('./../config');
    var tokenizer = require('./tweet_tokenizer.js').MyLittleTweetTokenizer();
    var classifier = require('./classify').MyLittleClassifier();
    var stats = require('./stats').MyLittleStats();
    var store = require('./tweets_mongo').MyLittleTweets();
    var range = {
        min: 0,
        max: 0
    };
    me.init = function (cb) {
        store.init(function () {
            store.getTweetRange(function (min, max) {
                range.min = min;
                range.max = max;
                cb();
            });
        });
    };

    function responseError(res, msg) {
        res.send(400, msg);
    }

    function log(text) {
        if (config.debug)
            console.log(text);
    }

    function responseUnknown(res) {
        responseError(res, 'Unknown command, go home, you\'re drunk');
        log('[Server] Error');
    }

    function responseSite(req, res) {
        res.render('index', {
            user: req.user,
            range: range,
            consts: consts
        });
    }

    function responseStart(req, res) {
        res.render('start', {
            user: req.user,
            consts: consts
        });
    }

    function fixImage(url) {
        return url.replace('a0.twimg.com', 'pbs.twimg.com');
//              http://a0.twimg.com/profile_images/1858287941/twitterpic_normal.jpg
//            https://pbs.twimg.com/profile_images/1858287941/twitterpic_bigger.jpg
    }

    function responseTweetList(req, res, startnr, filter, min, max, search) {
        if (search) {
            search = decodeURIComponent(search);
        }
        if (!filter) {
            filter = '';
        }
        var arange = null;
        if ((min) && (max)) {
            arange = {
                min: parseInt(min),
                max: parseInt(max)
            };
        }
        res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8'
        });
        var start = +new Date();
        var users = [];
        store.getUserPackages(req.user, startnr, filter, arange, search, 100,
            function (tweets, data, callback) {
                if ((tweets) && (tweets.length > 0)) {
                    users.push({
                        tweets: tweets,
                        user_tweet_total_count: data,
                        user_id: tweets[0].user,
                        user_name: '@' + tweets[0].user,
                        user_img: fixImage(tweets[0].userimg)
                    });
                    callback();
                } else {
                    res.render('users', {
                        textutils: tokenizer,
                        consts: consts,
                        users: users,
                        data: data
                    }, function (err, str) {
                        if (str)
                            res.write(str);
                        else
                            log('[Server] warning, something is wrong with: ' + JSON.stringify(str));
                        if (users.length == 0)
                            res.write('Nichts gefunden :]');
                        res.end();
                        var end = +new Date();
                        log('[Server] Tweets spilled in ' + (end - start) + 'ms');
                    });
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
                    user_img: fixImage(tweets[0].userimg)
                });
                var end = +new Date();
                log('[Server] Tweets by User: ' + tweets.length + ' spilled in ' + (end - start) + 'ms');
            }
        );
    }

    function responseVote(req, res, cat, id) {
        if (cat && id) {
            store.setHumanCat(req.user.id, id, cat, function (err) {
                if (!err) {
                    res.send('ok');
                    log('[Server] Tweet categorized');
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
                    log('[Server] Tweets categorized');
                } else {
                    responseUnknown(res);
                }
            });
        }
    }

    function responseCmdCommands(req, res) {
        var params_machine = stats.getParams(req.user.id, store, 'pie', 'machine', null, null, true);
        var params_human = stats.getParams(req.user.id, store, 'pie', 'human', null, null, true);
        var users = null;

        function renderCommands() {
            res.render('commands', {
                user: req.user,
                chart_machine_params: params_machine,
                chart_human_params: params_human,
                consts: consts,
                users: users,
                hide_head: true
            });
        }

        if (req.user.id == 1) {
            store.getUsers(function (u) {
                users = u;
                renderCommands();
            })
        } else {
            renderCommands();
        }
    }

    function responseCmdUpdateCache(req, res) {
        stats.cacheStats(req.user.id, store, console.log, function () {
            res.send('OK');
        });
    }

    function responseCmdClassifiction(req, res, mode, userid) {
        var id = req.user.id;
        if ((req.user.id == 1) && (userid)) {
            id = parseInt(userid);
        }
        store.getCats(id, mode, function (data) {
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
        log('[Server] Stat ' + params.type + ' served in ' + (end - start) + 'ms');
    }

    function responseCmdJson(req, res, type, mode, cat, kind, force, min, max) {
        var start = +new Date();
        var params = stats.getParams(req.user.id, store, type, mode || consts.defaultmode, cat, kind, force, min, max);
        if (!params.isValid()) {
            responseError(res, 'Invalid Command type:' + type + ' mode:' + mode + ' kind:' + kind + ' cat:' + cat);
            return;
        }
        stats.getChartData(params, function (data) {
            res.json(data);
            var end = +new Date();
            log('[Server] JSON ' + params.type + ' served in ' + (end - start) + 'ms');
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
                case 'start':
                    responseStart(req, res);
                    break;
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
                    responseTweetList(req, res, query.id, query.filter, query.rangegte, query.rangelte, query.search);
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
                    responseCmdClassifiction(req, res, query.mode, query.user);
                    break;
                case 'updatecache':
                    responseCmdUpdateCache(req, res);
                    break;
                case 'json':
                    responseCmdJson(req, res, query.type, query.mode, query.cat, query.kind, query.force, query.min, query.max);
                    break;
                default:
                    responseUnknown(res);
                    break;
            }
        }
    }

    me.logoutUser = function (req, res, callback) {
        store.deinitUser(req.user, callback);
    };

    me.initUser = function (req, res, callback) {
        store.initUser(req.user, callback);
    };

    me.bulkinsert = function (req, res) {
        var id = req.user.id;
        if ((id == 1) && (req.body) && (req.body.user)) {
            id = parseInt(req.body.user);
        }
        var file = req.files.file;
        if (file) {
            try {
                fs.readFile(file.path, function (err, data) {
                    data = JSON.parse(data);
                    store.importHumanCats(id, data, function (err) {
                        if (err)
                            res.send(400, err);
                        else {
                            var params = stats.getParams(id, store, 'pie', 'human', null, null, true);
                            res.render('stats/' + 'pie_commands', {
                                chartparams: params,
                                consts: consts,
                                hide_head: true,
                                container_id: params.getChartContainerId() + '_after'});
                        }
                    })
                });
            } catch (e) {
                res.send(400, 'Error invalid file');
            }
        } else {
            res.send(400);
        }
    };

    me.validateUser = function (username, password, cb) {
        //function(err,user)
        // Find the user by username.  If there is no user with the given
        // username, or the password is not correct, set the user to `false` to
        // indicate failure and set a flash message.  Otherwise, return the
        // authenticated `user`.
        store.findUserByName(username, function (err, user) {
            if ((err) || (!user)) {
                cb(err);
            } else if (user.password != password) {
                cb(err, null)
            } else {
                cb(err, user);
            }
        })
    };

    me.findUserById = function (id, cb) {
        store.findUserById(id, cb);
    };

    me.createuser = function (req, res) {
        store.prepareUser(req.body.username, req.body.password, function () {
            res.send(200);
        });
    };

    me.process = function (req, res) {
        processCmd(req, res);
    };

    function socket_updatecache(socket) {
        var emit = function (cmd, obj) {
            try {
                socket.emit(cmd, obj);
                return true;
            } catch (e) {
                return false;
            }
        };
        emit('news', { msg: 'Aktualisiere Zwischenspeicher' });
        stats.cacheStats(socket.handshake.user.id, store, function (log) {
            console.log('[Stats] ' + log);
            return emit('news', { msg: log });
        }, function () {
            return emit('success', { msg: 'Zwischenspeicher aktualisiert.' });
        });
    }

    function socket_classify(socket) {
        var emit = function (cmd, obj) {
            try {
                socket.emit(cmd, obj);
            } catch (e) {
                return false;
            }
            return true;
        };
        if (emit('news', { msg: 'Vorschläge werden aktualisiert' }))
            classifier.classify(socket.handshake.user.id, store,
                function (log) {
                    console.log('[Classify] ' + log);
                    return emit('news', { msg: log });
                },
                function (isdone) {
                    if (isdone) {
                        if (!socket.handshake)
                            return;
                        var params = stats.getParams(socket.handshake.user.id, store, 'pie', 'machine', null, null, true);
                        var filePath = path.resolve(__dirname, '../views/stats/pie_commands.ejs');
                        fs.readFile(filePath, 'utf-8', function (err, content) {
                            if (err)
                                throw err;
                            var data = ejs.render(content, {
                                chartparams: params,
                                consts: consts,
                                hide_head: true,
                                container_id: params.getChartContainerId() + '_after'});
                            emit('success', { msg: data });
                        });
                    } else {
                        emit('fail', { msg: 'Keine Daten für Vorschläge vorhanden :.(' });
                    }
                    return true;
                }
            );
    }

    me.socket = function (socket) {
        //socket.emit('news', { msg: 'Connection established ' + socket.handshake.user.id });
        socket.on('start', function (data) {
            if (data['cmd'] === 'classify') {
                console.log('start classify');
                socket_classify(socket);
            } else if (data['cmd'] === 'updatecache') {
                socket_updatecache(socket);
            } else {
                try {
                    socket.emit('fail', { msg: 'unknown command' });
                } catch (e) {
                }
            }
        });
        socket.on('end', function (data) {
            socket.disconnect();
        });
    };

    return me;
}
;