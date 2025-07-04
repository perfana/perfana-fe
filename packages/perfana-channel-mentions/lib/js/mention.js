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
    channel: function (options) {
      this.channelOpts = {
        channels: [],
        channelDelimiter: "#",
        channelSensitive: true,
        channelEmptyQuery: false,
        channelQueryBy: ["name", "description"],
        channelTypeahead2Opts: {},
      };

      var channelSettings = $.extend({}, this.channelOpts, options),
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
        _extractCurrentChannelQuery = function (query, caratPos) {
          var i;
          for (i = caratPos; i >= 0; i--) {
            if (query[i] == channelSettings.channelDelimiter) {
              break;
            }
          }
          return query.substring(i, caratPos);
        },
        _channelMatcher = function (itemProps) {
          var i;

          if (channelSettings.channelEmptyQuery) {
            var q = this.query.toLowerCase(),
              caratPos = this.$element[0].selectionStart,
              lastChar = q.slice(caratPos - 1, caratPos);
            if (lastChar == channelSettings.channelDelimiter) {
              return true;
            }
          }

          for (i in channelSettings.channelQueryBy) {
            if (itemProps[channelSettings.channelQueryBy[i]]) {
              var item = _getChannelProperty(
                  channelSettings.channelQueryBy[i],
                  itemProps,
                ).toLowerCase(),
                names = this.query
                  .toLowerCase()
                  .match(
                    new RegExp(channelSettings.channelDelimiter + "\\w+$", "g"),
                  ),
                j;
              if (!!names) {
                for (j = 0; j < names.length; j++) {
                  var name = names[j].substring(1).toLowerCase(),
                    re = new RegExp(
                      channelSettings.channelDelimiter + item,
                      "g",
                    ),
                    used = this.query.toLowerCase().match(re);

                  if (item.indexOf(name) != -1 && used === null) {
                    return true;
                  }
                }
              }
            }
          }
        },
        _channelUpdater = function (item) {
          var data = this.query,
            caratPos = this.$element[0].selectionStart,
            i;

          for (i = caratPos; i >= 0; i--) {
            if (data[i] == channelSettings.channelDelimiter) {
              break;
            }
          }
          var replace = data.substring(i, caratPos),
            textBefore = data.substring(0, i),
            textAfter = data.substring(caratPos),
            // data = textBefore + channelSettings.channelDelimiter + item + textAfter;
            data = textBefore + item + textAfter;

          this.tempQuery = data;

          return data;
        },
        _channelSorter = function (items) {
          if (items.length && channelSettings.channelSensitive) {
            var currentUser = _extractCurrentChannelQuery(
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

                if (currentRes.description[0] == currentUser) {
                  priorities.highest.push(currentRes);
                } else if (
                  currentRes.description[0].toLowerCase() ==
                  currentUser.toLowerCase()
                ) {
                  priorities.high.push(currentRes);
                } else if (currentRes.description.indexOf(currentUser) != -1) {
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
        _channelRender = function (items) {
          var that = this;
          items = $(items).map(function (i, item) {
            i = $(that.options.item).attr("data-value", `${item.name}`);

            var _linkHtml = $("<div />");

            if (item.image) {
              _linkHtml.append(
                '<img class="mention_image" src="' + item.image + '">',
              );
            }
            if (item.name) {
              _linkHtml.append('<b class="mention_name">' + item.name + "</b>");
            }
            if (item.description) {
              _linkHtml.append(
                '<span class="mention_description"> ' +
                  " | " /* channelSettings.channelDelimiter*/ +
                  item.description +
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
        _getChannelProperty = function (prop, obj) {
          return prop.split(".").reduce(function (prev, curr) {
            return prev ? prev[curr] : undefined;
          }, obj || self);
        };

      $.fn.typeahead2.Constructor.prototype.render = _channelRender;

      return this.each(function () {
        var _this = $(this);
        if (_checkDependencies()) {
          _this.typeahead2(
            $.extend(
              {
                source: channelSettings.channels,
                matcher: _channelMatcher,
                updater: _channelUpdater,
                sorter: _channelSorter,
              },
              channelSettings.channelTypeahead2Opts,
            ),
          );
        }
      });
    },
  });
})(jQuery);
