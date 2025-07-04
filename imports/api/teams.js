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
import { check } from 'meteor/check';

import { Teams } from '../collections/teams';
import { Applications } from '../collections/applications';
import _ from 'lodash';

if (Meteor.isServer) {
  Meteor.publish('teams', () => Teams.find());
}

// noinspection JSUnusedGlobalSymbols
Meteor.methods({
  insertTeam: (team) => {
    check(team, Object);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'insert.team.unauthorized',
        'The user is not authorized to create a team',
      );
    }

    const wrap = Meteor.makeAsync(insertTeamFn);
    return wrap(team);
  },
  updateTeam: (team, teamId) => {
    check(team, Object);
    check(teamId, String);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'update.team.unauthorized',
        'The user is not authorized to update a team',
      );
    }

    const wrap = Meteor.makeAsync(updateTeamFn);
    return wrap(team, teamId);
  },
  deleteTeam: (id) => {
    check(id, String);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'delete.team.unauthorized',
        'The user is not authorized to delete a team',
      );
    }

    Teams.remove({ _id: id });
  },
  getNewTeamMembers: (teamName) => {
    check(teamName, String);

    const wrap = Meteor.makeAsync(getNewTeamMembersFn);
    return wrap(teamName);
  },
  getUsersWithoutTeam: () => {
    const wrap = Meteor.makeAsync(getUsersWithoutTeamFn);
    return wrap();
  },
  getTeamMembers: (teamName) => {
    check(teamName, String);

    const wrap = Meteor.makeAsync(getTeamMembersFn);
    return wrap(teamName);
  },
  getNotificationChannelUsers: (application, notificationsChannel) => {
    check(application, Object);
    check(notificationsChannel, Object);

    const wrap = Meteor.makeAsync(getNotificationChannelUsersFn);
    return wrap(application, notificationsChannel);
  },
  addTeamMembers: (teamName, teamMemberIds) => {
    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'update.team.unauthorized',
        'The user is not authorized to update a team',
      );
    }
    check(teamName, String);
    check(teamMemberIds, [String]);

    const wrap = Meteor.makeAsync(addTeamMembersFn);
    return wrap(teamName, teamMemberIds);
  },
  removeTeamMembers: (teamName, teamMemberId) => {
    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'update.team.unauthorized',
        'The user is not authorized to update a team',
      );
    }

    check(teamName, String);
    check(teamMemberId, String);

    const wrap = Meteor.makeAsync(removeTeamMemberFn);
    return wrap(teamName, teamMemberId);
  },
  addTeamSuts: (teamName, applicationIds) => {
    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'update.team.unauthorized',
        'The user is not authorized to update a team',
      );
    }

    check(teamName, String);
    check(applicationIds, [String]);

    const wrap = Meteor.makeAsync(addTeamSutsFn);
    return wrap(teamName, applicationIds);
  },
  removeTeamSut: (teamName, applicationId) => {
    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'delete.team.unauthorized',
        'The user is not authorized to update a team',
      );
    }

    check(teamName, String);
    check(applicationId, String);

    const wrap = Meteor.makeAsync(removeTeamSutFn);
    return wrap(teamName, applicationId);
  },
  addUserToTeam: (userId, teams) => {
    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'update.team.unauthorized',
        'The user is not authorized to update a team',
      );
    }

    check(userId, String);
    check(teams, [String]);

    const wrap = Meteor.makeAsync(addUserToTeamFn);
    return wrap(userId, teams);
  },
});

const removeTeamMemberFn = (teamName, id, callback) => {
  try {
    const team = Teams.findOne({ name: teamName });
    if (team) {
      Meteor.users.update(
        { _id: id },
        {
          $pull: {
            'profile.memberOf.teams': team._id,
          },
        },
      );
    }

    callback(null, true);
  } catch (e) {
    callback(e, null);
  }
};
const removeTeamSutFn = (teamName, id, callback) => {
  try {
    const team = Teams.findOne({ name: teamName });
    if (team) {
      Applications.update(
        { _id: id },
        {
          $unset: {
            team: '',
          },
        },
      );
    }

    callback(null, true);
  } catch (e) {
    callback(e, null);
  }
};
const addTeamMembersFn = (teamName, teamMemberIds, callback) => {
  try {
    const team = Teams.findOne({ name: teamName });
    if (team) {
      teamMemberIds.forEach((id) => {
        Meteor.users.update(
          { _id: id },
          {
            $addToSet: {
              'profile.memberOf.teams': team._id,
              roles: 'team-admin',
            },
          },
        );
      });

      callback(null, true);
    }
  } catch (e) {
    callback(e, null);
  }
};

const addTeamSutsFn = (teamName, applicationIds, callback) => {
  try {
    const team = Teams.findOne({ name: teamName });
    if (team) {
      applicationIds.forEach((id) => {
        Applications.update(
          { _id: id },
          {
            $set: {
              team: team._id,
            },
          },
        );
      });

      callback(null, true);
    }
  } catch (e) {
    callback(e, null);
  }
};
const addUserToTeamFn = (userId, teams, callback) => {
  try {
    Meteor.users.update(
      { _id: userId },
      {
        $set: {
          'profile.memberOf.teams': teams,
        },
        $addToSet: {
          roles: 'team-admin',
        },
      },
    );

    callback(null, true);
  } catch (e) {
    callback(e, null);
  }
};
const getTeamMembersFn = (teamName, callback) => {
  try {
    const team = Teams.findOne({ name: teamName });
    if (team) {
      const teamMembers = Meteor.users
        .find({ 'profile.memberOf.teams': team._id })
        .fetch();
      if (teamMembers) callback(null, teamMembers);
    }
  } catch (e) {
    callback(e, null);
  }
};
export const getNotificationChannelUsersFn = (
  application,
  notificationsChannel,
  callback,
) => {
  try {
    let users;

    if (
      notificationsChannel.includeUserMentions &&
      notificationsChannel.includeUserMentions.length > 0
    ) {
      users = Meteor.users
        .find(
          {
            _id: {
              $in: notificationsChannel.includeUserMentions.map(
                (userId) => userId.id,
              ),
            },
          },
          { fields: { 'profile.name': 1 } },
        )
        .fetch();
    } else {
      users = [];
    }

    if (notificationsChannel.sendWhenAnyTeamMemberIsMentioned) {
      const team = Teams.findOne({ _id: application.team });

      if (team) {
        const teamMembers = Meteor.users
          .find(
            { 'profile.memberOf.teams': team._id },
            { fields: { 'profile.name': 1 } },
          )
          .fetch();

        callback(null, _.union(teamMembers, users));
      } else {
        callback(null, users);
      }
    } else {
      callback(null, users);
    }
  } catch (e) {
    callback(e, null);
  }
};
const getNewTeamMembersFn = (teamName, callback) => {
  try {
    const team = Teams.findOne({ name: teamName });
    if (team) {
      const newTeamMembers = Meteor.users
        .find({
          $or: [
            { 'profile.memberOf.teams': { $ne: team._id } },
            { 'profile.memberOf.teams': { $size: 0 } },
          ],
        })
        .fetch()
        .filter((user) => {
          return !Roles.userHasRole(user._id, 'super-admin');
        });

      if (newTeamMembers) callback(null, newTeamMembers);
    }
  } catch (e) {
    callback(e, null);
  }
};

const getUsersWithoutTeamFn = (callback) => {
  try {
    const users = Meteor.users
      .find(
        {
          $or: [
            { 'profile.memberOf.teams': { $exists: false } },
            { 'profile.memberOf.teams': { $size: 0 } },
          ],
        },
        { fields: { 'profile.name': 1 }, sort: { createdAt: -1 } },
      )
      .fetch();

    const nonAdminUsersWithoutTeam = users.filter((user) => {
      return (
        !Roles.userHasRole(user._id, 'admin') &&
        !Roles.userHasRole(user._id, 'super-admin')
      );
    });

    callback(null, nonAdminUsersWithoutTeam);
  } catch (e) {
    callback(e, null);
  }
};

const insertTeamFn = (team, callback) => {
  Teams.insert(team, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};
const updateTeamFn = (team, teamId, callback) => {
  const modifier = {};
  if (team.$set) modifier.$set = team.$set;
  if (team.$unset) modifier.$unset = team.$unset;

  Teams.update(
    {
      _id: teamId,
    },
    modifier,
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    },
  );
};
