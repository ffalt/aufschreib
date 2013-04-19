const debug = true;
const storages = ('files', 'mysql', 'mongo');
const storage = 'mongo';
const mongo_settings = {
	"hostname": "localhost",
	"port": 27017,
	"username": "aufschreib",
	"password": "aufschreib",
	"name": "aufschreib",
	"db": "aufschreib"
};
const file_settings = {
	path: './data/'
}
const mysql_settings = {
	host: 'localhost',
	user: 'aufschreib',
	password: 'secret',
	database: 'aufschreib',
	supportBigNumbers: true,
	debug: false,
	connectionLimit: 100
};
const server_settings = {
	listento: '0.0.0.0',  // \o_ listen to ALL the adapters
	port: 8081
};

var
	path = require('path');

function expandPath() {
	return path.resolve(__dirname, file_settings.path) + '/';
}

module.exports = {
	debug: debug,
	storage: storage,
	mongo_settings: mongo_settings,
	mysql_settings: mysql_settings,
	server_settings: server_settings,
	datapath: expandPath
};
