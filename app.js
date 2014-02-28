console.log('[Server] start');
var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	passportSocketIo = require("passport.socketio"),
	passport = require('passport'),
	util = require('util'),
	url = require('url'),
	consts = require('./lib/consts'),
	config = require('./config'),
	LocalStrategy = require('passport-local').Strategy,
	cmd = require('./lib/cmd').MyLittleCmds();
var
	sessionstore = new express.session.MemoryStore;


passport.serializeUser(function (user, done) {
	done(null, user.id);
});

passport.deserializeUser(function (id, done) {
	cmd.findUserById(id, function (err, user) {
		done(err, user);
	});
});

passport.use(new LocalStrategy(
	function (username, password, done) {
		process.nextTick(function () {
			cmd.validateUser(username, password, function (err, user) {
				if (err) {
					return done(err);
				}
				if (!user) {
					console.error('[Server] Auth failed ' + username);
					return done(null, false, { message: 'Invalid Credentials'});
				}
				return done(null, user);
			});

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
			console.log('[Server] User login: ' + req.user.name);
			res.redirect('/');
		});
	}
);

app.get('/logout', function (req, res) {
	cmd.logoutUser(req, res, function () {
		req.logout();
		res.redirect('/');
	});
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
	//console.log("user connected: ", socket.handshake.user.id);
	cmd.socket(socket);
});


cmd.init(function () {
	server.listen(config.server_settings.port, config.server_settings.listento);
	console.log('[Server] running away at http://' + config.server_settings.listento + ':' + config.server_settings.port);
});
