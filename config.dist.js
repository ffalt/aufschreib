const debug = true;
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
	mongo_settings: mongo_settings,
	server_settings: server_settings,
	datapath: expandPath
};
