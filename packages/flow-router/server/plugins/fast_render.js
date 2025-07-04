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

if (!Package["meteorhacks:fast-render"]) {
  return;
}

FastRender = Package["meteorhacks:fast-render"].FastRender;

// hack to run after eveything else on startup
Meteor.startup(function () {
  Meteor.startup(function () {
    setupFastRender();
  });
});

function setupFastRender() {
  _.each(FlowRouter._routes, function (route) {
    FastRender.route(route.pathDef, function (routeParams, path) {
      var self = this;

      // anyone using Meteor.subscribe for something else?
      var original = Meteor.subscribe;
      Meteor.subscribe = function () {
        return _.toArray(arguments);
      };

      route._subsMap = {};
      FlowRouter.subscriptions.call(route, path);
      if (route.subscriptions) {
        var queryParams = routeParams.query;
        var params = _.omit(routeParams, "query");
        route.subscriptions(params, queryParams);
      }
      _.each(route._subsMap, function (args) {
        self.subscribe.apply(self, args);
      });

      // restore Meteor.subscribe, ... on server side
      Meteor.subscribe = original;
    });
  });
}
