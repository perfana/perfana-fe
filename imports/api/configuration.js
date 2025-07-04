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

import { Configuration } from '../collections/configuration';

if (Meteor.isServer) {
  Meteor.publish('configuration', () => Configuration.find());
}

Meteor.methods({
  getAdminSetByGroup: () => {
    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'get.admin-by-group.unauthorized',
        'The user is not authorized to get this configuration information',
      );
    }

    const wrap = Meteor.makeAsync(getAdminSetByGroupFn);
    return wrap();
  },
  getTeamsSetByGroup: () => {
    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'get.admin-by-group.unauthorized',
        'The user is not authorized to get this configuration information',
      );
    }

    const wrap = Meteor.makeAsync(getTeamsSetByGroupFn);
    return wrap();
  },
});

const getAdminSetByGroupFn = (callback) => {
  try {
    const perfanaAdminGroup = Configuration.findOne({
      $and: [{ type: 'perfana' }, { key: 'perfanaAdminGroup' }],
    });

    callback(null, perfanaAdminGroup !== undefined);
  } catch (err) {
    callback(err, null);
  }
};

const getTeamsSetByGroupFn = (callback) => {
  try {
    const perfanaTeamGroupPattern = Configuration.findOne({
      $and: [{ type: 'perfana' }, { key: 'perfanaTeamGroupPattern' }],
    });

    callback(null, perfanaTeamGroupPattern !== undefined);
  } catch (err) {
    callback(err, null);
  }
};
