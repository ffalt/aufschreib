/*

   Crunsh Tweets

*/

var fs = require('fs');
var moment = require('moment');
moment.lang('de');
exports.MyLittleTweetTokenizer = function () {
	var me = this;
	var validChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZïæàáäãåâÂÄçÇéèêøíìîòöôõóÖüûúûÜß';
	var invalidChars = '#@ 0123456789,;.!?%$:_+-*/|(){}[]"&=<>\\¶£¢§\'– ´»«^¿°`~º²­©®·¨';
	var allowedHandleChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_';
	var validHashtagChars = validChars + '0123456789';
	var specials = ['+1', '<3', ':)', ';)', ':-)', ':D', ':p', ':P', ':(', ':-(', 'm(', 'm|', 'm)'];

	var exp_link = /(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
	var exp_user = /\B@([\w-]+)/gm;
	var exp_tag = /\B#([äöüß\w-]+)/gm;
	var exp_client = /<a[^>]*>(.*?)<\/a>/;

	function testSpecial(pos, search, text) {
		return text.substring(pos, pos + search.length) === search;
	}

	function linkifyUsers(text) {
		return text.replace(exp_user, '<a target="_blank" href="https://twitter.com/$1">@$1</a>');
	}

	function linkifyTags(text) {
		return text.replace(exp_tag, '<a target="_blank" href="https://twitter.com/search/$1">#$1</a>');
	}

	me.formatDateTime = function (datetime) {
		return moment(datetime).format('LLLL');
	};

	me.extractLinks = function (text) {
		var result = text.match(exp_link);
		if (!result)
			result = [];
		return result;
	};

	me.extractClient = function (text) {
		var n = text.match(exp_client);
		if ((n) && (n.length > 1)) {
			return n[1];
		}
		return '';
	};

	me.extractHashTags = function (text) {
		var result = text.match(exp_tag);
		if (!result)
			result = [];
		return result;
	};

	me.validateLongUrls = function (longurls) {
		if (longurls) {
			if (typeof(longurls) === 'string')
				longurls = JSON.parse(longurls);
		} else {
			longurls = null;
		}
		return longurls;
	};

	function longifyHTMLUrl(text, longurls) {
		longurls = me.validateLongUrls(longurls);
		var result = text;
		var n = result.match(exp_link);
		if (n) {
			n.forEach(function (longUrl) {
				var s = longUrl;
				if ((longurls) && (longurls[longUrl])) {
					s = longurls[longUrl];
				}
				result = result.replace(longUrl, '<a target="_blank" href="' + s + '">' + s + '</a>');
			});
		}
		return result;
	}

	me.prettyPrintTweetText = function (text, longurls) {
		return linkifyTags(linkifyUsers(longifyHTMLUrl(text, longurls)));
	};

	me.longifyUrls = function (text, longurls) {
		var result = text;
		longurls = me.validateLongUrls(longurls);
		if (longurls) {
			var n = result.match(exp_link);
			if (n) {
				n.forEach(function (s) {
					var longurl = longurls[s];
					if (longurl) {
						result = result.replace(s, longurl);
					}
				});
			}
		}
		return result;
	};

	me.getCleanedSourceClient = function (text) {
		if (text.indexOf('Plume') >= 0) {
			text = "&lt;a href=&quot;http://levelupstudio.com/plume&quot;&gt;Plume for Android&lt;/a&gt;";
		} else if (text.indexOf('bot for Mac') >= 0) {
			text = "&lt;a href=&quot;http://tapbots.com/software/tweetbot/mac&quot;&gt;Tweetbot for Mac&lt;/a&gt;";
		}
		return me.htmlEntityDecode(text);
	};


	function scanTwitterHandle(pos, text) {
		var result = '';
		for (var i = pos; i < text.length; i++) {
			if (allowedHandleChars.indexOf(text[i]) >= 0) {
				result += text[i];
			} else {
				break;
			}
		}
		return result;
	}

	function scanHashtag(pos, text) {
		var result = '';
		for (var i = pos; i < text.length; i++) {
			if (validHashtagChars.indexOf(text[i]) >= 0) {
				result += text[i];
			} else {
				break;
			}
		}
		return result;
	}

	function getHtmlTranslationTable(table, quoteStyle) {
		// http://kevin.vanzonneveld.net
		// +   original by: Philip Peterson
		// +    revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// +   bugfixed by: noname
		// +   bugfixed by: Alex
		// +   bugfixed by: Marco
		// +   bugfixed by: madipta
		// +   improved by: KELAN
		// +   improved by: Brett Zamir (http://brett-zamir.me)
		// +   bugfixed by: Brett Zamir (http://brett-zamir.me)
		// +      input by: Frank Forte
		// +   bugfixed by: T.Wild
		// +      input by: Ratheous
		// %          note: It has been decided that we're not going to add global
		// %          note: dependencies to php.js, meaning the constants are not
		// %          note: real constants, but strings instead. Integers are also supported if someone
		// %          note: chooses to create the constants themselves.
		// *     example 1: get_html_translation_table('HTML_SPECIALCHARS');
		// *     returns 1: {'"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;'}
		var entities = {},
			hash_map = {},
			decimal;
		var constMappingTable = {},
			constMappingQuoteStyle = {};
		var useTable = {},
			useQuoteStyle = {};

		// Translate arguments
		constMappingTable[0] = 'HTML_SPECIALCHARS';
		constMappingTable[1] = 'HTML_ENTITIES';
		constMappingQuoteStyle[0] = 'ENT_NOQUOTES';
		constMappingQuoteStyle[2] = 'ENT_COMPAT';
		constMappingQuoteStyle[3] = 'ENT_QUOTES';

		useTable = !isNaN(table) ? constMappingTable[table] : table ? table.toUpperCase() : 'HTML_SPECIALCHARS';
		useQuoteStyle = !isNaN(quoteStyle) ? constMappingQuoteStyle[quoteStyle] : quoteStyle ? quoteStyle.toUpperCase() : 'ENT_COMPAT';

		if (useTable !== 'HTML_SPECIALCHARS' && useTable !== 'HTML_ENTITIES') {
			throw new Error("Table: " + useTable + ' not supported');
			// return false;
		}

		entities['38'] = '&amp;';
		if (useTable === 'HTML_ENTITIES') {
			entities['160'] = '&nbsp;';
			entities['161'] = '&iexcl;';
			entities['162'] = '&cent;';
			entities['163'] = '&pound;';
			entities['164'] = '&curren;';
			entities['165'] = '&yen;';
			entities['166'] = '&brvbar;';
			entities['167'] = '&sect;';
			entities['168'] = '&uml;';
			entities['169'] = '&copy;';
			entities['170'] = '&ordf;';
			entities['171'] = '&laquo;';
			entities['172'] = '&not;';
			entities['173'] = '&shy;';
			entities['174'] = '&reg;';
			entities['175'] = '&macr;';
			entities['176'] = '&deg;';
			entities['177'] = '&plusmn;';
			entities['178'] = '&sup2;';
			entities['179'] = '&sup3;';
			entities['180'] = '&acute;';
			entities['181'] = '&micro;';
			entities['182'] = '&para;';
			entities['183'] = '&middot;';
			entities['184'] = '&cedil;';
			entities['185'] = '&sup1;';
			entities['186'] = '&ordm;';
			entities['187'] = '&raquo;';
			entities['188'] = '&frac14;';
			entities['189'] = '&frac12;';
			entities['190'] = '&frac34;';
			entities['191'] = '&iquest;';
			entities['192'] = '&Agrave;';
			entities['193'] = '&Aacute;';
			entities['194'] = '&Acirc;';
			entities['195'] = '&Atilde;';
			entities['196'] = '&Auml;';
			entities['197'] = '&Aring;';
			entities['198'] = '&AElig;';
			entities['199'] = '&Ccedil;';
			entities['200'] = '&Egrave;';
			entities['201'] = '&Eacute;';
			entities['202'] = '&Ecirc;';
			entities['203'] = '&Euml;';
			entities['204'] = '&Igrave;';
			entities['205'] = '&Iacute;';
			entities['206'] = '&Icirc;';
			entities['207'] = '&Iuml;';
			entities['208'] = '&ETH;';
			entities['209'] = '&Ntilde;';
			entities['210'] = '&Ograve;';
			entities['211'] = '&Oacute;';
			entities['212'] = '&Ocirc;';
			entities['213'] = '&Otilde;';
			entities['214'] = '&Ouml;';
			entities['215'] = '&times;';
			entities['216'] = '&Oslash;';
			entities['217'] = '&Ugrave;';
			entities['218'] = '&Uacute;';
			entities['219'] = '&Ucirc;';
			entities['220'] = '&Uuml;';
			entities['221'] = '&Yacute;';
			entities['222'] = '&THORN;';
			entities['223'] = '&szlig;';
			entities['224'] = '&agrave;';
			entities['225'] = '&aacute;';
			entities['226'] = '&acirc;';
			entities['227'] = '&atilde;';
			entities['228'] = '&auml;';
			entities['229'] = '&aring;';
			entities['230'] = '&aelig;';
			entities['231'] = '&ccedil;';
			entities['232'] = '&egrave;';
			entities['233'] = '&eacute;';
			entities['234'] = '&ecirc;';
			entities['235'] = '&euml;';
			entities['236'] = '&igrave;';
			entities['237'] = '&iacute;';
			entities['238'] = '&icirc;';
			entities['239'] = '&iuml;';
			entities['240'] = '&eth;';
			entities['241'] = '&ntilde;';
			entities['242'] = '&ograve;';
			entities['243'] = '&oacute;';
			entities['244'] = '&ocirc;';
			entities['245'] = '&otilde;';
			entities['246'] = '&ouml;';
			entities['247'] = '&divide;';
			entities['248'] = '&oslash;';
			entities['249'] = '&ugrave;';
			entities['250'] = '&uacute;';
			entities['251'] = '&ucirc;';
			entities['252'] = '&uuml;';
			entities['253'] = '&yacute;';
			entities['254'] = '&thorn;';
			entities['255'] = '&yuml;';
		}

		if (useQuoteStyle !== 'ENT_NOQUOTES') {
			entities['34'] = '&quot;';
		}
		if (useQuoteStyle === 'ENT_QUOTES') {
			entities['39'] = '&#39;';
		}
		entities['60'] = '&lt;';
		entities['62'] = '&gt;';


		// ascii decimals to real symbols
		for (decimal in entities) {
			if (entities.hasOwnProperty(decimal)) {
				hash_map[String.fromCharCode(decimal)] = entities[decimal];
			}
		}

		return hash_map;
	}

	function htmlEntityDecode(string, quoteStyle) {
		// http://kevin.vanzonneveld.net
		// +   original by: john (http://www.jd-tech.net)
		// +      input by: ger
		// +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// +    revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// +   bugfixed by: Onno Marsman
		// +   improved by: marc andreu
		// +    revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// +      input by: Ratheous
		// +   bugfixed by: Brett Zamir (http://brett-zamir.me)
		// +      input by: Nick Kolosov (http://sammy.ru)
		// +   bugfixed by: Fox
		// -    depends on: get_html_translation_table
		// *     example 1: html_entity_decode('Kevin &amp; van Zonneveld');
		// *     returns 1: 'Kevin & van Zonneveld'
		// *     example 2: html_entity_decode('&amp;lt;');
		// *     returns 2: '&lt;'
		var hash_map ,
			symbol ,
			entity,
			tmp_str = string.toString();

		if (false === (hash_map = getHtmlTranslationTable('HTML_ENTITIES', quoteStyle))) {
			return false;
		}

		// fix &amp; problem
		// http://phpjs.org/functions/get_html_translation_table:416#comment_97660
		delete(hash_map['&']);
		hash_map['&'] = '&amp;';

		for (symbol in hash_map) {
			entity = hash_map[symbol];
			tmp_str = tmp_str.split(entity).join(symbol);
		}
		tmp_str = tmp_str.split('&#039;').join("'");

		return tmp_str;
	}

	me.htmlEntityDecode = function (text) {
		return htmlEntityDecode(text);
	};

	me.clean = function (text) {
		//scan words
		var cleanText = htmlEntityDecode(text);
		cleanText = cleanText
			//.replace(/ä/g, 'ae')
			//.replace(/ö/g, 'oe')
			//.replace(/ü/g, 'ue')
			//.replace(/ß/g, 'ss')
			.replace(/„/g, '"')
			.replace(/…/g, '...')
			.replace(/–/g, '-')
			.replace(/’/g, '\'')
			.replace(/“/g, '"');
		var newText = '';
		for (var j = 0; j < cleanText.length; j++) {
			var c = cleanText[j];
			if (validChars.indexOf(c) >= 0) {
				// Alles OK
				newText += c;
			} else if (c === '@') {
				newText += c;
				var handle = scanTwitterHandle(j + 1, cleanText);
				newText += handle;
				j += handle.length;
			} else if (c === '#') {
				newText += c;
				var hashtag = scanHashtag(j + 1, cleanText);
				newText += hashtag;
				j += hashtag.length;
			} else if ((invalidChars.indexOf(c) >= 0) || (c.charCodeAt(0) > 255) ||
				(c.charCodeAt(0) < 32) || (c.charCodeAt(0) === 128)) {
				for (var i = 0; i < specials.length; i++) {
					var special = specials[i];
					if (testSpecial(j, special, cleanText)) {
						newText += special;
						j += special.length;
						break; //i
					}
				}
				newText += ' ';
			} else {
				console.error('Unknown Char "' + c + '" (' + c.charCodeAt(0) + ')!');
			}
		}
		return newText.replace(/ +/g, ' ');
	};

	me.cleanKeepLinks = function (text) {
		var cleanText = text,
			urls = cleanText.match(exp_link);
		if (urls) {
			urls.forEach(function (url) {
				cleanText = cleanText.replace(url, ' ');
			});
		} else
			urls = [];
		return me.clean(cleanText).concat(' ').concat(urls.join(' '));
	};

	me.tokenizeKeepLinks = function (text) {
		return me.cleanKeepLinks(text).split(' ');
	};

	me.tokenize = function (text) {
		var cleanText = text,
			n = cleanText.match(exp_link);
		if (n) {
			n.forEach(function (url) {
				cleanText = cleanText.replace(url, ' ');
			});
		}
		return me.clean(cleanText).split(' ');
	};

	return me;
};
