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
var tokenizer = require('./tweet_tokenizer').MyLittleTweetTokenizer();

exports.MyLittleCountStat = function () {
    var me = this;

    function getCountData(params, callback) {
        var data = {count: 0, cats: {}, days: {}};
        params.store.enumerateTweetsAndCats(params.voteuserid, function (tweet) {
                if (tweet) {
                    if ((tweet.created_at >= params.min) && (tweet.created_at <= params.max)) {
                        data.count += 1;
                        data.cats[tweet.human] = (data.cats[tweet.human] || 0) + 1;
                        var newdata = tokenizer.getCreatedDayOf(tweet.created_at);
                        data.days[newdata] = data.days[newdata] || {count: 0, cats: {}};
                        data.days[newdata].count += 1;
                        data.days[newdata].cats[tweet.human] = (data.days[newdata].cats[tweet.human] || 0) + 1;
                    }
                } else {
                    callback(data);
                }
            }
        )
    }

    me.prepareData = function (params, data, callback) {
        callback(data);
    };

    me.getData = function (params, callback) {
        getCountData(params, function (data) {
            me.prepareData(params, data, callback);
        });
    };

    return me;
};
