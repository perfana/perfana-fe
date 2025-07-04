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

// noinspection JSJQueryEfficiency

import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Meteor } from 'meteor/meteor';
import { $ } from 'meteor/jquery';

import './notificationsChannelsSearchBox.html';
import { NotificationsChannels } from '/imports/collections/notificationChannels';
import { Applications } from '/imports/collections/applications';
import { Teams } from '/imports/collections/teams';

Template.notificationsChannelsSearchBox.onRendered(function () {
  // Enable select2
  $('.select2-dropdown#notifications-channels')
    .select2({
      allowClear: true,
      multiple: true,
    })
    .on('change', function () {
      Session.set(
        'notificationsChannels',
        $('.select2-dropdown#notifications-channels').val(),
      );
    });

  $('.select2-dropdown#notifications-channels').on(
    'select2:unselecting',
    function (evt) {
      if (!evt.params.args.originalEvent) return;
      evt.params.args.originalEvent.stopPropagation();
    },
  );
});

Template.notificationsChannelsSearchBox.onCreated(function () {
  Meteor.subscribe('notificationsChannels');
  Meteor.subscribe('applications');
  Meteor.subscribe('teams');
});

Template.notificationsChannelsSearchBox.helpers({
  notificationsChannels() {
    let applicationTeamQuery = {};
    const application = Applications.findOne({
      name: FlowRouter.current().queryParams.systemUnderTest,
    });

    if (application) {
      if (application.team) {
        const team = Teams.findOne({
          _id: application.team,
        });

        if (team) {
          applicationTeamQuery.$or = [
            { application: application.name },
            { team: team.name },
          ];
        }
      } else {
        applicationTeamQuery = { application: application.name };
      }
    }
    return NotificationsChannels.find({
      $or: [applicationTeamQuery, { application: { $exists: false } }],
    }).fetch();
  },
});
