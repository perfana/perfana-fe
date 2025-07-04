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

// Package metadata for Meteor.js web platform (https://www.meteor.com/)
// This file is defined within the Meteor documentation at
//
//   http://docs.meteor.com/#/full/packagejs
//
// and it is needed to define a Meteor package
"use strict";

Package.describe({
  name: "perfana-useraccounts:flow-routing",
  summary:
    "UserAccounts package providing routes configuration capability via kadira:flow-router.",
  version: "1.14.2",
  git: "https://github.com/meteor-useraccounts/flow-routing.git",
});

Package.onUse(function (api) {
  api.use(
    [
      "check",
      "perfana:flow-router",
      "underscore",
      "useraccounts:core",
      "modules",
    ],
    ["client", "server"],
  );

  api.imply(["perfana:flow-router", "useraccounts:core"], ["client", "server"]);

  api.use(
    [
      "react",
      "kadira:blaze-layout",
      "kadira:react-layout",
      "gwendall:blaze-to-react",
    ],
    ["client", "server"],
    { weak: true },
  );

  api.addFiles(["lib/core.js"], ["client", "server"]);

  api.addFiles(
    ["lib/client/client.js", "lib/client/templates_helpers/at_input.js"],
    ["client"],
  );
});
