var fs = require('fs');
var moment = require('moment');
var config = require('./../config.js');
var utils = require('./../lib/utils.js').Utils();

var done = {};
var invalidtweetids = [];

function repack(t) {
    return   {
        created_at: t.created_at,
        id_str: t.id_str,
        text: t.text,
        entities: t.entities,
        user: t.user,
        in_reply_to_status_id_str: t.in_reply_to_status_id_str,
        in_reply_to_user_id_str: t.in_reply_to_user_id_str,
        in_reply_to_screen_name: t.in_reply_to_screen_name,
        source: t.source,
        retweeted_status: t.retweeted_status
    };
}

function fixCouchrepack(t) {
    return repack(t.value);
}

function fixSqliterepack(t) {
    if (t.text.toLowerCase().indexOf('#aufschrei') < 0) {
        return null;
    }
    var t1 = repack(t);
    t1.user = {
        "name": t["from_user_name"],
        "id_str": t["from_user_id_str"],
        "id": t["from_user_id"],
        "screen_name": t["from_user"],
        "profile_image_url_https": t["profile_image_url_https"],
        "profile_image_url": t["profile_image_url"]
    };
    return t1;
}

function fixCVSrepack(t) {
    var dates = t.created_at.split(' ');
    if (dates[dates.length - 1] == 2013) {
        t.created_at = dates[0].toString() + ', ' + dates[2].toString() + ' ' + dates[1].toString() + ' ' +
            dates[5].toString() + ' ' +
            dates[3].toString() + ' ' +
            dates[4].toString();
    }
    if (!t.in_reply_to_status_id)
        delete t.in_reply_to_status_id;
    if (!t.in_reply_to_user_id_str)
        delete t.in_reply_to_user_id_str;
    if (!t.in_reply_to_user_id)
        delete t.in_reply_to_user_id;
    if (!t.in_reply_to_screen_name)
        delete t.in_reply_to_screen_name;
    if (!t.in_reply_to_status_id_str)
        delete t.in_reply_to_status_id_str;
    if (!t.geo)
        delete t.geo;
    if (!t.coordinates)
        delete t.coordinates;
    if (!t.contributors)
        delete t.contributors;
    if (!t.place)
        delete t.place;
    if ((t.in_reply_to_status_id) && (!t.in_reply_to_status_id_str)) {
        t.in_reply_to_status_id_str = t.in_reply_to_status_id;
    }
    var newt = repack(t);
    var t2 = t.retweeted_status;
    if (t2)
        newt.retweeted_status = fixCVSrepack(t2);
    return newt;
}

var files = [
    {name: 'import/1_import_from_csv.json', repack: fixCVSrepack},
    {name: 'import/2_import_unknown_collection.json'},
    {name: 'import/3_import_tweetstorm_all_docs.json', repack: fixCouchrepack},
    {name: 'import/4_import_from_sqlite.json', repack: fixSqliterepack}
];

function saveIDs(list) {
    console.log('saving tweetids');
    var ids = list.map(function (t) {
        return t.id_str;
    }).filter(function (t) {
        return t;
    }).concat(invalidtweetids);
    fs.writeFileSync(config.datapath + 'tweetids.json', JSON.stringify(ids, null, '\t'), 'utf8');
}

utils.loadDayJsonFiles(config.datapath + 'import/cleaned/', function (cleaned) {

    var list = [];

    var importTweets = function (msgs, o) {
        var count = 0, dups = 0, invalid = 0;
        msgs.forEach(function (t) {
            if ((!t) || (t.error)) {
//            console.log(t);
                return;
            }
            if (t.doc)
                t = t.doc.tweet;
            if (!t.id_str)
                t.id_str = t.id;
            if (!t.id_str) {
                invalid++;
//                console.log(t);
                return;
            }

            if (done[t.id_str]) {
//            console.log('dup', t, done[t.id_str]);
                dups++;
            } else {
                count++;
                var packed;
                if (o.repack)
                    packed = o.repack(t);
                else
                    packed = repack(t);
                if (packed) {
                    if ((!packed.user) || (!packed.user.screen_name)) {
                        invalid++;
                        invalidtweetids.push(packed.id_str);
                        console.log('invalid user in tweet found');
                        return;
                    }
                    done[t.id_str] = packed;
                    list.push(packed);
                } else {
                    invalid++;
                    invalidtweetids.push(t.id_str);
                }
            }
        });
        console.log(o.name, ':', count, 'dups:', dups, 'invalid:', invalid);
    };

    importTweets(cleaned, {name: 'cleaned', repack: repack});

    files.forEach(function (o) {
        var msgs = JSON.parse(fs.readFileSync(config.datapath + o.name, 'utf8'));
        importTweets(msgs, o);
    });

    utils.storeDayJsonFiles(list, config.datapath + 'tweets/', function () {
        saveIDs(list);
    });

});

