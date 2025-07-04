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

Group = function (router, options, parent) {
  options = options || {};

  if (options.prefix && !/^\/.*/.test(options.prefix)) {
    var message = "group's prefix must start with '/'";
    throw new Error(message);
  }

  this._router = router;
  this.prefix = options.prefix || "";
  this.name = options.name;
  this.options = options;

  this._triggersEnter = options.triggersEnter || [];
  this._triggersExit = options.triggersExit || [];
  this._subscriptions = options.subscriptions || Function.prototype;

  this.parent = parent;
  if (this.parent) {
    this.prefix = parent.prefix + this.prefix;

    this._triggersEnter = parent._triggersEnter.concat(this._triggersEnter);
    this._triggersExit = this._triggersExit.concat(parent._triggersExit);
  }
};

Group.prototype.route = function (pathDef, options, group) {
  options = options || {};

  if (!/^\/.*/.test(pathDef)) {
    var message = "route's path must start with '/'";
    throw new Error(message);
  }

  group = group || this;
  pathDef = this.prefix + pathDef;

  var triggersEnter = options.triggersEnter || [];
  options.triggersEnter = this._triggersEnter.concat(triggersEnter);

  var triggersExit = options.triggersExit || [];
  options.triggersExit = triggersExit.concat(this._triggersExit);

  return this._router.route(pathDef, options, group);
};

Group.prototype.group = function (options) {
  return new Group(this._router, options, this);
};

Group.prototype.callSubscriptions = function (current) {
  if (this.parent) {
    this.parent.callSubscriptions(current);
  }

  this._subscriptions.call(current.route, current.params, current.queryParams);
};
