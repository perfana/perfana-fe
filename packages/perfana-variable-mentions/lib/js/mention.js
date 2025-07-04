/**
 * Copyright 2025 Perfana Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*jslint forin: true */

(function ($) {
  $.fn.extend({
    mentionVariable: function (options) {
      this.opts = {
        users: [],
        delimiter: "@",
        sensitive: true,
        emptyQuery: true,
        queryBy: ["name", "username"],
        typeahead2Opts: {},
      };

      var settings = $.extend({}, this.opts, options),
        _checkDependencies = function () {
          if (typeof $ == "undefined") {
            throw new Error("jQuery is Required");
          } else {
            if (typeof $.fn.typeahead2 == "undefined") {
              throw new Error("Typeahead2 is Required");
            }
          }
          return true;
        },
        _extractCurrentQuery = function (query, caratPos) {
          var i;
          for (i = caratPos; i >= 0; i--) {
            if (query[i] == settings.delimiter) {
              break;
            }
          }
          return query.substring(i, caratPos);
        },
        _matcher = function (itemProps) {
          var i;

          if (settings.emptyQuery) {
            var q = this.query.toLowerCase(),
              caratPos = this.$element[0].selectionStart,
              lastChar = q.slice(caratPos - 1, caratPos);
            if (lastChar == settings.delimiter) {
              return true;
            }
          }

          for (i in settings.queryBy) {
            if (itemProps[settings.queryBy[i]]) {
              var item = _getProperty(
                  settings.queryBy[i],
                  itemProps,
                ).toLowerCase(),
                names = this.query
                  .toLowerCase()
                  .match(new RegExp(settings.delimiter + "\\w+$", "g")),
                j;
              if (!!names) {
                for (j = 0; j < names.length; j++) {
                  var name = names[j].substring(1).toLowerCase(),
                    re = new RegExp(settings.delimiter + item, "g"),
                    used = this.query.toLowerCase().match(re);

                  if (item.indexOf(name) != -1 && used === null) {
                    return true;
                  }
                }
              }
            }
          }
        },
        _updater = function (item) {
          var data = this.query,
            caratPos = this.$element[0].selectionStart,
            i;

          for (i = caratPos; i >= 0; i--) {
            if (data[i] == settings.delimiter) {
              break;
            }
          }
          var replace = data.substring(i, caratPos),
            textBefore = data.substring(0, i),
            textAfter = data.substring(caratPos),
            data = textBefore + settings.delimiter + item + textAfter;

          this.tempQuery = data;

          return data;
        },
        _sorter = function (items) {
          if (items.length && settings.sensitive) {
            var currentUser = _extractCurrentQuery(
                this.query,
                this.$element[0].selectionStart,
              ).substring(1),
              i,
              len = items.length,
              priorities = {
                highest: [],
                high: [],
                med: [],
                low: [],
              },
              finals = [];
            if (currentUser.length == 1) {
              for (i = 0; i < len; i++) {
                var currentRes = items[i];

                if (currentRes.name[0] == currentUser) {
                  priorities.highest.push(currentRes);
                } else if (
                  currentRes.name[0].toLowerCase() == currentUser.toLowerCase()
                ) {
                  priorities.high.push(currentRes);
                } else if (currentRes.name.indexOf(currentUser) != -1) {
                  priorities.med.push(currentRes);
                } else {
                  priorities.low.push(currentRes);
                }
              }
              for (i in priorities) {
                var j;
                for (j in priorities[i]) {
                  finals.push(priorities[i][j]);
                }
              }
              return finals;
            }
          }
          return items;
        },
        _render = function (items) {
          var that = this;
          items = $(items).map(function (i, item) {
            // var concatName = item.name.replace(/ /g, String.fromCharCode(160));
            var concatName = item.name + "}";

            i = $(that.options.item).attr("data-value", `${concatName}`);

            var _linkHtml = $("<div />");

            if (item.image) {
              _linkHtml.append(
                '<img class="mention_image" src="' + item.image + '">',
              );
            }
            if (item.name) {
              _linkHtml.append('<b class="mention_name">' + item.name + "</b>");
            }
            if (item.username) {
              _linkHtml.append(
                '<span class="mention_username"> ' +
                  " | " /*settings.delimiter*/ +
                  item.username +
                  "</span>",
              );
            }

            i.find("a").html(that.highlighter(_linkHtml.html()));
            return i[0];
          });

          items.first().addClass("active");
          this.$menu.html(items);
          return this;
        },
        _getProperty = function (prop, obj) {
          return prop.split(".").reduce(function (prev, curr) {
            return prev ? prev[curr] : undefined;
          }, obj || self);
        };

      $.fn.typeahead2.Constructor.prototype.render = _render;

      return this.each(function () {
        var _this = $(this);
        if (_checkDependencies()) {
          _this.typeahead2(
            $.extend(
              {
                source: settings.users,
                matcher: _matcher,
                updater: _updater,
                sorter: _sorter,
              },
              settings.typeahead2Opts,
            ),
          );
        }
      });
    },
  });
})(jQuery);
