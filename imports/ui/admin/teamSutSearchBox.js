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

import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Meteor } from 'meteor/meteor';
import { Teams } from '../../collections/teams';
import { $ } from 'meteor/jquery';
import { Applications } from '../../collections/applications';

import './teamSutSearchBox.html';

Template.teamSutSearchBox.onRendered(function () {
  // Enable select2
  $('.select2-dropdown#team-suts')
    .select2({
      placeholder: 'System under test',
      allowClear: true,
      multiple: true,
    })
    .on('change', function () {
      Session.set('selectedTeamSuts', $('.select2-dropdown#team-suts').val());
    });
});

Template.teamSutSearchBox.onCreated(function () {
  Meteor.subscribe('applications');
});

Template.teamSutSearchBox.helpers({
  results() {
    const team = Teams.findOne({ name: Session.get('teamName') });
    if (team) {
      return Applications.find({ team: { $ne: team._id } });
    }
  },
  teamSutSelected: function () {
    return (
      Session.get('selectedTeamSuts') &&
      Session.get('selectedTeamSuts').length > 0
    );
  },
});

Template.teamSutSearchBox.events({
  'click #add-sut'() {
    Meteor.call(
      'addTeamSuts',
      Session.get('teamName'),
      Session.get('selectedTeamSuts'),
      (err, result) => {
        if (result.error) {
          toastr.clear();
          window.toastr['error'](JSON.stringify(result.error), 'Error');
        } else {
          // trigger rerender
          const teamName = Session.get('teamName');
          Session.set('selectedTeamSuts', undefined);
          Session.set('teamName', undefined);
          Session.set('teamName', teamName);
        }
      },
    );
  },
});
