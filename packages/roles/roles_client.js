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

var subscription = Meteor.subscribe("nicolaslopezj_roles");

/**
 * Helper to check if roles are ready
 */
Roles.isReady = function () {
  return subscription.ready();
};

if (!!Package["templating"]) {
  // only if is using blaze
  const Template = Package["templating"].Template;

  Template.registerHelper("rolesIsReady", function () {
    return Roles.isReady();
  });

  /**
   * Allow from the client
   */
  Template.registerHelper("userAllow", function (action) {
    return Roles.allow(Meteor.userId(), action);
  });

  /**
   * Deny from the client
   */
  Template.registerHelper("userDeny", function (action) {
    return Roles.deny(Meteor.userId(), action);
  });

  /**
   * Has permission from the client
   */
  Template.registerHelper("userHasPermission", function (action) {
    return Roles.userHasPermission(Meteor.userId(), action);
  });

  /**
   * Roles helpers from the client
   */
  Template.registerHelper("userHelper", function (helper) {
    return Roles.helper(Meteor.userId(), helper);
  });
}
