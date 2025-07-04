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
import { Applications } from '/imports/collections/applications';
import { Teams } from '/imports/collections/teams';

Meteor.methods({
  toggleUserTheme: () => {
    const user = Meteor.user();

    const theOtherTheme = user.profile.theme === 'light' ? 'dark' : 'light';

    Meteor.users.update(
      { _id: Meteor.userId() },
      { $set: { 'profile.theme': theOtherTheme } },
    );
  },
  updateUser: (user) => {
    check(user, Object);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'update.users.unauthorized',
        'The user is not authorized update users',
      );
    }

    const wrap = Meteor.makeAsync(updateUserFn);
    return wrap(user);
  },
  deleteUser: (id) => {
    check(id, String);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'delete.users.unauthorized',
        'The user is not authorized delete users',
      );
    }
    const wrap = Meteor.makeAsync(deleteUserFn);
    return wrap(id);
  },
  getUsers: () => {
    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'get.users.unauthorized',
        'The user is not authorized get users',
      );
    }
    const wrap = Meteor.makeAsync(getUsersFn);
    return wrap();
  },

  getLogoutUrl: () => {
    if (!Meteor.userId()) {
      throw new Meteor.Error(
        'get.id_token.unauthorized',
        'The user has to be logged in to get a token',
      );
    }
    const wrap = Meteor.makeAsync(getLogoutUrlFn);
    return wrap();
  },
  mentionUsers: () => {
    if (!Meteor.userId()) {
      throw new Meteor.Error(
        'get.mention-users.unauthorized',
        'The user needs to be logged in to get users to mention',
      );
    }

    const wrap = Meteor.makeAsync(getMentionUsersFn);
    return wrap();
  },
  getMentionUsersForNotificationsChannel: () => {
    if (!Meteor.userId()) {
      throw new Meteor.Error(
        'get.mention-users.unauthorized',
        'The user needs to be logged in to get users to mention',
      );
    }
    const mentionUsers = Meteor.users
      .find({}, { fields: { 'profile.name': 1, emails: 1 } })
      .fetch();

    return mentionUsers.map((user) => {
      return { label: user.profile.name, value: user._id };
    });
  },
  userHasPermissionForApplication: (application) => {
    check(application, String);

    if (!Meteor.userId()) {
      throw new Meteor.Error(
        'get.user-permission.unauthorized',
        'The user needs to be logged in to check user permissions',
      );
    }
    const wrap = Meteor.makeAsync(userHasPermissionForApplicationFn);
    return wrap(application);
  },
});

const userHasPermissionForApplicationFn = (applicationName, callback) => {
  const user = Meteor.user();

  if (user) {
    if (
      Roles.userHasRole(user._id, 'admin') ||
      Roles.userHasRole(user._id, 'super-admin')
    ) {
      callback(null, true);
    } else {
      const application = Applications.findOne({
        name: applicationName,
      });

      if (application && application.team) {
        const userAllowed =
          user.profile.memberOf !== undefined &&
          user.profile.memberOf.teams.length > 0 &&
          user.profile.memberOf.teams
            .map((team) => {
              return team;
            })
            .indexOf(application.team) !== -1;
        callback(null, userAllowed);
      } else {
        callback(null, false);
      }
    }
  }
};

const getMentionUsersFn = (callback) => {
  try {
    const mentionUsers = Meteor.users
      .find({}, { fields: { 'profile.name': 1, emails: 1 } })
      .fetch();

    callback(
      null,
      mentionUsers.map((user) => {
        return { name: user.profile.name, username: user.emails[0].address };
      }),
    );
  } catch (e) {
    callback(e, null);
  }
};

const deleteUserFn = (id, callback) => {
  try {
    Meteor.users.remove({ _id: id });

    callback(null, true);
  } catch (e) {
    callback(e, null);
  }
};

const updateUserFn = (user, callback) => {
  try {
    if (user.admin === true) {
      Roles.addUserToRoles(user._id, ['admin']);
    } else {
      Roles.removeUserFromRoles(user._id, ['admin']);
    }

    callback(null, true);
  } catch (e) {
    callback(e, null);
  }
};

const getUsersFn = (callback) => {
  try {
    const users = Meteor.users
      .find()
      .fetch()
      .filter((user) => {
        return !Roles.userHasRole(user._id, 'super-admin');
      });

    users.forEach((user, userIndex) => {
      // strip sensitive data
      // delete users[userIndex]._id;
      delete users[userIndex].services;
      // delete users[userIndex].createdAt;
      if (
        user.profile &&
        user.profile.memberOf &&
        user.profile.memberOf.teams
      ) {
        // noinspection JSUndefinedPropertyAssignment
        users[userIndex].teams = [];
        user.profile.memberOf.teams.forEach((team) => {
          team = Teams.findOne({ _id: team });
          if (team) users[userIndex].teams.push(team.name);
        });
      }
    });

    callback(null, users);
  } catch (e) {
    callback(e, null);
  }
};

const getLogoutUrlFn = (callback) => {
  try {
    let logoutUrl;
    let idToken;
    const user = Meteor.user();
    if (user && user.services && user.services.oidc) {
      if (Meteor.settings.authenticationServices.oidc.logoutEndpoint) {
        idToken =
          user &&
          user.services &&
          user.services.oidc &&
          user.services.oidc.idToken;

        if (idToken) {
          logoutUrl =
            Meteor.settings.authenticationServices.oidc.logoutEndpoint +
            '?client_id=' +
            Meteor.settings.authenticationServices.oidc.clientId +
            '&post_logout_redirect_uri=' +
            encodeURIComponent(Meteor.settings.public.perfanaUrl + '/login') +
            '&id_token_hint=' +
            idToken;
          callback(null, logoutUrl);
        } else {
          logoutUrl =
            Meteor.settings.authenticationServices.oidc.logoutEndpoint +
            '?client_id=' +
            Meteor.settings.authenticationServices.oidc.clientId +
            '&post_logout_redirect_uri=' +
            encodeURIComponent(Meteor.settings.public.perfanaUrl + '/login');
          callback(null, logoutUrl);
        }
      } else {
        callback(null, null);
      }
    } else {
      callback(null, null);
    }
  } catch (e) {
    callback(e, null);
  }
};
