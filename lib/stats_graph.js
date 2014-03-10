/*

 generates data for a force directed graph

 Format:
 {
 nodes:
 [
 {id: 'id', name: 'name'),
 ...
 ],
 links:
 [
 {source: 'id', target: 'id', value: 'value'),
 ...
 ]
 */

var consts = require('./consts');
var tokenizer = require('./utils').Utils();

exports.MyLittleGraphStat = function () {
    var me = this;

    function getGraphData(params, callback) {
        var users = [];
        var usersvotes = {};
        var links = {};

        function reportVote(username, vote) {
            var v = usersvotes[username] || {votes: {}};
            v.votes[vote] = v.votes[vote] || 0;
            v.votes[vote] += 1;
            usersvotes[username] = v;
        }

        function getUserOverallVote(username) {
            var v = usersvotes[username];
            if (!v)
                return consts.unknown;
            var result = consts.unknown;
            var currentmax = 0;
            for (var key in v.votes) {
                if (currentmax < v.votes[key]) {
                    result = key;
                    currentmax = v.votes[key];
                }
            }
            return result;
        }

        function findOrAdd(username) {
            var result = users.indexOf(username);
            if (result < 0) {
                result = users.length;
                users.push(username);
            }
            return result;
        }

        function addOrInc(src, dest) {
            var id = src + '-' + dest;
            if (!links[id]) {
                id = dest + '-' + src;
            }
            links[id] = links[id] || {source: src, target: dest, value: 0};
            links[id].value += 1;
        }

        params.store.enumerateTweetsAndCatsRange(params.voteuserid, params.min, params.max, function (tweet) {
            if (tweet) {
                reportVote('@' + tweet.user, tweet[params.mode]);
                var dests = tokenizer.extractUsers(tweet.text);
                if (dests.length > 0) {
                    var source = findOrAdd('@' + tweet.user);
                    dests.forEach(function (dest) {
                        var dest = findOrAdd(dest);
                        addOrInc(source, dest);
                    });
                }
            } else {
                var data = {};
                var i = 0;
                data.nodes = users.map(function (user) {
                    i++;
                    return {name: user, id: i, vote: getUserOverallVote(user)};
                });
                data.links = [];
                for (var key in links) {
                    if (links.hasOwnProperty(key)) {
                        data.links.push(links[key]);
                    }
                }
                callback(data);
            }
        });
    }

    me.prepareData = function (params, data, callback) {
        callback(data);
    };

    me.getData = function (params, callback) {
        getGraphData(params, function (data) {
            me.prepareData(params, data, callback);
        });
    };

    return me;
};
