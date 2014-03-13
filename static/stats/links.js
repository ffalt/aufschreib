function linksView() {
    var
        options = {
            type: 'links',
            mode: 'human',
            cat: null,
            kind: null,
            id: 'links_'
        };

    function init(id, mode, kind, statshelper) {
        stats = statshelper;
        options.id = id;
        options.mode = mode;
//        initSVG();
        linkUI();
        request();
    }

    function request() {
        stats.requestData(options, generate);
    }

    function generate() {
        var data = stats.getBaseData();

        var table = {
            head: [
                '1.Datum',
                'Adresse',
                'Anzahl'],
            values: data.map(function (entry) {
                var o = [
                    moment(entry.first).format('DD.MM.YY')+'&nbsp;'+moment(entry.first).format('HH:mm'),
                        '<a target="_blank" href="' + entry.url + '">' + entry.url + '</a>',
                    entry.count ];
                return o;
            })
//            foot: ['', data.length]
        };
        stats.buildTable('#table', table);
        stats.setData(data);
    }

    function linkUI() {
        stats.linkUIDefault(options.id);
//        stats.linkUIReloads(options, ['mode'], request);
//        stats.linkUIRegens(options, ['cat'], request);
//        stats.selectActives(options, ['mode', 'cat']);
    }

    return {
        init: init,
        request: request
    };
}