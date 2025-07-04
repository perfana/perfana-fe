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

import { Applications } from '/imports/collections/applications';
import { Meteor } from 'meteor/meteor';

const roles = {};

const setRole = (role) => {
  if (!_.has(roles, role)) {
    console.log(`Adding ${role} role`);
    roles[role] = new Roles.Role(role);

    roles[role].allow('collections.Applications.index', true);

    roles[role].allow(
      'collections.benchmarks.insert',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );
    roles[role].allow(
      'collections.benchmarks.update',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );
    roles[role].allow(
      'collections.benchmarks.remove',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );

    roles[role].allow(
      'collections.testRuns.insert',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );
    roles[role].allow(
      'collections.testRuns.update',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );
    roles[role].allow(
      'collections.testRuns.remove',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );

    roles[role].allow(
      'collections.ApplicationDashboards.insert',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );
    roles[role].allow(
      'collections.ApplicationDashboards.update',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );
    roles[role].allow(
      'collections.ApplicationDashboards.remove',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );

    roles[role].allow(
      'collections.ReportPanels.insert',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );
    roles[role].allow(
      'collections.ReportPanels.update',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );
    roles[role].allow(
      'collections.ReportPanels.remove',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );

    roles[role].allow(
      'collections.ReportRequirements.insert',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );
    roles[role].allow(
      'collections.ReportRequirements.update',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );
    roles[role].allow(
      'collections.ReportRequirements.remove',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );

    roles[role].allow(
      'collections.RunningTestCarouselPanels.insert',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );
    roles[role].allow(
      'collections.RunningTestCarouselPanels.update',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );
    roles[role].allow(
      'collections.RunningTestCarouselPanels.remove',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );

    roles[role].allow(
      'collections.Alerts.insert',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );
    roles[role].allow(
      'collections.Alerts.update',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );
    roles[role].allow(
      'collections.Alerts.remove',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );

    roles[role].allow(
      'collections.NotificationsChannels.insert',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );
    roles[role].allow(
      'collections.NotificationsChannels.update',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );
    roles[role].allow(
      'collections.NotificationsChannels.remove',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );

    roles[role].allow(
      'collections.GenericChecks.insert',
      (userId, doc, fields, modifier) => Roles.userHasRole(userId, 'admin'),
    );
    roles[role].allow(
      'collections.GenericChecks.update',
      (userId, doc, fields, modifier) => Roles.userHasRole(userId, 'admin'),
    );
    roles[role].allow(
      'collections.GenericChecks.remove',
      (userId, doc, fields, modifier) => Roles.userHasRole(userId, 'admin'),
    );

    roles[role].allow(
      'collections.AbortAlertTags.insert',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );
    roles[role].allow(
      'collections.AbortAlertTags.update',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );
    roles[role].allow(
      'collections.AbortAlertTags.remove',
      (userId, doc, fields, modifier) =>
        Roles.userHasRole(userId, 'admin') ||
        checkUserTeamApplication(userId, doc.application),
    );

    roles[role].allow(
      'collections.Comments.insert',
      (userId, doc, fields, modifier) => true,
    );
    roles[role].allow(
      'collections.Comments.update',
      (userId, doc, fields, modifier) => true,
    );
    roles[role].allow(
      'collections.Comments.remove',
      (userId, doc, fields, modifier) => true,
    );
  }
};

const checkUserTeamApplication = (userId, applicationName) => {
  if (!applicationName.team) {
    const teamApplication = Applications.findOne({ name: applicationName });
    const user = Meteor.users.findOne({ _id: userId });

    if (user && user.profile.memberOf) {
      return user.profile.memberOf.teams.indexOf(teamApplication.team) !== -1;
    } else {
      return false;
    }
  } else {
    return false;
  }
};

if (Meteor.isClient) {
  setRole('team-admin');
}

if (Meteor.isServer) {
  setRole('team-admin');
}
