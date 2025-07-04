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
  name: "perfana:roles",
  summary: "The most advanced roles package for meteor",
  version: "2.6.6",
  git: "https://github.com/nicolaslopezj/roles",
});

Package.onUse(function (api) {
  api.use([
    "meteor-base",
    "accounts-base",
    "check",
    "mongo",
    "ecmascript",
    "dburles:collection-helpers",
    "underscore",
  ]);

  api.use(["templating"], { weak: true });

  api.addFiles(["helpers.js", "roles.js", "keys.js"]);

  api.addFiles(["roles_server.js"], "server");

  api.addFiles(["roles_client.js"], "client");

  api.export("Roles");
  api.export("objectHasKey");
});

Package.onTest(function (api) {
  api.use("tinytest");
  api.use("orionjs:core");
});
