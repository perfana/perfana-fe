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
  name: "perfana:bootstrap3",
  summary: "Modular, customizable Bootstrap 3.",
  version: "3.3.6_13",
  git: "https://github.com/huttonr/bootstrap3",
  documentation: "README.md",
});

Package.onUse(function (api) {
  // api.versionsFrom('1.2.1');

  api.use("isobuild:compiler-plugin@1.0.0");
  api.use("perfana:bootstrap3-assets@3.3.6_3");
  api.use("less"); // Currently necessary, see https://github.com/huttonr/bootstrap3/issues/2
  api.use("ecmascript");

  api.addFiles("check-settings.js", "client");
});

Package.registerBuildPlugin({
  name: "build-bootstrap3",
  use: ["ecmascript@0.1.6", "perfana:bootstrap3-assets@3.3.6_3"],
  sources: ["plugin/bootstrap3.js"],
  npmDependencies: {
    less: "3.0.2",
  },
});
