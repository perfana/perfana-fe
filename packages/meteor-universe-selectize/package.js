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

"use strict";

Package.describe({
  name: "perfana:universe-selectize",
  summary:
    "Universe select input standalone - with the appearance as selectize. It is for use without autoform.",
  version: "0.1.23",
  git: "https://github.com/vazco/meteor-universe-selectize.git",
});

Package.onUse(function (api) {
  // api.versionsFrom('1.2.1');

  if (!api.addAssets) {
    api.addAssets = function (files, platform) {
      api.addFiles(files, platform, { isAsset: true });
    };
  }

  api.use(
    ["ecmascript", "templating", "underscore", "less", "reactive-var"],
    "client",
  );

  api.addFiles(
    [
      "universe-selectize.html",
      "universe-selectize.js",
      "stylesheets/selectize.default.less",
      "stylesheets/universe-selectize.less",
    ],
    "client",
  );

  api.addAssets("img/loading.gif", "client");

  api.export(["UniSelectize"], "client");
});
