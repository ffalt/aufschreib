console.log('[Server] start');
var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	passportSocketIo = require("passport.socketio"),
	passport = require('passport'),
	util = require('util'),
	url = require('url'),
	consts = require('./consts'),
	config = require('./config'),
	LocalStrategy = require('passport-local').Strategy,
	cmd = require('./cmd').MyLittleCmds();
var
	sessionstore = new express.session.MemoryStore;

var users = [
	{ id: 1, username: 'admin', password: 'totalsupergehaim' }
	// ,
	//{ id: 2, username: 'yetzt', password: '<3' }
	//{ id: 3, username: 'ffalt', password: '<3' }
];

function findById(id, fn) {
	var idx = id - 1;
	if (users[idx]) {
		fn(null, users[idx]);
	} else {
		fn(new Error('User ' + id + ' does not exist'));
	}
}

function findByUsername(username, fn) {
	for (var i = 0; i < users.length; i++) {
		var user = users[i];
		if (user.username === username) {
			return fn(null, user);
		}
	}
	return fn(null, null);
}

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.
passport.serializeUser(function (user, done) {
	done(null, user.id);
});

passport.deserializeUser(function (id, done) {
	findById(id, function (err, user) {
		done(err, user);
	});
});


// Use the LocalStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a username and password), and invoke a callback
//   with a user object.  In the real world, this would query a database;
//   however, in this example we are using a baked-in set of users.
passport.use(new LocalStrategy(
	function (username, password, done) {
		// asynchronous verification, for effect...
		process.nextTick(function () {

			// Find the user by username.  If there is no user with the given
			// username, or the password is not correct, set the user to `false` to
			// indicate failure and set a flash message.  Otherwise, return the
			// authenticated `user`.
			findByUsername(username, function (err, user) {
				if (err) {
					return done(err);
				}
				if (!user) {
					return done(null, false, { message: 'Unknown user ' + username });
				}
				if (user.password != password) {
					return done(null, false, { message: 'Invalid password' });
				}
				return done(null, user);
			})
		});
	}
));

// configure Express
app.configure('all', function () {
	app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');
	app.use(express.compress());
	app.use(express.favicon(__dirname + '/static/images/favicon.ico'));
	app.use('/static', express.static(__dirname + '/static'));
	if (config.debug) {
		app.use(express.logger('dev'));
	}
	app.use(express.cookieParser());
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.session({ secret: 'keyboard cat is happy', store: sessionstore }));
	// Initialize Passport!  Also use passport.session() middleware, to support
	// persistent login sessions (recommended).
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(function (err, req, res, next) {
		console.error(err.stack);
		res.render('gurumeditation', { status: 404, url: req.url, stack: err.stack, message: 'Something broke!' });
	});
});

app.get('/', function (req, res) {
	if (!req.user) {
		res.render('login', { user: req.user, url: req.url, message: null});
	} else {
		//console.log('[Server] Processing: ' + req.url);
		cmd.process(req, res);
	}
});

app.post('/bulk', function (req, res) {
	if (!req.user) {
		res.send(401);
	} else {
		cmd.bulkinsert(req, res);
	}
});

app.post('/user/create', function (req, res) {
	if (!req.user) {
		res.send(401);
	} else if (req.user.id > 1) {
		res.send(401);
	} else {
		cmd.createuser(req, res);
	}
});

app.get('/login', function (req, res) {
	res.render('login', { user: req.user, message: req.session.messages });
});

app.post('/login', passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }),
	function (req, res) {
		cmd.initUser(req, res, function () {
			res.redirect('/');
		});
	});

app.get('/logout', function (req, res) {
	req.logout();
	res.redirect('/');
});

io.enable('browser client minification');  // send minified client
io.enable('browser client etag');          // apply etag caching logic based on version number
io.enable('browser client gzip');          // gzip the file
io.set('log level', 1);                    // reduce logging
io.set('transports', [
	'websocket'
	, 'flashsocket'
	, 'htmlfile'
	, 'xhr-polling'
	, 'jsonp-polling'
]);
io.set("authorization", passportSocketIo.authorize({
	key: 'connect.sid',       //the cookie where express (or connect) stores its session id.
	secret: 'keyboard cat is happy', //the session secret to parse the cookie
	store: sessionstore,     //the session store that express uses
	fail: function (data, accept) {     // *optional* callbacks on success or fail
		accept(null, false);             // second param takes boolean on whether or not to allow handshake
	},
	success: function (data, accept) {
		accept(null, true);
	}
}));

io.sockets.on('connection', function (socket) {
	console.log("user connected: ", socket.handshake.user.id);
	cmd.socket(socket);
});


cmd.init(function () {
	server.listen(config.server_settings.port, config.server_settings.listento);
	console.log('[Server] running away at http://' + config.server_settings.listento + ':' + config.server_settings.port);
});
