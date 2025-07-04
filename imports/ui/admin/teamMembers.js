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
import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';
import { log } from '/both/logger';

import './teamMembers.html';

Template.teamMembers.onCreated(function teamMembersOnCreated() {
  Meteor.subscribe('teams');

  Session.set('teamName', this.data.teamName);

  this.teamMembers = new ReactiveVar([]);
  this.newTeamMembers = new ReactiveVar([]);
  this.isAdmin = new ReactiveVar();
  this.teamsViaGroups = new ReactiveVar();

  Meteor.call('getTeamsSetByGroup', (err, result) => {
    if (result.error) {
      log.error(JSON.stringify(result.error));
    } else {
      this.teamsViaGroups.set(result.data);
    }
  });
});

Template.teamMembers.onRendered(function teamMembersOnRendered() {
  this.autorun(() => {
    this.isAdmin.set(
      Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin'),
    );

    Meteor.call(
      'getTeamMembers',
      Session.get('teamName'),
      (err, teamMembers) => {
        if (teamMembers.error) {
          window.toastr['error'](JSON.stringify(teamMembers.error), 'Error');
        } else {
          this.teamMembers.set(teamMembers.data);
        }
      },
    );
    Meteor.call(
      'getNewTeamMembers',
      Session.get('teamName'),
      (err, teamMembers) => {
        if (teamMembers.error) {
          window.toastr['error'](JSON.stringify(teamMembers.error), 'Error');
        } else {
          this.newTeamMembers.set(teamMembers.data);
        }
      },
    );
  });
});

Template.teamMembers.helpers({
  canAddTeams() {
    return (
      Template.instance().teamsViaGroups.get() === false &&
      Template.instance().isAdmin.get()
    );
  },
  newTeamMembers() {
    return Template.instance().newTeamMembers.get().length > 0;
  },
  teamMembers() {
    return Template.instance().teamMembers.get();
  },
  fields() {
    return [
      // {key: 'grafana', label: 'Grafana instance'},
      { key: 'emails.0.address', label: 'Email', cellClass: 'col-md-2' },
      { key: 'profile.name', label: 'Name', cellClass: 'col-md-9' },
      // { key: '_id', label: '',
      //     isVisible: Template.instance().showIcons,
      //     fn: (value, object, key) =>  {
      //         return new Spacebars.SafeString(`<i id="edit-auto-config-dashboard" class="fa fa-pencil" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Edit dashboard"></i>`);
      //     }
      // },

      {
        key: '_id',
        label: '',
        isVisible: Template.instance().isAdmin,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="delete-team-member" class="fa fa-trash" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete dashboard"></i>`,
          );
        },
      },
    ];
  },
  settings() {
    return {
      rowsPerPage: 50,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      noDataTmpl: Template.noTeamMembers,
    };
  },
});

Template.teamMembers.events({
  'click .reactive-table.team-members tbody tr'(event, template) {
    switch (event.target.id) {
      case 'delete-team-member':
        if (template.teamsViaGroups.get() === false) {
          swal({
            title: 'Remove member from team',
            text: 'Are you sure?',
            icon: 'warning',
            buttons: ['Cancel', 'OK'],
            dangerMode: true,
          }).then((willDelete) => {
            //bound to the current `this`
            if (willDelete) {
              Meteor.call(
                'removeTeamMembers',
                Session.get('teamName'),
                this._id,
                () => {
                  // trigger reload
                  const teamName = Session.get('teamName');
                  Session.set('teamName', undefined);
                  Session.set('teamName', teamName);
                },
              );
              swal.close();
            } else {
              swal.close();
            }
          });
        } else {
          event.preventDefault();
          window.toastr.clear();
          window.toastr['error'](
            'Team members can only be removed via IDP groups!',
            'Error',
          );
        }
        break;
    }
  },
});
