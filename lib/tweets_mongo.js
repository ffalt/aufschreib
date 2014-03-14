/*

 Storage for tweets & user-vites in a mongodb

 */

var consts = require('./consts');
var config = require('./../config');
var async = require('async');

exports.MyLittleTweets = function () {
    var me = this;
    var tweetcollection;
    var votescollection;
    var userscollection;
    var mongodb;
    var userCache = {};
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

                function updateVotesStores(ups) {
                    var q = async.queue(function (tweet, callback) {
                        votescollection.update({tweetid: tweet.id}, {$set: {created_at: tweet.created_at}}, {multi: true}, function (err) {
                                if (err)
                                    console.log("[MongoDB] Error on saving votes " + err);
                                callback();
                            }
                        );
                    }, 1);
                    q.drain = function () {
                        cb();
                    };
                    if (ups.length === 0) {
                        cb();
                    } else {
                        q.push(ups);
                    }
                }

                function updateVotes() {
                    var ups = [];

                    tweetcollection.find({}, function (err, cursor) {
                        cursor.each(function (err, tweet) {
                                if (!tweet) {
                                    updateVotesStores(ups);
                                } else {
                                    var o = {id: tweet.id, created_at: new Date(tweet.created_at).valueOf()};
                                    console.log(o);
                                    ups.push(o);
                                }
                            }
                        );
                    });

                }

                if (config.updatemongodb)
                    updateVotes();
                else
                    cb();
            } else {
                console.log("[MongoDB] we are NOT connected: " + err);
                cb(err);
            }
        });
    };

    me.getTweetRange = function (cb) {
        var min = 0,
            max = 0;
        tweetcollection.find({}, function (err, cursor) {
            cursor.each(function (err, tweet) {
                    if (!tweet) {
                        cb(min, max);
                    } else {
                        var d = new Date(tweet.created_at).valueOf();
                        if (min == 0)
                            min = d;
                        else
                            min = Math.min(min, d);
                        max = Math.max(max, d);
                    }
                }
            );
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

    me.getUsers = function (callback) {
        userscollection.find({}).toArray(function (err, users) {
            var q = async.queue(function (u, cb) {
                votescollection.count({voteuserid: u.id}, function (err, count) {
                        u.count = count;
                        votescollection.count({voteuserid: u.id, human: 'unknown'}, function (err, count) {
                                u.unknowncount = count;
                                cb();
                            }
                        );
                    }
                );
            }, 1);
            q.drain = function () {
                callback(users);
            };
            if (users.length === 0) {
                callback([]);
            } else {
                q.push(users);
            }
        });
    };

    me.initUser = function (user, callback) {
        callback();
    };

    me.deinitUser = function (user, callback) {
        delete userCache[user.id];
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
        }, 1);
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
        }, 1);
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
                        } else if (
                            (tweet.text.indexOf(search) >= 0) ||
                            (tweet.user.indexOf(search) >= 0) ||
                            ((tweet.longurls) && (tweet.longurls.indexOf(search) >= 0))) {
                            ids.push(tweet.id);
                        }
                    }
                );
            });
        }
    }

    function processUserPackages(voteuserid, entries, start, maxtweets, callback) {
        //console.log('Entries: ' + entries.length);
        var sendtweets = 0;

        function processUsers(index) {
            if (index >= entries.length) {
                callback(null, null);
            } else if ((start) && (entries[index].name === start)) {
                start = null;
                processUsers(index);
            } else if (start) {
                processUsers(index + 1);
            } else if (sendtweets >= maxtweets) {
                callback(null, {next: entries[index].name, left: entries.length - index});
            } else {
                var entry = entries[index];
                loadUserTweets(entry.votes, function (usertweets) {
                    votescollection.count({voteuserid: voteuserid, tweetuser: entry.name}, function (err, count) {
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

    me.getUserPackages = function (voteuser, start, filter, range, search, maxtweets, callback) {
        if ((voteuser.lastentries) && (start)) {
            //console.log('use Cache');
            processUserPackages(voteuser.id, voteuser.lastentries, start, maxtweets, callback);
            return;
        }
        //console.log('no Cache');
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
        prepareSearch(search, function (allowedids) {
            var query = {voteuserid: voteuser.id,
                human: {$in: humanfilter},
                machine: {$in: machinefilter}
            };
            if (allowedids) {
                query.tweetid = {$in: allowedids};
            }

            if (range) {
//                query.created_at = {'$gt': 1259069961000 , '$lte': 1359069961000 };
                query.created_at = {'$gte': range.min, '$lte': range.max};
            }
//               console.log(query);
            votescollection.find(query).toArray(function (err, entries) {
                if (err) {
                    throw err;
                } else {
                    var packages = {};
                    for (var i = 0; i < entries.length; i++) {
                        var entry = entries[i];
                        packages[entry.tweetuser] = packages[entry.tweetuser] || [];
                        packages[entry.tweetuser].push(entry);
//                        console.log(entry.created_at);
                    }
                    var pack = [];
                    for (var key in packages) {
                        var obj = {votes: packages[key]};
                        obj.name = obj.votes[0].tweetuser;
                        obj.votes.sort(function (a, b) {
                            return a.created_at - b.created_at;
                        });
                        pack.push(obj);
                    }
                    pack.sort(function (a, b) {
                        return a.votes[0].created_at - b.votes[0].created_at;
                    });
                    voteuser.lastentries = pack;
                    processUserPackages(voteuser.id, pack, start, maxtweets, callback);
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
        }, 1);
        q.drain = function () {
            console.log('[MongoDB] Tweets stored');
            cb();
        };
        if (newtweets.length === 0) {
            cb();
        } else {
//            tweetcollection.remove(function () {
            q.push(newtweets);
//            });
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
                                machine: consts.unknown,
                                created_at: new Date(tweet.created_at).valueOf()
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
            var newtwwetsids = votes.map(function (vote) {
                return vote.tweetid;
            });
            var removedtweets = votesids.filter(function (id) {
                return newtwwetsids.indexOf(id) < 0;
            });

            newtweets = newtweets.filter(function (tweet) {
                return votesids.indexOf(tweet.id) < 0;
            });


            if ((removedtweets.length + newtweets.length) === 0) {
                console.log('[MongoDB] Votes for User #' + voteuserid + ' are already fine');
                cb();
            } else {

                var removeUnused = function () {
                    if (removedtweets.length === 0) {
                        console.log('[MongoDB] Votes for User #' + voteuserid + ' updated');
                        cb();
                    } else {
                        console.log('[MongoDB] Removing ' + removedtweets.length + ' Votes for User #' + voteuserid);
                        votescollection.remove(
                            {voteuserid: voteuserid, tweetid: {$in: removedtweets}}, function () {
                                console.log('[MongoDB] Votes for User #' + voteuserid + ' updated');
                                cb();
                            });
                    }
                };

                var q = async.queue(function (tweet, callback) {
                    votescollection.save(
                        {voteuserid: voteuserid,
                            tweetid: tweet.id,
                            tweetuser: tweet.user,
                            human: consts.unknown,
                            machine: consts.unknown,
                            created_at: new Date(tweet.created_at).valueOf()
                        }, callback);
                }, 1);
                q.drain = function () {
                    removeUnused();
                };
                if (newtweets.length === 0) {
                    removeUnused();
                } else {
                    console.log('[MongoDB] Adding ' + newtweets.length + ' Votes for User #' + voteuserid);
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
            }, 1);
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
        for (var key in userCache) {
            if (userCache.hasOwnProperty(key) && (userCache[key].name === name)) {
                cb(null, userCache[key]);
                return;
            }
        }
        //console.log('Check User by Name: ' + name);
        userscollection.findOne({name: name}, function (err, user) {
            if (user)
                userCache[user.id] = user;
            cb(err, user);
        });
    }

    function getUserById(id, cb) {
        if (userCache[id]) {
            cb(null, userCache[id]);
        } else {
            //console.log('Check User: ' + id);
            userscollection.findOne({id: id}, function (err, user) {
                if (user)
                    userCache[id] = user;
                cb(err, user);
            });
        }
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
        me.enumerateTweetsAndCatsRange(voteuserid, null, null, callback);
    };

    me.enumerateTweetsAndCatsRange = function (voteuserid, min, max, callback) {
        var query = {voteuserid: voteuserid};
        if (min && max)
            query.created_at = {'$gte': parseInt(min), '$lte': parseInt(max)}
        votescollection.find(query).toArray(function (err, entries) {
            if (err) {
                throw err;
            } else {
                var ids_o = {};
                var ids = entries.map(function (entry) {
                    ids_o[entry.tweetid] = entry;
                    return entry.tweetid;
                });

                tweetcollection.find({id: {$in: ids}}, function (err, cursor) {
                    if (err) {
                        throw err;
                    } else {
                        cursor.each(function (err, tweet) {
                            if (!tweet)
                                callback(null);
                            else {
                                tweet.human = ids_o[tweet.id].human;
                                tweet.machine = ids_o[tweet.id].machine;
                                callback(tweet);
                            }
                        });
                    }
                });
            }
        });
    };

    me.enumerateVotesCatsRange = function (voteuserid, min, max, callback) {
        var query = {voteuserid: voteuserid};
        if (min && max)
            query.created_at = {'$gte': parseInt(min), '$lte': parseInt(max)}
        votescollection.find(query, function (err, cursor) {
            cursor.each(function (err, vote) {
                callback(vote);
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
