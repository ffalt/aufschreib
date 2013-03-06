var aufschreib = {
		data: ['human_unknown', 'machine_unknown', 'machine_outcry',
			'machine_report', 'machine_comment', 'machine_troll', 'machine_spam'],
		search: '',
		stats: {
			mode: 'human',
			type: 'pie',
			cat: null,
			kind: null
		},
		closethings: false,
		route: {
			default: 'edit',
			hash: '',
			subs: []
		},
		error: function (msg) {
			$('#alert').remove();
			$('body').prepend($(
				'<div id="alert" class="alert alert-block alert-error fade in">' +
					'<button data-dismiss="alert" class="close" type="button">×</button>' +
					'<h4 class="alert-heading">Oh snap! You got an error!</h4>' +
					'<p>' + msg + '</p>' +
					'</div>'
			));
		},
		blendProgressIn: function(sender) {
			if (sender) {
				$('#overlay-inline').remove();
				$(sender).prepend('<div id="overlay-inline"><div class="overlay-img"></div></div>');
				$('#overlay-inline').fadeIn('fast');
			} else {
				$('#overlay').fadeIn('fast');
			}
		},
		blendProgressOut: function(sender) {
			if (sender) {
				$('#overlay-inline').remove();
			}
			if (!sender) {
				$('#overlay').fadeOut('fast');
			}
		},
		getJson: function (sender, type, mode, kind, successcallback) {
			var timeout = setTimeout (function(){
					aufschreib.blendProgressIn(sender);
			}, 2000 );
			var params = {
				cmd: 'json',
				type: type,
				mode: mode,
				kind: (kind || '')
			};
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
			var timeout = setTimeout (function(){
				aufschreib.blendProgressIn(sender);
			}, 2000 );
			$.ajax({
				url: url,
				dataType: 'html',
				data: params,
				success: function (data) {
					clearTimeout(timeout);
					aufschreib.blendProgressOut(sender);
					success(data);
				},
				error: function (xhr, ts, err) {
					clearTimeout(timeout);
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
			return false;
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
					var pdiv = div.parent();
					div.replaceWith(data);
					aufschreib.connectCatChange(pdiv);
					if (aufschreib.closethings) {
						aufschreib.checkVoted(pdiv);
					}
				});
			return false;
		},
		voteAll: function (sender, cat) {
			var ids = [];
			var div = $(sender).closest(".user");
			$(div).find('div[class=tweet]').each(
				function (index) {
					ids.push($(this).attr('id'));
				}
			);
			var params = {
				cmd: 'setall',
				ids: ids.join(','),
				cat: cat
			};
			aufschreib.get(div, '', params,
				function (data) {
					var tweetsdiv = $(div).children('.tweets').eq(0);
					$(tweetsdiv).html(data);
					aufschreib.connectCatChange(div);
					if (aufschreib.closethings) {
						aufschreib.checkVoted(div);
					}
				});
			return false;
		},
		resizedw: function (sender) {
			var w = $(window).width();
			$(sender).find(".btn").each(function (index) {
				$(this).toggleClass("btn-mini", (w < 600));
			});
		},
		connectCatChange: function (sender) {
			aufschreib.resizedw(sender);
			$(sender).find(".btn-tweet").each(function (index) {
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
			$(sender).find(".tweet-close").each(function (index) {
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
			$(sender).find(".user-close").each(function (index) {
				$(this).unbind("click");
				$(this).click(function () {
					$(this).closest(".user").remove();
					return false;
				});
			});
			$(sender).find(".btn-user").each(function (index) {
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
				result['search'] = encodeURIComponent(aufschreib.search);
			}
			return result;
		},
		nextList: function (sender) {
			var id = $(sender).attr('id');
			var params = aufschreib.makeListParams();
			params['id'] = id;
			aufschreib.get(null, '', params, function (data) {
				var pnode = $(sender).parent();
				$(sender).replaceWith(data);
				aufschreib.connectCatChange(pnode);
			});
			return false;
		},
		applyfilter: function () {
			$('#nav-edit-filter').find(':checkbox').each(
				function (index) {
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
		request: function () {
			var params = aufschreib.makeListParams();
			aufschreib.get(null, '', params, function (data) {
				var content = $('.content');
				content.html(data);
				aufschreib.connectCatChange(content);
			});
			return false;
		},
		requestCommands: function () {
			var params = {cmd: 'commands'};
			aufschreib.get(null, '', params, function (data) {
				$('#content').html(data);
			});
			return false;
		},
		requestChart: function () {
			$('li', '#nav-stats').removeClass('active');
			$('a[href*=' + aufschreib.stats.type + ']', '#nav-stats').parent().addClass('active');
			var params = {cmd: 'chart', type: aufschreib.stats.type, mode: aufschreib.stats.mode};
			if (aufschreib.stats.cat) {
				params['cat'] = aufschreib.stats.cat;
			}
			if (aufschreib.stats.kind) {
				params['kind'] = aufschreib.stats.kind;
			}
			aufschreib.get(null, '', params, function (data) {
				$('#content').html(data);
			});
			return false;
		},
		requestClassify: function () {
			var params = {cmd: 'classify'};
			aufschreib.get(null, '', params, function (data) {
				var content = $('#classify-result');
				content.html(data);
			});
			return false;
		},
		classify: function () {
			$('#command-modal').modal('show');
			return false;
		},
		updateCache: function () {
			var params = {cmd: 'updatecache'};
			aufschreib.get(null, '', params, function (data) {
				var content = $('#classify-result');
				content.html(data);
			});
			return false;
		},
		setMode: function (mode) {
			$('li', '#nav-site').removeClass('active');
			$('a[href*=' + mode + ']', '#nav-site').parent().addClass('active');
			$('.edit').toggle((mode === 'edit'));
			$('.stats').toggle((mode === 'stats'));
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
				if ((aufschreib.stats.type === 'cloud') || (aufschreib.stats.type === 'bar')) {
					if (!aufschreib.stats.kind)
						aufschreib.stats.kind = 'word';
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
		routeCommand: function (subs) {
			aufschreib.setMode('commands');
			aufschreib.requestCommands();
			return true;
		},
		routeEdit: function (subs) {
			aufschreib.setMode('edit');
			aufschreib.request();
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
					str = [];
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
							aufschreib.routeCommand(str);
							break;
						case 'edit':
							str.shift();
							aufschreib.routeEdit(str);
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
			$('#jswarning').remove();
			$('#menu').show();
			var search = $('#search');
			search.keypress(function (e) {
				if (e.which == 13) {
					aufschreib.search = this.value;
					aufschreib.request();
				}
			});
			search.val(aufschreib.search);
			$('.dropdown li').click(function (event) {
				event.stopPropagation();
			});
			$('#option_hideaftervote').click(function (event) {
				aufschreib.closethings = ($(this).attr('checked') === 'checked');
				return true;
			});
			aufschreib.closethings = ($(this).attr('checked') === 'checked');
			$('.dropdown a.check_all').click(function (event) {
				$(this).parents('ul:eq(0)').find(':checkbox').attr('checked', 'checked');
				event.stopPropagation();
				return false;
			});
			$('.dropdown a.check_none').click(function (event) {
				$(this).parents('ul:eq(0)').find(':checkbox').attr('checked', null);
				event.stopPropagation();
				return false;
			});
			$('.dropdown a.check_apply').click(function (event) {
				aufschreib.applyfilter();
				aufschreib.request();
				//event.stopPropagation();
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
			var doit;
			$(window).resize(function () {
				clearTimeout(doit);
				doit = setTimeout(function () {
					aufschreib.resizedw('.content');
				}, 100);
			});

		}
	}
	;
aufschreib.load();
