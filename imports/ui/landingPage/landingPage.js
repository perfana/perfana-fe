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

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import './landingPage.html';
import { Session } from 'meteor/session';

Template.landingPage.onCreated(function homeOnCreated() {
  Session.set('current-page', 0);
  Session.set('rows-per-page', 10);
});

Template.landingPage.helpers({
  teamsInLicense() {
    return true;
  },
  admin() {
    const user = Meteor.user();

    if (user) {
      return (
        Roles.userHasRole(user._id, 'admin') ||
        Roles.userHasRole(user._id, 'super-admin')
      );
    }
  },
});
