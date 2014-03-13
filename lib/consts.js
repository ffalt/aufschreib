const basecats = [
    {
        id: 'outcry',
        name: 'Aufschrei',
        hint: 'Tweet, der von einer Aufschrei-Situation berichtet',
        icon: 'glyphicon-bullhorn',
        color: '#5e8c6A'
    },
    {
        id: 'comment',
        name: 'Kommentar',
        hint: 'Tweet, in dem #aufschrei besprochen wird, aber keine Aufschrei-Situation geschildert wird',
        icon: 'glyphicon-comment',
        color: '#bfb35a'
    },
    {
        id: 'troll',
        name: 'Troll',
        hint: 'Tweet, der keinen konstruktiven Betrag liefert, z.b. feindlich ist',
        icon: 'glyphicon-thumbs-down',
        color: '#8c2318'
    },
    {
        id: 'report',
        name: 'Links',
        hint: 'Tweet, der nur Überschrift und Link zu einem Medienbeitrag enthält (z.B. Blogs, Artikeln, Videos)',
        icon: 'glyphicon-share-alt',
        color: '#98abc5'
    },
    {
        id: 'spam',
        name: 'Spam',
        hint: 'Tweet, der überhaupt keinen Bezug enthält und ggf. auf Werbeseite verlinkt',
        icon: 'glyphicon-trash',
        color: '#ff8c00'
    },
    {
        id: 'unknown',
        name: 'Unbekannt',
        hint: 'Bisher nicht bewerteter Tweet',
        icon: 'glyphicon-question-sign',
        color: '#f2c45a'
    }
];
const unknown = 'unknown';
const defaultmode = 'human';
const modes = [
    {
        id: 'human',
        name: 'Deine Bewertungen',
        icon: 'glyphicon-user'
    },
    {
        id: 'machine',
        name: 'Maschinelle Vorschläge',
        icon: 'glyphicon-th'
    }
];
const wordkinds = [
    {
        id: 'word',
        name: 'Wörter',
        hint: 'Die häufigsten Wörter',
        icon: 'glyphicon-custom-quote-left'
    },
    {
        id: 'user',
        name: 'Konten',
        hint: 'Konten mit den meisten Tweets',
        icon: 'glyphicon-user'
    },
    {
        id: 'hash',
        name: 'Hashtags',
        hint: 'Die häufigsten Hashtags',
        icon: 'glyphicon-custom-hashtag'
    },
    {
        id: 'mention',
        name: 'Mentions',
        hint: 'Die häufigsten angesprochenen Accounts',
        icon: 'glyphicon-custom-mention'
    },
    {
        id: 'client',
        name: 'Apps',
        hint: 'Die häufigsten verwendeten Programme/Webseiten',
        icon: 'glyphicon-custom-app'
    },
    {
        id: 'link',
        name: 'Links',
        hint: 'Die häufigsten Links',
        icon: 'glyphicon-link'
    }
];
const graphkinds = [
    {
        id: 'mention',
        name: 'Mentions',
        icon: 'glyphicon-reply'
    }
];

const pois = [
    {min: 'Fri Jan 25 2013 00:26:00 GMT+0100', max: 'Fri Jan 25 2013 02:00:00 GMT+0100',
        name: 'Die ersten Stunden', info: ''},

    {min: 'Fri Jan 25 2013 00:26:00 GMT+0100', max: 'Sun Jan 27 2013 00:26:00 GMT+0100',
        name: 'Die ersten 48 Stunden', info: ''},

    {min: 'Fri Jan 25 2013 08:30:00 GMT+0100', max: 'Fri Jan 25 2013 10:00:00 GMT+0100',
        name: 'Der erste Morgen', info: '9:18 erster Link Zeitungsartikel Frankfurter Rundschau'},


    {min: 'Sun Jan 27 2013 21:30:00 GMT+0100', max: 'Sun Jan 27 2013 23:00:00 GMT+0100',
        name: 'ARD: Günther Jauch', info: '"Herrenwitz mit Folgen - hat Deutschland ein Sexismusproblem?" - Gäste: Anne Wizorek, Silvana Koch-Mehrin, Alice Schwarzer, Thomas Osterkorn, Hellmuth Karasek, Wibke Bruhns'},

    {min: 'Mon Jan 28 2013 19:30:00 GMT+0100', max: 'Mon Jan 28 2013 21:00:00 GMT+0100',
        name: 'Abend vor ZDF Login', info: ''},

    {min: 'Mon Jan 28 2013 22:25:00 GMT+0100', max: 'Tue Jan 29 2013 00:00:00 GMT+0100',
        name: 'ZDF: Login', info: '“Grabschen, glotzen, Sprüche klopfen: Sind Frauen Macho-Opfer?” - Gäste: Laura Dornheim, Maximilian Pütz'},

    {min: 'Wed Jan 30 2013 22:15:00 GMT+0100', max: 'Thu Jan 31 2013 00:00:00 GMT+0100',
        name: 'RTL: Stern TV', info: '"" - Gäste: Anne Wizorek, Nicole von Horst'},

    {min: 'Wed Jan 30 2013 22:45:00 GMT+0100', max: 'Thu Jan 31 2013 00:00:00 GMT+0100',
        name: 'ARD: Anne Will', info: '"Sexismus-Aufschrei - hysterisch oder notwendig?" - Gäste: Renate Künast, Anke Domscheit-Berg, Heiner Geißler, Jan Fleischhauer, Monika Ebeling'},

    {min: 'Tue Jan 29 2013 22:30:00 GMT+0100', max: 'Wed Jan 30 2013 00:00:00 GMT+0100',
        name: 'ZDF: Markus Lanz', info: '- Gäste: Katja Suding, Katrin Sass, Peer Kusmagk, Karl Dall, Matthias Matussek'},

    {min: 'Wed Jan 30 2013 22:30:00 GMT+0100', max: 'Thu Jan 31 2013 00:00:00 GMT+0100',
        name: 'ZDF: Markus Lanz', info: '- Gäste: Dirk Steffens, Martin Lindner, Jutta Ditfurth, G. G. Anderson, Franziska Knuppe, Ole Lehmann'},

    {min: 'Thu Jan 31 2013 22:15:00 GMT+0100', max: 'Fri Feb 01 2013 00:00:00 GMT+0100',
        name: 'ZDF: Maybritt Illner', info: '"Schote, Zote, Herrenwitz - ist jetzt Schluss mit lustig?" - Gäste: Christina Frank, Ralf Höcker, Claudia Roth, Wolfgang Kubicki, Sophia Thomalla'},

    {min: 'Thu Jan 31 2013 23:30:00 GMT+0100', max: 'Fri Feb 01 2013 00:00:00 GMT+0100',
        name: 'ZDF: Markus Lanz', info: '- Gäste: Andreas Petzold, Kelle, Werner Schneyder, Heino, Christine Kaufmann'}
];

const stats = [
    {
        id: 'pie',
        name: 'Kuchen',
        kinds: [],
        maxentries: 0,
        defaultkind: null,
        icon: 'disabled-glyphicon-circle-blank',
        usesCats: false,
        usesMode: true
    },
    {
        id: 'bar',
        name: 'Balken',
        thresholds: 1,
        maxentries: 30,
        defaultkind: 'word',
        kinds: wordkinds,
        icon: 'disabled-glyphicon-bar-chart',
        usesCats: false,
        usesMode: true
    },
    {
        id: 'time',
        name: 'Zeit',
        maxentries: 0,
        defaultkind: null,
        kinds: [],
        icon: 'disabled-glyphicon-indent-left',
        usesCats: false,
        usesMode: true
    },
    {
        id: 'hashtags',
        name: 'Tags',
        maxentries: 0,
        defaultkind: null,
        kinds: [
            {
                id: 'tags',
                name: 'Tags',
                hint: 'Die häufigsten Hashtags',
                icon: 'glyphicon-custom-hashtag'
            }
        ],
        icon: 'disabled-glyphicon-indent-left',
        usesCats: true,
        usesMode: true
    },
    {
        id: 'cloud',
        name: 'Wolke',
        maxentries: 250,
        thresholds: 10,
        defaultkind: 'word',
        kinds: wordkinds,
        icon: 'disabled-glyphicon-cloud',
        usesCats: true,
        usesMode: true
    },
    {
        id: 'links',
        name: 'Links',
        maxentries: 500,
        thresholds: 3,
        defaultkind: null,
        kinds: [],
        icon: 'disabled-glyphicon-cloud',
        usesCats: false,
        usesMode: false
    },
    {
        id: 'graph',
        name: 'Netz',
        maxentries: 0,
        defaultkind: 'mention',
        kinds: graphkinds,
        icon: 'disabled-glyphicon-sitemap',
        usesCats: false,
        usesMode: true
    }
];
const thresholds = {
    spam: 3,
    troll: 2,
    report: 2,
    comment: 1,
    outcry: 1
};

function findbyid(array, id) {
    for (var i = 0; i < array.length; i++) {
        if (array[i].id === id)
            return array[i];
    }
    return null;
}

var tools = (function () {

    function catName(catid) {
        var cat = findbyid(basecats, catid);
        if (cat)
            return cat.name;
        else
            return '';
    }

    function catColor(catid) {
        var cat = findbyid(basecats, catid);
        if (cat)
            return cat.color;
        else
            return '#000';
    }

    function statinfo(statid) {
        return findbyid(stats, statid);
    }

    function validcat(catid) {
        return (findbyid(basecats, catid) !== null);
    }

    function validkind(type, kindid) {
        var info = statinfo(type);
        if (info) {
            return (findbyid(info.kinds, kindid) !== null);
        }
        return false;
    }

    function infokind(type, kindid) {
        var info = statinfo(type);
        if (info) {
            return findbyid(info.kinds, kindid);
        }
        return null;
    }

    function validstat(statid) {
        return (findbyid(stats, statid) !== null);
    }

    function validmode(mode) {
        return ((mode === 'human') || (mode === 'machine'));
    }

    function modeName(mode) {
        return ((mode === 'human') ? modes[0] : modes[1]);
    }

    return {
        statinfo: statinfo,
        validstat: validstat,
        validmode: validmode,
        validcat: validcat,
        validkind: validkind,
        infokind: infokind,
        catName: catName,
        catColor: catColor,
        modeName: modeName
    };
})();

module.exports = {
    cats: basecats,
    unknown: unknown,
    defaultmode: defaultmode,
    thresholds: thresholds,
    stats: stats,
    tools: tools,
    modes: modes,
    pois: pois
};
