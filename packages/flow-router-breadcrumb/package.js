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
  name: "perfana:flow-router-breadcrumb",
  summary:
    "Provide a easy and flexible way to add breadcrumb trail support for Ostrio FlowRouter.",
  version: "1.2.2",
  git: "https://github.com/krishaamer/flow-router-breadcrumb.git",
});

function configurePackage(api) {
  // Core Dependencies
  api.use(["blaze", "templating", "underscore", "meteor"]);

  api.use("perfana:flow-router");
  api.addFiles("lib/breadcrumb.html", ["client"]);
  api.addFiles("lib/breadcrumb.js", ["client"]);

  api.export("Breadcrumb");
}

Package.onUse(function (api) {
  configurePackage(api);
});
