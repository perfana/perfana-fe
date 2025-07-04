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
  name: "perfana:autoform-bootstrap-modal",
  summary: "Create, update and delete collections with bootstrap modals",
  version: "0.1.0",
  git: "https://github.com/aposidelov/meteor-autoform-bootstrap-modal",
});

Package.onUse(function (api) {
  // api.versionsFrom('METEOR@1.2.0.1');

  api.use(
    [
      "jquery",
      "templating",
      "less",
      "session",
      "ui",
      "peppelg:bootstrap-3-modal@1.0.4",
      "aldeed:autoform@5.8.1",
      "raix:handlebar-helpers@0.2.5",
      "aldeed:delete-button@2.0.0",
    ],
    "client",
  );

  api.addFiles("lib/client/main.html", "client");
  api.addFiles("lib/client/main.js", "client");
  api.addFiles("lib/client/style.less", "client");
});
