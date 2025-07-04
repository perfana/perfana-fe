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

willChangeWithParent = function (object, key) {
  if (!_.isObject(object)) {
    return;
  }
  var willChange = false;
  _.each(_.keys(object), function (modifyingKey) {
    if (key && key.indexOf(modifyingKey) === 0) {
      willChange = true;
    }
  });
  return willChange;
};

objectHasKey = function (object, key) {
  var dotNotation = {};

  (function recurse(obj, current) {
    for (var key in obj) {
      var value = obj[key];
      var newKey = current ? current + "." + key : key; // joined key with dot
      if (value && typeof value === "object") {
        recurse(value, newKey); // it's a nested object, so do it again
      } else {
        dotNotation[newKey] = value; // it's not an object, so set the property
      }
    }
  })(object);

  var keys = _.keys(dotNotation);
  var newKeys = [];

  _.each(keys, function (_key) {
    var parts = _key.split(".");
    var added = [];
    _.each(parts, function (part) {
      if (!isNaN(part)) {
        part = "$";
        added.push(part);
      } else {
        added.push(part);
        newKeys.push(added.join("."));
      }
    });
  });

  return _.contains(newKeys, key);
};
