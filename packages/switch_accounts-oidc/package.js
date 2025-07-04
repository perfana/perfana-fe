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
  summary: "OpenID Connect (OIDC) for Meteor accounts",
  version: "1.0.7",
  name: "perfana:accounts-oidc",
  git: "https://github.com/switch-ch/meteor-accounts-oidc.git",
});

Package.onUse(function (api) {
  api.use("underscore", ["server", "client"]);
  api.use("accounts-base", ["client", "server"]);
  // Export Accounts (etc) to packages using this one.
  api.imply("accounts-base", ["client", "server"]);
  api.use("accounts-oauth", ["client", "server"]);

  api.use("perfana:oidc@1.0.7", ["client", "server"]);

  api.addFiles("oidc_login_button.css", "client");

  api.addFiles("oidc.js");
});
