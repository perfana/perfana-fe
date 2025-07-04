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

/* global
  AccountsTemplates: false
*/
"use strict";

Meteor.methods({
  ATRemoveService: function (serviceName) {
    check(serviceName, String);

    var userId = this.userId;

    if (userId) {
      var user = Meteor.users.findOne(userId);
      var numServices = _.keys(user.services).length; // including "resume"
      var unset = {};

      if (numServices === 2) {
        throw new Meteor.Error(
          403,
          AccountsTemplates.texts.errors.cannotRemoveService,
          {},
        );
      }

      unset["services." + serviceName] = "";
      Meteor.users.update(userId, { $unset: unset });
    }
  },
});
