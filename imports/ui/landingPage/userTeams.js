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
import { Teams } from '../../collections/teams';
import { Session } from 'meteor/session';

import './userTeams.html';

Template.userTeams.onCreated(function homeOnCreated() {
  Meteor.subscribe('teams');
});

Template.userTeams.helpers({
  userTeams() {
    let userTeams;
    const user = Meteor.user();

    if (user) {
      if (
        Roles.userHasRole(user._id, 'admin') ||
        Roles.userHasRole(user._id, 'super-admin')
      ) {
        userTeams = Teams.find({}, { sort: { name } });
        return userTeams !== undefined ? userTeams : [];
      } else if (user.profile.memberOf) {
        userTeams =
          Teams.find(
            { _id: { $in: user.profile.memberOf.teams } },
            { sort: { name } },
          ) || [];
        return userTeams !== undefined ? userTeams : [];
      } else {
        userTeams = Teams.find({}, { sort: { name } }) || [];
        return userTeams !== undefined ? userTeams : [];
      }
    }
  },
  adminOrNoTeams() {
    const user = Meteor.user();

    if (user) {
      if (
        Roles.userHasRole(user._id, 'admin') ||
        Roles.userHasRole(user._id, 'super-admin')
      ) {
        return true;
      } else {
        return !user.profile.memberOf;
      }
    }
  },
  fields() {
    return [{ key: 'name', label: 'Name' }];
  },
  settings() {
    return {
      rowsPerPage: 10,
      showFilter: true,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      noDataTmpl: Template.noUserTeams,
    };
  },
});

Template.userTeams.events({
  'click .reactive-table tbody tr'() {
    Session.set('team', this.name);
    const queryParams = {};
    queryParams['team'] = this.name;

    FlowRouter.go('testRuns', null, queryParams);
  },
});
