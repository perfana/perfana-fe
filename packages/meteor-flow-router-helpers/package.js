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
  git: "https://github.com/arillo/meteor-flow-router-helpers.git",
  name: "perfana:flow-router-helpers",
  summary: "Template helpers for flow-router",
  version: "0.5.2",
});

Package.onUse(function (api) {
  api.use(["check", "coffeescript", "templating", "underscore"]);

  api.use(["zimme:active-route@2.3.0"], ["client", "server"]);

  api.use(
    [
      "perfana:flow-router", //,
      // 'meteorhacks:flow-router@1.19.0'
    ],
    ["client", "server"],
    { weak: true },
  );

  api.imply("zimme:active-route", ["client", "server"]);

  api.addFiles(["client/helpers.html"], ["client"]);

  api.addFiles(["client/helpers.coffee"], ["client", "server"]);

  api.export("FlowRouterHelpers", "server");
});
