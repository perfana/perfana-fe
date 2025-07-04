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

Group = function (router, options) {
  options = options || {};
  this.prefix = options.prefix || "";
  this.options = options;
  this._router = router;
};

Group.prototype.route = function (pathDef, options) {
  pathDef = this.prefix + pathDef;
  return this._router.route(pathDef, options);
};

Group.prototype.group = function (options) {
  var group = new Group(this._router, options);
  group.parent = this;

  return group;
};
