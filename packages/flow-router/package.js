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

Package.describe({
  name: "perfana:flow-router",
  summary: "Carefully Designed Client Side Router for Meteor",
  version: "2.12.1",
  git: "https://github.com/kadirahq/flow-router.git",
});

Npm.depends({
  // In order to support IE9, we had to fork pagejs and apply
  // this PR: https://github.com/visionmedia/page.js/pull/288
  page: "https://github.com/kadirahq/page.js/archive/34ddf45ea8e4c37269ce3df456b44fc0efc595c6.tar.gz",
  qs: "6.3.2",
});

Package.onUse(function (api) {
  configure(api);
  api.export("FlowRouter");
});

function configure(api) {
  api.use("underscore");
  api.use("tracker");
  api.use("reactive-dict");
  api.use("reactive-var");
  api.use("ejson");
  api.use("modules");

  api.use("meteorhacks:fast-render", ["client", "server"], { weak: true });

  api.addFiles("client/modules.js", "client");
  api.addFiles("client/triggers.js", "client");
  api.addFiles("client/router.js", "client");
  api.addFiles("client/group.js", "client");
  api.addFiles("client/route.js", "client");
  api.addFiles("client/_init.js", "client");

  api.addFiles("server/router.js", "server");
  api.addFiles("server/group.js", "server");
  api.addFiles("server/route.js", "server");
  api.addFiles("server/_init.js", "server");

  api.addFiles("server/plugins/fast_render.js", "server");

  api.addFiles("lib/router.js", ["client", "server"]);
}
