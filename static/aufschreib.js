var aufschreib = {
    data: ['human_unknown', 'machine_unknown', 'machine_outcry',
        'machine_report', 'machine_comment', 'machine_troll', 'machine_spam'],
    search: '',
    def_range: {
        min: null,
        max: null
    },
    range: {
        min: null,
        max: null
    },
    stats: {
        mode: 'human',
        type: 'pie',
        cat: null,
        kind: null
    },
    current: '',
    connected: false,
    connectedlog: '',
    connectedloghistory: '',
    closethings: false,
    route: {
        default: 'start',
        hash: '',
        subs: []
    },
    error: function (msg) {
        $('#alert').remove();
        $('body').prepend($(
                '<div id="alert" class="alert alert-danger">' +
                '<button data-dismiss="alert" class="close" type="button">×</button>' +
                '<h4 class="alert-heading">Oh snap! You got an error!</h4>' +
                '<p>' + msg + '</p>' +
                '</div>'
        ));
    },
    blendProgressIn: function (sender) {
        if (sender) {
            $('#overlay-inline').remove();
            $(sender).prepend('<div id="overlay-inline"><div class="overlay-img"></div></div>');
            $('#overlay-inline').fadeIn('fast');
        } else {
            $('#overlay').fadeIn('fast');
        }
    },
    blendProgressOut: function (sender) {
        if (sender) {
            $('#overlay-inline').remove();
        }
        if (!sender) {
            $('#overlay').fadeOut('fast');
        }
    },
    getJson: function (sender, params, successcallback) {
        var timeout = setTimeout(function () {
            aufschreib.blendProgressIn(sender);
        }, 2000);
        $.ajax({
            url: '',
            dataType: 'json',
            data: params,
            success: function (data) {
                clearTimeout(timeout);
                aufschreib.blendProgressOut(sender);
                successcallback(data);
            },
            error: function (xhr, ts, err) {
                clearTimeout(timeout);
                aufschreib.blendProgressOut(sender);
                aufschreib.error(xhr.status + ': ' + err);
                //alert(xhr.status + ': ' + err);
            }
        });
    },
    get: function (sender, url, params, success) {
        if (sender)
            var timeout = setTimeout(function () {
                aufschreib.blendProgressIn(sender);
            }, 2000);
        $.ajax({
            url: url,
            dataType: 'html',
            data: params,
            success: function (data) {
                clearTimeout(timeout);
                if (sender)
                    aufschreib.blendProgressOut(sender);
                success(data);
            },
            error: function (xhr, ts, err) {
                clearTimeout(timeout);
                if (sender)
                    aufschreib.blendProgressOut(sender);
                aufschreib.error(xhr.status + ': ' + err);
                //alert(xhr.status + ': ' + err);
            }
        });
    },
    loadMore: function (userid) {
        var div = $('#' + userid);
        var params = {
            cmd: 'user',
            id: userid
        };
        aufschreib.get(div, '', params,
            function (data) {
                var pnode = $(div).parent();
                $(div).replaceWith(data);
                aufschreib.connectCatChange(pnode);
            });
        return false;
    },
    checkVoted: function (sender) {
        var tweets = $(sender).find('.tweet');
        var pressedbtns = $(sender).find('a[class*=active]');
        if (tweets.length == pressedbtns.length) {
            $(sender).closest(".user").remove();
        }
        aufschreib.checkNext();
        return false;
    },
    checkNext: function () {
        var users = $(".user");
        if (users.length === 0) {
            $("#btn-next").click();
        }
    },
    setActiveCat: function (div, cat) {
        div.find('a[class*=active]').removeClass('active').removeClass('btn-primary');
        div.find('a[value*=' + cat + ']').addClass('active').addClass('btn-primary');
//		if (cats) { //from global namespace
//			cats.forEach(function (c) {
//				if (c.id == cat) {
//					cat = c.name;
//				}
//			})
//		}
        if ((!cat) || (cat == 'unknown') || (cat == ''))
            div.find('.tweet-classy').removeClass('hidden');
        else
            div.find('.tweet-classy').addClass('hidden');
//		div.find('.tweet-human').text(cat);
    },
    voteTweet: function (sender, cat) {
        var div = $(sender).closest(".tweet");
        var tweetid = $(div).attr('id');
        var params = {
            cmd: 'set',
            id: tweetid,
            cat: cat
        };
        aufschreib.get(div, '', params,
            function (data) {
                if (data) {
                    aufschreib.setActiveCat(div, cat);
                    if (aufschreib.closethings) {
                        aufschreib.checkVoted($(sender).closest(".user"));
                    }
                }
            });
        return false;
    },
    voteIds: function (parentdiv, ids, divs, cat) {
        var params = {
            cmd: 'setall',
            ids: ids.join(','),
            cat: cat
        };
        aufschreib.get(parentdiv, '', params,
            function (data) {
                if (data) {
                    divs.forEach(function (adiv) {
                        aufschreib.setActiveCat(adiv, cat);
                    });
                    if (aufschreib.closethings) {
                        aufschreib.checkVoted(parentdiv);
                    }
                }
            });
    },
    voteAll: function (sender, cat) {
        var ids = [];
        var divs = [];
        var div = $(sender).closest(".user");
        $(div).find('div[class=tweet]').each(
            function () {
                divs.push($(this));
                ids.push($(this).attr('id'));
            }
        );
        var maxdivs = divs.splice(0, 100);
        var maxids = ids.splice(0, 100);
        while (maxids.length > 0) {
            aufschreib.voteIds(div, maxids, maxdivs, cat);
            maxdivs = divs.splice(0, 100);
            maxids = ids.splice(0, 100);
        }
        return false;
    },
    connectCatChange: function (sender) {
        $(sender).find(".btn-tweet").each(function () {
            $(this).unbind("click");
            $(this).click(function () {
                var value;
                if ($(this).hasClass('active'))
                    value = 'unknown';
                else
                    value = $(this).attr('value');
                aufschreib.voteTweet(this, value);
                return false;
            });
        });
        $(sender).find(".tweet-close").each(function () {
            $(this).unbind("click");
            $(this).click(function () {
                    var user = $(this).closest(".user");
                    if ($(user).find('.tweet').length <= 1) {
                        $(user).remove();
                    } else
                        $(this).closest(".tweet").remove();
                    return false;
                }
            );
        });
        $(sender).find(".user-close").each(function () {
            $(this).unbind("click");
            $(this).click(function () {
                $(this).closest(".user").remove();
                aufschreib.checkNext();
                return false;
            });
        });
        $(sender).find(".btn-user").each(function () {
            $(this).unbind("click");
            $(this).click(function () {
                aufschreib.voteAll(this, $(this).attr('value'));
                return false;
            });
        });
    },
    makeListParams: function () {
        var result = {
            cmd: 'list',
            filter: aufschreib.data.join(',')
        };
        if (aufschreib.search.length > 0) {
            result.search = encodeURIComponent(aufschreib.search);
        }
        if ((aufschreib.range.min) && (aufschreib.range.max)) {
            result.rangegte = aufschreib.range.min.valueOf();
            result.rangelte = aufschreib.range.max.valueOf();
        }
        return result;
    },
    nextList: function (sender) {
        $(sender).addClass('disabled');
        $(sender).html('<div class="process-img"></div> <span>Lade die nächsten Tweets...</span>');
        var id = $(sender).attr('value');
        var params = aufschreib.makeListParams();
        params.id = id;
        aufschreib.get(null, '', params, function (data) {
            var pnode = $(sender).parent();
            $(sender).replaceWith(data);
            aufschreib.connectCatChange(pnode);
        });
        return false;
    },
    applyfilter: function () {
        $('#modal-filter input[type="checkbox"]').each(
            function () {
                var pos = $.inArray($(this).attr('value'), aufschreib.data);
                if ($(this).attr('checked')) {
                    if (pos < 0) {
                        aufschreib.data.push($(this).attr('value'));
                    }
                } else if (pos >= 0) {
                    aufschreib.data.splice(pos, 1);
                }
            }
        );
    },
    clearContent: function () {
        $('#content').html('<div style="width:100%; height:200px;"><div class="overlay-img"></div></div>');
    },
    request: function () {
        aufschreib.clearContent();
        aufschreib.current = 'vote';
        var params = aufschreib.makeListParams();
        aufschreib.get(null, '', params, function (data) {
            if (aufschreib.current != 'vote')
                return;
            var content = $('.content');
            content.html(data);
            aufschreib.connectCatChange(content);
        });
        return false;
    },
    requestStart: function () {
        aufschreib.clearContent();
        aufschreib.current = 'start';
        var params = {cmd: 'start'};
        aufschreib.get(null, '', params, function (data) {
            if (aufschreib.current != 'start')
                return;
            $('#content').html(data);
        });
        return false;
    },
    requestCommands: function () {
        aufschreib.clearContent();
        aufschreib.current = 'commands';
        var params = {cmd: 'commands'};
        aufschreib.get(null, '', params, function (data) {
            if (aufschreib.current != 'commands')
                return;
            $('#content').html(data);
            aufschreib.setProcessing(aufschreib.connected, aufschreib.connectedlog);
        });
        return false;
    },
    requestChart: function () {
        aufschreib.clearContent();
        aufschreib.current = 'charts';
        $('li', '#nav-stats').removeClass('active');
        $('a[href*=' + aufschreib.stats.type + ']', '#nav-stats').parent().addClass('active');
        var params = {cmd: 'chart', type: aufschreib.stats.type, mode: aufschreib.stats.mode};
        if (aufschreib.stats.cat) {
            params.cat = aufschreib.stats.cat;
        }
        if (aufschreib.stats.kind) {
            params.kind = aufschreib.stats.kind;
        }
        aufschreib.get(null, '', params, function (data) {
            if (aufschreib.current != 'charts')
                return;
            $('#content').html(data);
        });
        return false;
    },
    connectIo: function (cmd, logdiv, cb) {
        var url = window.location.protocol + "//" + window.location.host;
        var socket = io.connect(url)
            .emit('start', { cmd: cmd })
            .on('news', function (data) {
                var s = data['msg'] + '<br />';
                aufschreib.connectedloghistory += s;
                $(logdiv).append(s);
            })
            .on('success', function (data) {
                socket.emit('end', {});
                socket.disconnect();
                io.j = [];  // ugly workaround for connect -> disconnect -> connect bug in socket.io
                io.sockets = [];  //this, too
                cb(data['msg']);
            })
            .on('connect_failed', function () {
                cb('Connection error. Please reload site.');
                io.j = [];  // ugly workaround for connect -> disconnect -> connect bug in socket.io
                io.sockets = [];  //this, too
            })
            .on('fail', function (data) {
                socket.disconnect();
                var s = data['msg'] + '<br />';
                aufschreib.connectedloghistory += s;
                $(logdiv).append(s);
            });
    },
    requestClassify: function () {
        aufschreib.setProcessing(true, '#classify-result');
        aufschreib.connectIo('classify', '#classify-result', function (data) {
            aufschreib.setProcessing(false);
            $('#classify-result').html(data);
        });
        return false;
    },
    classify: function () {
        if (!aufschreib.connected)
            $('#command-modal').modal('show');
        return false;
    },
    setProcessing: function (active, log) {
        aufschreib.connected = active;
        aufschreib.connectedlog = log;
        if (active) {
            $("[id^='btn-act-']").addClass('disabled');
            $(aufschreib.connectedlog).html('<div class="process-img"></div> Vorgang läuft...<br />' +
                aufschreib.connectedloghistory);
        } else {
            $("[id^='btn-act-']").removeClass('disabled');
            aufschreib.connectedloghistory = '';
        }
    },
    updateCache: function () {
        if (aufschreib.connected) return false;
        aufschreib.setProcessing(true, '#statcache-result');
        aufschreib.connectIo('updatecache', '#statcache-result', function (data) {
            aufschreib.setProcessing(false);
            $('#statcache-result').html(data);
        });
        return false;
    },
    createUser: function () {
        if (aufschreib.connected) return false;
        var formData = $("#form-newuser").serialize();
        aufschreib.setProcessing(true, '#output-newuser');
        $.ajax({
            url: "/user/create",
            type: "POST",
            data: formData,
            success: function (data, status) {
                aufschreib.setProcessing(false);
                $("#output-newuser").text("User created!");
            },
            error: function (jqXHR, textStatus, errorMessage) {
                aufschreib.setProcessing(false);
                $("#output-newuser").text("Error " + textStatus);
            }
        });
        return false;
    },
    sendFile: function (nr) {
        if (aufschreib.connected || (!nr)) return false;
        var bulkfile = $("#bulkfile").val();
        if ((!bulkfile) || (bulkfile.trim().length === 0) || (!(/\.(json)$/ig.test(bulkfile)))) {
            $("#output-upload").text("Please choose a .json file!");
            return false;
        }
        aufschreib.setProcessing(true, '#output-upload');
        $("#form-file").ajaxSubmit({
            target: '#output-upload',
            data: {
                user: nr
            },
            success: function () {
                aufschreib.setProcessing(false);
            }
        });
        return false;
    },
    setMode: function (mode) {
        $('li', '#nav-site').removeClass('active');
        $('a[href*=' + mode + ']', '#nav-site').parent().addClass('active');
        $('#nav-edit').toggle((mode === 'edit'));
        if ((mode === 'edit') &&
            (aufschreib.range.min !== null)) {
            $('#time-filter-pane').toggle(true);
            $("#slider").dateRangeSlider('resize');
            $("#slider").dateRangeSlider('values',
                aufschreib.def_range.min,
                aufschreib.def_range.max
            );
        } else {
            if ($('#time-filter-pane').is(':visible')) {
                aufschreib.def_range.min = aufschreib.range.min;
                aufschreib.def_range.max = aufschreib.range.max;
            }
            $('#time-filter-pane').toggle(false);
        }
        $('#nav-stats').toggle((mode === 'stats'));
    },
    setStatsSilent: function (type, mode, kind, cat) {
        aufschreib.stats.type = type;
        aufschreib.stats.mode = mode;
        aufschreib.stats.kind = kind;
        aufschreib.stats.cat = cat;
        var bang = '!/stats/' + aufschreib.stats.type + '/' + aufschreib.stats.mode
            + (aufschreib.stats.kind ? '/' + aufschreib.stats.kind : '')
            + (aufschreib.stats.cat ? '/' + aufschreib.stats.cat : '');
        aufschreib.route.hash = '#' + bang;
        location.hash = bang;
    },
    routeStats: function (subs) {
        if (subs.length > 0) {
            aufschreib.stats.type = subs[0];
        } else if (!aufschreib.stats.type) {
            aufschreib.stats.type = 'pie';
        }
        if (subs.length > 1) {
            aufschreib.stats.mode = subs[1];
        } else if (!aufschreib.stats.mode) {
            aufschreib.stats.mode = 'human';
        }
        aufschreib.stats.kind = null;
        if (subs.length > 2) {
            aufschreib.stats.kind = subs[2];
        } else {
            //TODO use defaults from consts.js
            if ((aufschreib.stats.type === 'cloud') || (aufschreib.stats.type === 'bar')) {
                if (!aufschreib.stats.kind)
                    aufschreib.stats.kind = 'word';
            } else if (aufschreib.stats.type === 'graph') {
                if (!aufschreib.stats.kind)
                    aufschreib.stats.kind = 'mention';
            } else
                aufschreib.stats.kind = null;
        }
        if (subs.length > 3) {
            aufschreib.stats.cat = subs[3];
        } else {
            if ((aufschreib.stats.type !== 'cloud') && (aufschreib.stats.type !== 'bar')) {
                aufschreib.stats.cat = null;
            }
        }
        var check = '!/stats/' + aufschreib.stats.type + '/' + aufschreib.stats.mode
            + (aufschreib.stats.kind ? '/' + aufschreib.stats.kind : '')
            + (aufschreib.stats.cat ? '/' + aufschreib.stats.cat : '');

        if (location.hash !== '#' + check) {
            location.hash = check;
            return false;
        } else {
            aufschreib.setMode('stats');
            aufschreib.requestChart();
            return true;
        }
    },
    routeCommand: function () {
        aufschreib.setMode('commands');
        aufschreib.requestCommands();
        return true;
    },
    routeEdit: function () {
        aufschreib.setMode('edit');
        aufschreib.request();
        return true;
    },
    routeStart: function () {
        aufschreib.setMode('start');
        aufschreib.requestStart();
        return true;
    },
    router: function () {
        if (location.hash === '' || location.hash !== aufschreib.route.hash) {
            if ((location.hash === '') &&
                (aufschreib.route.hash === '#!/' + aufschreib.route.default)) {
                location.hash = '!/' + aufschreib.route.default;
                return false;
            }
            aufschreib.route.hash = location.hash;

            var hash = location.hash.split('/');
            if (hash.length > 0) {
                var str = [];
                for (var i = 0; i < hash.length; i++) {
                    if (hash[i] !== '#!')
                        str.push(hash[i].toLowerCase());
                }
                if (str.length === 0)
                    str.push('edit');
                aufschreib.route.subs = str;
                switch (str[0]) {
                    case 'stats':
                        str.shift();
                        aufschreib.routeStats(str);
                        break;
                    case 'commands':
                        str.shift();
                        aufschreib.routeCommand();
                        break;
                    case 'edit':
                        str.shift();
                        aufschreib.routeEdit();
                        break;
                    case 'start':
                        str.shift();
                        aufschreib.routeStart();
                        break;
                    default:
                        location.hash = '!/' + aufschreib.route.default;
                        break;
                }
            } else {
                location.hash = '!/' + aufschreib.route.default;
            }
        }
        return false;
    },
    load: function () {
        $(document).ready(function () {
            aufschreib.ready();
            aufschreib.router();
        });
    },
    ready: function () {
        $('#menu').show();
        var search = $('#search');
        search.keypress(function (e) {
            if (e.which == 13) {
                aufschreib.search = this.value;
                aufschreib.request();
            }
        });

        aufschreib.def_range.min = new Date(parseInt($("#slider").attr("min")));
        aufschreib.def_range.max = new Date(parseInt($("#slider").attr("max")));
        $("#slider").dateRangeSlider({
            defaultValues: aufschreib.def_range,
            bounds: aufschreib.def_range,
            formatter: function (val) {
                return moment(val).format("MMM D, HH:mm");
            },
            scales: [
                {
                    first: function (value) {
                        return value;
                    },
                    end: function (value) {
                        return value;
                    },
                    next: function (value) {
                        return moment(value).add('days', 1);
                    },
                    label: function (value) {
                        return moment(value).date();
                    }
                }
            ]
        });
        $("#slider").bind("valuesChanged", function (e, data) {
            if ($('#time-filter-pane').is(':visible')) {
                aufschreib.range.min = data.values.min;
                aufschreib.range.max = data.values.max;
                aufschreib.request();
            }
        });

        $('#time-filter-toggle a').click(function (event) {

            $('#time-filter-toggle').toggleClass('active',
                $('#time-filter-pane').is(':hidden')
            );

            if ($('#time-filter-pane').is(':hidden')) {
                aufschreib.range.min = aufschreib.def_range.min;
                aufschreib.range.max = aufschreib.def_range.max;
                $('#time-filter-pane').toggle();
                $("#slider").dateRangeSlider('resize');
                $("#slider").dateRangeSlider('values',
                    aufschreib.def_range.min,
                    aufschreib.def_range.max
                );
            } else {
                aufschreib.def_range.min = aufschreib.range.min;
                aufschreib.def_range.max = aufschreib.range.max;
                aufschreib.range.max = null;
                aufschreib.range.min = null;
                $('#time-filter-pane').toggle();
            }
            aufschreib.request();
            event.stopPropagation();
        });

        search.val(aufschreib.search);
        $('.dropdown li').click(function (event) {
            event.stopPropagation();
        });
        $('#option_hideaftervote').click(function () {
            aufschreib.closethings = ($(this).attr('checked') === 'checked');
            return true;
        });
        aufschreib.closethings = ($('#option_hideaftervote').attr('checked') === 'checked');
        $('#modal-filter a.check_all').click(function (event) {
            $('#modal-filter input[type="checkbox"]').attr('checked', 'checked');
            event.stopPropagation();
            return false;
        });
        $('#modal-filter a.check_none').click(function (event) {
            $('#modal-filter input[type="checkbox"]').attr('checked', null);
            event.stopPropagation();
            return false;
        });
        $('#modal-filter a.check_apply').click(function () {
            aufschreib.applyfilter();
            aufschreib.request();
        });
        aufschreib.applyfilter();
        /* watch out for hash changes */
        if ("onhashchange" in window && (!document.documentMode || document.documentMode >= 8)) {
            window.onhashchange = aufschreib.router;
        } else {
            /* stupid inernet explorer */
            setInterval(function () {
                aufschreib.router();
            }, 100);
        }
    }
};
$('#jswarning').remove();
aufschreib.load();
