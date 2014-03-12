var
	storage = require('./../lib/tweets_mongo').MyLittleTweets();
storage.clearAll(function () {
	console.log('whatever');
})
