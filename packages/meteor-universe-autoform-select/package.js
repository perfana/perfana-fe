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
  name: "perfana:universe-autoform-select",
  summary:
    'Custom "afUniverseSelect" input type for AutoForm, with the appearance as selectize',
  version: "0.4.1",
  git: "https://github.com/vazco/meteor-universe-autoform-select.git",
});

Package.onUse(function (api) {
  // api.versionsFrom('1.2.1');

  if (!api.addAssets) {
    api.addAssets = function (files, platform) {
      api.addFiles(files, platform, { isAsset: true });
    };
  }

  api.use(["ecmascript", "templating", "underscore"], "client");
  api.use("aldeed:autoform@5.8.1");
  api.use("perfana:universe-selectize@0.1.23", "client");

  api.addFiles(
    ["universe-autoform-select.html", "universe-autoform-select.js"],
    "client",
  );
});
