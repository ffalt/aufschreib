/*

	train & apply the bayes clasifier

 */
var classifier = require('classifier');
var tokenizer = require('./tweet_tokenizer').MyLittleTweetTokenizer();
var consts = require('./consts');

exports.MyLittleClassifier = function () {
	var me = this;

	function fight(voteuserid, classi, store, callback) {
		var count = 0;
		var result = [];
		store.enumerateTweetsAndCats(voteuserid, function (tweet) {
			if (!tweet) {
				console.log('[Classify] Classified ' + count);
				store.setMachineCats(voteuserid, result, function () {
					console.log('[Classify] New Classify saved ' + result.length);
					callback(true);
				});
			} else {
				count++;
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

	me.classify = function (voteuserid, store, callback) {
		console.log('[Classify] Training');
		var count = 0,
			classi = new classifier.Bayesian({
				thresholds: consts.thresholds
			});
		store.enumerateTweetsAndCats(voteuserid, function (tweet) {
			if (!tweet) {
				if (count === 0) {
					callback(false);
				} else {
					console.log('[Classify] Fighting based on ' + count + ' entries');
					fight(voteuserid, classi, store, callback);
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
