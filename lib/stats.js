/*

 API für Stats-Data, liefert wenn vorhanden aus dem File-basierten Cache

 in Pfad /data/stats

 Parameter: (siehe auch consts.js)
 type - Typ der Daten (für Kuchen, Zeitleiste, etc)
 mode - die menschliche Bewertung oder die des Algorithmus
 cat - Kategorie zum Filtern (wird aber auch von den d3-charts im Client-Browser gemaacht, damit dafür nicht neu geholt werden muss)
 kind - ggf. Untertyp der Daten, z.B. Wortstatistik für Twitterclients|Links|Hashtags

 store - die Tweet-Daten-Ablage (DB|Files)
 voteuserid - UserID der Bewertungen
 forcegenerate - Daten nicht aus dem Cache nehmen

 */

var fs = require('fs');
var consts = require('./consts');
var config = require('./../config');
var wordstat = require('./stats_words').MyLittleWordStat();
var timestat = require('./stats_time').MyLittleTimeStat();
var hashtags = require('./stats_hashtags').MyLittleHashtagStat();
var piestat = require('./stats_pie').MyLittlePieStat();
var graphstat = require('./stats_graph').MyLittleGraphStat();

exports.MyLittleStats = function () {
    var me = this;

    /* ParameterHelper (Validierung  etc.) */

    function StatsParams() {
        this.voteuserid = 0;
        this.store = null;
        this.type = ''; //data-ttype
        this.mode = ''; //human / machine
        this.cat = null; //classification
        this.kind = null; //data-subtype
        this.forcegenerate = false;
        this.min = null; //min date as int
        this.max = null; //max date as int

        this.getChartContainerId = function () {
            return 'stats_' + this.type +
                (this.cat ? '_all' : '') + '_' +
                this.mode + (this.kind ? '_' + this.kind : '');
        };

        this.isValid = function () {
            return consts.tools.validstat(this.type) &&
                consts.tools.validmode(this.mode) &&
                ( (!this.cat) || consts.tools.validcat(this.cat) ) &&
                ( (!this.kind) || consts.tools.validkind(this.type, this.kind) );
        };
    }

    /* bring ParameterHelper to life */

    me.getParams = function (voteuserid, store, type, mode, cat, kind, forcegenerate, min, max) {
        var result = new StatsParams();
        result.voteuserid = voteuserid;
        result.store = store;
        result.type = type;
        result.mode = mode;
        result.cat = cat;
        result.kind = kind;
        result.min = min;
        result.max = max;
        result.forcegenerate = forcegenerate;
        return result;
    };

    /* welches Schweinderl hättens denn gern */

    function getStat(params) {
        switch (params.type) {
            case 'graph':
                return graphstat;
                break;
            case 'time':
                return timestat;
                break;
            case 'hashtags':
                return hashtags;
                break;
            case 'cloud':
                return wordstat;
                break;
            case 'bar':
                return wordstat;
                break;
            default: //'pie'
                return piestat;
                break;
        }
    }

    /** API **/

    me.getChartData = function (params, callback) {
        getStat(params).getData(params, function (data) {
            callback(data);
        });
    };

    return me;
};
