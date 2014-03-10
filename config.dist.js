var path = require('path');

function expandPath() {
    return path.resolve(__dirname, './data/') + '/';
}


module.exports = {
    updatemongodb: false,
    debug: false,
    twitter_bot: {
        token: "",
        secret: "",
        consumerKey: "",
        consumerSecret: "",
        user_agent: 'aufschreib twitter bot v0.1'
    },
    mongo_settings: {
        "hostname": "localhost",
        "port": 27017,
        "username": "aufschreib",
        "password": "aufschreib",
        "name": "aufschreib",
        "db": "aufschreib"
    },
    server_settings: {
        listento: '0.0.0.0',  // \o_ listen to ALL the adapters
        port: 8081
    },
    datapath: expandPath
};
