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

import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Meteor } from 'meteor/meteor';
import { $ } from 'meteor/jquery';
import { log } from '/both/logger';

import './teamMemberSearchBox.html';

Template.teamMemberSearchBox.onRendered(function () {
  // Enable select2
  $('.select2-dropdown#team-members')
    .select2({
      placeholder: 'Team members',
      allowClear: false,
      multiple: true,
    })
    .on('change', function () {
      Session.set(
        'selectedTeamMembers',
        $('.select2-dropdown#team-members').val(),
      );
    });
});

Template.teamMemberSearchBox.onCreated(function () {
  this.addTeamMembers = new ReactiveVar();

  this.autorun(() => {
    Meteor.call(
      'getNewTeamMembers',
      Session.get('teamName'),
      (err, newTeamMembers) => {
        if (newTeamMembers.error) {
          log.error(JSON.stringify(newTeamMembers.error));
        } else {
          this.addTeamMembers.set(newTeamMembers.data);
        }
      },
    );
  });
});

Template.teamMemberSearchBox.helpers({
  results() {
    return Template.instance().addTeamMembers.get();
  },
  teamMemberSelected: function () {
    return (
      Session.get('selectedTeamMembers') &&
      Session.get('selectedTeamMembers').length > 0
    );
  },
});

Template.teamMemberSearchBox.events({
  'click #add-member'() {
    Meteor.call(
      'addTeamMembers',
      Session.get('teamName'),
      Session.get('selectedTeamMembers'),
      (err, result) => {
        if (result.error) {
          toastr.clear();
          window.toastr['error'](JSON.stringify(result.error), 'Error');
        } else {
          // trigger rerender
          const teamName = Session.get('teamName');
          Session.set('selectedTeamMembers', undefined);
          Session.set('teamName', undefined);
          Session.set('teamName', teamName);
        }
      },
    );
  },
});
