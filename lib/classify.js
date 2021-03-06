/*

 train & apply the bayes clasifier

 */
var classifier = require('classifier');
var tokenizer = require('./utils').Utils();
var consts = require('./consts');

exports.MyLittleClassifier = function () {
    var me = this;

    function fight(voteuserid, classi, store, logcb, callback) {
        var count = 0;
        var result = [];
        store.enumerateTweetsAndCats(voteuserid, function (tweet) {
            if (!tweet) {
                logcb('Speichere ' + result.length + ' neue Vorschläge');
                store.setMachineCats(voteuserid, result, function () {
                    logcb('Vorschläge aktualisert für ' + count + ' Tweets');
                    callback(true);
                });
            } else {
                count++;
                if (count % 10000 === 0) {
                    if (!logcb('...' + count + ' Tweets')) {
                        callback(true);
                        return true;
                    }
                }
                var newclass;
                if (tweet.human === consts.unknown) {
                    newclass = classi.classify(tokenizer.cleanKeepLinks(tweet.text));
                    newclass = ((newclass === 'unclassified') ? consts.unknown : newclass);
                } else {
                    newclass = tweet.human;
                }
                if (tweet.machine !== newclass) {
                    tweet.machine = newclass;
                    result.push(tweet);
                }
            }
        });
    }

    me.classify = function (voteuserid, store, logcb, callback) {
        var count = 0,
            classi = new classifier.Bayesian({
                thresholds: consts.thresholds
            });
        store.enumerateTweetsAndCats(voteuserid, function (tweet) {
            if (!tweet) {
                if (count === 0) {
                    callback(false);
                } else {
                    if (logcb('Grundlage bewertete Tweets: ' + count + '')) {
                        fight(voteuserid, classi, store, logcb, callback);
                    } else {
                        return true;
                    }
                }
            } else if (tweet.human != consts.unknown) {
                var cleantext = tokenizer.cleanKeepLinks(tweet.text);
                classi.train(cleantext, tweet.human);
                count += 1;
            }
        });
    };

    return me;
};
