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
import { Session } from 'meteor/session';

import './usersWithoutTeam.html';
import { log } from '/both/logger';

Template.usersWithoutTeam.onCreated(function homeOnCreated() {
  this.usersWithoutTeam = new ReactiveVar([]);

  this.teamsViaGroups = new ReactiveVar(false);

  Meteor.call('getTeamsSetByGroup', (err, result) => {
    if (result.error) {
      log.error(JSON.stringify(result.error));
    } else {
      this.teamsViaGroups.set(result.data);
    }
  });

  this.autorun(() => {
    Session.get('usersUpdated');

    Meteor.call('getUsersWithoutTeam', (err, usersWithoutTeam) => {
      if (usersWithoutTeam.error) {
        log.error(JSON.stringify(usersWithoutTeam.error));
      } else {
        this.usersWithoutTeam.set(usersWithoutTeam.data);
      }
    });
  });
});

Template.usersWithoutTeam.helpers({
  fields() {
    return [
      { key: 'profile.name', label: 'Name', cellClass: 'col-md-11' },
      {
        key: '_id',
        label: '',
        isVisible: Template.instance().teamsViaGroups.get() === false,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="add-to-team" class="fa fa-plus reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Add to team"></i>`,
          );
        },
      },
    ];
  },
  settings() {
    return {
      rowsPerPage: 20,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
    };
  },

  usersWithoutTeam() {
    return Template.instance().usersWithoutTeam.get() !== undefined ?
        Template.instance().usersWithoutTeam.get()
      : [];
  },
  allUsersInTeam() {
    return (
      Template.instance().usersWithoutTeam.get() &&
      Template.instance().usersWithoutTeam.get().length === 0
    );
  },
});

Template.usersWithoutTeam.events({
  'click .reactive-table.users-without-teams tbody tr'(event) {
    if (event.target.id === 'add-to-team') {
      Modal.show('addTeamsModal', { user: this });
    }
  },
});

Template.addTeamsModal.onCreated(function addTeamsModalOnCreated() {
  this.teamsViaGroups = new ReactiveVar(false);

  Meteor.call('getTeamsSetByGroup', (err, result) => {
    if (result.error) {
      log.error(JSON.stringify(result.error));
    } else {
      this.teamsViaGroups.set(result.data);
    }
  });
});

Template.addTeamsModal.helpers({
  teamsSelected: function () {
    return (
      Session.get('selectedTeams') && Session.get('selectedTeams').length > 0
    );
  },
});

Template.addTeamsModal.events({
  'click #add-team'(event, template) {
    if (template.teamsViaGroups.get() === false) {
      Meteor.call(
        'addUserToTeam',
        this.user._id,
        Session.get('selectedTeams'),
        (err, result) => {
          if (result.error) {
            toastr.clear();
            window.toastr['error'](JSON.stringify(result.error), 'Error');
          } else {
            window.toastr.clear();
            window.toastr['success']('Done!', 'Added user to team');

            // noinspection JSCheckFunctionSignatures
            Modal.hide('addTeamsModal');

            // trigger rerender
            if (Session.equals('usersUpdated', true)) {
              Session.set('usersUpdated', false);
            } else {
              Session.set('usersUpdated', true);
            }
          }
        },
      );
    } else {
      event.preventDefault();
      window.toastr.clear();
      window.toastr['error'](
        'Team members can only be added via IDP groups!',
        'Error',
      );
    }
  },
});
