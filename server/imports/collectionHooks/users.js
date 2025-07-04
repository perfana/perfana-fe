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

// noinspection JSValidateTypes

import { Meteor } from 'meteor/meteor';
import { getDefaultOrganisation, Teams } from '/imports/collections/teams';
import { Configuration } from '/imports/collections/configuration';

export function setupUsersHook() {
  Meteor.users.after.insert(function (userId, doc) {
    const user = doc;
    const teamsFromGroup = Configuration.findOne({
      $and: [{ type: 'perfana' }, { key: 'perfanaTeamGroupPattern' }],
    });

    const perfanaAdminRoleFromGroup = Configuration.findOne({
      $and: [{ type: 'perfana' }, { key: 'perfanaAdminGroup' }],
    });

    const perfanaSuperAdminRoleFromGroup = Configuration.findOne({
      $and: [{ type: 'perfana' }, { key: 'perfanaSuperAdminGroup' }],
    });

    // console.log('UsersHook | user added: ' + JSON.stringify(user))

    /* If user does not have profile, initialise it */
    if (!user.profile) {
      const profile = {};
      profile.name = user.emails[0].address ? user.emails[0].address : '';
      profile.memberOf = {};
      profile.memberOf.teams = [];
      profile.theme = 'light';

      Meteor.users.update(
        {
          _id: user._id,
        },
        {
          $set: {
            profile: profile,
          },
        },
      );
    } else if (user.profile && !user.profile.memberOf) {
      user.profile.memberOf = {};
      user.profile.memberOf.teams = [];
      user.profile.theme = 'light';

      Meteor.users.update(
        {
          _id: user._id,
        },
        {
          $set: {
            profile: user.profile,
          },
        },
      );
    }

    if (!user.emails || user.emails.length === 0) {
      const emails = [];

      Object.keys(user.services).forEach((service) => {
        if (
          service === 'keycloak' ||
          service === 'google' ||
          service === 'oidc'
        ) {
          if (user.services[service].email) {
            // if (service === 'oidc') {
            //     emails.push({
            //         address: capitalizeEmail(user.services[service].email),
            //         verified: true
            //     })
            // } else {
            emails.push({
              address: user.services[service].email,
              verified: true,
            });
            // }
          }
        }
      });

      Meteor.users.update(
        {
          _id: user._id,
        },
        {
          $set: {
            emails: emails,
          },
        },
      );
    }

    if (
      user.username !== 'admin' &&
      (teamsFromGroup !== undefined || perfanaAdminRoleFromGroup !== undefined)
    ) {
      processGroups(
        user,
        perfanaAdminRoleFromGroup,
        teamsFromGroup,
        perfanaSuperAdminRoleFromGroup,
      );
    }
  });

  Meteor.users.after.update(function (userId, doc) {
    const user = doc;

    const teamsFromGroup = Configuration.findOne({
      $and: [{ type: 'perfana' }, { key: 'perfanaTeamGroupPattern' }],
    });

    const perfanaAdminRoleFromGroup = Configuration.findOne({
      $and: [{ type: 'perfana' }, { key: 'perfanaAdminGroup' }],
    });

    const perfanaSuperAdminRoleFromGroup = Configuration.findOne({
      $and: [{ type: 'perfana' }, { key: 'perfanaSuperAdminGroup' }],
    });

    if (
      user.username !== 'admin' &&
      (teamsFromGroup !== undefined || perfanaAdminRoleFromGroup !== undefined)
    ) {
      processGroups(
        user,
        perfanaAdminRoleFromGroup,
        teamsFromGroup,
        perfanaSuperAdminRoleFromGroup,
      );
    }
  });
}

const processGroups = (
  user,
  perfanaAdminRoleFromGroup,
  teamsFromGroup,
  perfanaSuperAdminRoleFromGroup,
) => {
  /* Add or remove teams and roles based on groups */
  const perfanaAdminGroupName =
    perfanaAdminRoleFromGroup !== undefined ?
      perfanaAdminRoleFromGroup.value
    : undefined;
  const perfanaSuperAdminGroupName =
    perfanaSuperAdminRoleFromGroup !== undefined ?
      perfanaSuperAdminRoleFromGroup.value
    : undefined;
  let perfanaTeamGroupPattern;
  let perfanaTeamGroupRegEx;
  if (teamsFromGroup !== undefined) {
    perfanaTeamGroupPattern = teamsFromGroup.value;
    perfanaTeamGroupRegEx = new RegExp(perfanaTeamGroupPattern, 'i');
  }
  let isAdmin = false;
  let isSuperAdmin = false;
  const teams = [];

  Object.keys(user.services).forEach((service) => {
    if (service === 'keycloak' || service === 'google' || service === 'oidc') {
      if (
        user.services[service].groups &&
        user.services[service].groups.length > 0
      ) {
        user.services[service].groups.forEach((group) => {
          if (perfanaAdminRoleFromGroup !== undefined) {
            if (group === perfanaAdminGroupName) {
              isAdmin = true;
              if (!Roles.userHasRole(user._id, 'admin'))
                Roles.addUserToRoles(user._id, ['admin']);
            }
          }
          if (perfanaSuperAdminRoleFromGroup !== undefined) {
            if (group === perfanaSuperAdminGroupName) {
              isSuperAdmin = true;
              if (!Roles.userHasRole(user._id, 'super-admin'))
                Roles.addUserToRoles(user._id, ['super-admin']);
            }
          }
          if (teamsFromGroup !== undefined) {
            if (perfanaTeamGroupRegEx.test(group)) {
              teams.push(group.match(perfanaTeamGroupRegEx)[1]);
            }
          }
        });
      }
    }
  });

  /* Remove admin rol if perfana admin group does not exist */

  if (perfanaAdminRoleFromGroup !== undefined && isAdmin === false) {
    if (Roles.userHasRole(user._id, 'admin'))
      Roles.removeUserFromRoles(user._id, ['admin']);
  }

  if (perfanaSuperAdminRoleFromGroup !== undefined && isSuperAdmin === false) {
    if (Roles.userHasRole(user._id, 'super-admin'))
      Roles.removeUserFromRoles(user._id, ['super-admin']);
  }

  /* Create team(s) if they not exist */

  if (teamsFromGroup !== undefined) {
    const organisation = getDefaultOrganisation();

    teams.forEach((team) => {
      // replace non-alphanumeric characters with spaces
      team = team.replace(/[^a-zA-Z0-9]/g, ' ');

      Teams.upsert(
        {
          name: team,
        },
        {
          $set: {
            name: team,
            organisation: organisation,
          },
        },
      );

      const storedTeam = Teams.findOne({
        $and: [{ name: team }, { organisation: organisation }],
      });

      if (
        (storedTeam &&
          user.profile.memberOf &&
          user.profile.memberOf.teams &&
          user.profile.memberOf.teams.length === 0) ||
        (user.profile.memberOf.teams.length > 0 &&
          user.profile.memberOf.teams.indexOf(storedTeam._id) === -1)
      ) {
        Meteor.users.update(
          { _id: user._id },
          {
            $addToSet: {
              'profile.memberOf.teams': storedTeam._id,
            },
          },
        );

        Roles.addUserToRoles(user._id, ['team-admin']);
      }
    });

    /* remove user from teams that if group is not there */
    const remainingTeams =
      user.profile.memberOf && user.profile.memberOf.teams ?
        user.profile.memberOf.teams
      : [];
    let removeTeams = false;

    if (remainingTeams.length > 0) {
      Object.keys(user.services).forEach((service) => {
        if (
          service === 'keycloak' ||
          service === 'google' ||
          service === 'oidc'
        ) {
          user.profile.memberOf.teams.forEach((teamId) => {
            const storedTeam = Teams.findOne({
              _id: teamId,
            });

            if (user.services[service].groups) {
              const matchedGroups = user.services[service].groups.filter(
                (group) => {
                  return (
                    group.match(perfanaTeamGroupRegEx) &&
                    group.match(perfanaTeamGroupRegEx).length > 0 &&
                    group.match(perfanaTeamGroupRegEx)[1] === storedTeam.name
                  );
                },
              );

              if (matchedGroups.length === 0) {
                remainingTeams.splice(
                  remainingTeams.indexOf(storedTeam._id),
                  1,
                );
                removeTeams = true;
              }
            }
          });
        }
      });

      if (removeTeams) {
        Meteor.users.update(
          { _id: user._id },
          {
            $set: {
              'profile.memberOf.teams': remainingTeams,
            },
          },
        );
      }
    }
  }
};
