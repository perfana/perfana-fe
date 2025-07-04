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
import { ReactiveVar } from 'meteor/reactive-var';
import { log } from '/both/logger';

import './teams.html';
import './teams.less';

Template.teams.onCreated(function teamsOnCreated() {
  this.teamSelected = new ReactiveVar(false);
  this.selectedTeamName = new ReactiveVar();
  this.isAdmin = new ReactiveVar();
  this.teamsViaGroups = new ReactiveVar();

  // Meteor.call('getTeamsSetByGroup', (err, result) => {
  //
  //     if(result.error){
  //         log.error(JSON.stringify(result.error));
  //     } else {
  //         this.teamsViaGroups.set(result.data);
  //     }
  //
  // });

  Meteor.subscribe('teams');

  AutoForm.addHooks(
    'editTeams',
    {
      onSuccess: function () {
        window.toastr.clear();
        window.toastr['success']('Done!', 'Updated team!');
      },
      onError: function (formType, err) {
        window.toastr.clear();
        window.toastr['error'](err, 'Error');
      },
    },
    false,
  );

  AutoForm.addHooks(
    'addTeams',
    {
      onSuccess: function () {
        window.toastr.clear();
        window.toastr['success']('Done!', 'Added team!');
      },
      onError: function (formType, err) {
        window.toastr.clear();
        window.toastr['error'](err, 'Error');
      },
    },
    false,
  );
});

Template.teams.onRendered(function teamsOnRendered() {
  this.autorun(() => {
    this.isAdmin.set(
      Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin'),
    );

    Meteor.call('getTeamsSetByGroup', (err, result) => {
      if (result.error) {
        log.error(JSON.stringify(result.error));
      } else {
        this.teamsViaGroups.set(result.data);
      }
    });
  });
});

Template.teams.helpers({
  canAddTeams() {
    return (
      Template.instance().teamsViaGroups.get() === false &&
      Template.instance().isAdmin.get()
    );
  },
  selectedTeamName() {
    return Template.instance().selectedTeamName.get();
  },
  teamSelected() {
    return Template.instance().teamSelected.get();
  },
  teams() {
    return Teams.find();
  },
  fields() {
    return [
      { key: 'organisation', label: 'Organisation', cellClass: 'col-md-2' },
      { key: 'name', label: 'Name', cellClass: 'col-md-2' },
      { key: 'description', label: 'Description', cellClass: 'col-md-7' },
      {
        key: '_id',
        label: '',
        isVisible: Template.instance().isAdmin,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="edit-team" class="fa fa-pencil" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Edit team"></i>`,
          );
        },
      },
      {
        key: '_id',
        label: '',
        isVisible: Template.instance().isAdmin,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="delete-team" class="fa fa-trash" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete team"></i>`,
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
      noDataTmpl: Template.noTeams,
    };
  },
  rowClass() {
    if (Template.instance().selectedTeamName.get()) {
      return function (item) {
        if (item.name === this.templateData.selectedTeamName) {
          return 'team-selected';
        }
      };
    }
  },
});

Template.teams.events({
  'click .reactive-table.admin-teams tbody tr'(event, template) {
    event.preventDefault();
    switch (event.target.id) {
      case 'delete-team':
        if (template.teamsViaGroups.get() === false) {
          swal({
            title: 'Delete team',
            text: 'Are you sure?',
            icon: 'warning',
            buttons: ['Cancel', 'OK'],
            dangerMode: true,
          }).then((willDelete) => {
            //bound to the current `this`
            if (willDelete) {
              Meteor.call('deleteTeam', this._id, (err, result) => {
                if (result.error) {
                  window.toastr.clear();
                  window.toastr['error'](JSON.stringify(result.error), 'Error');
                } else {
                  window.toastr.clear();
                  window.toastr['success']('Done!', 'Deleted team!');
                }

                swal.close();
              });
            } else {
              swal.close();
            }
          });
        } else {
          event.preventDefault();
          window.toastr.clear();
          window.toastr['error'](
            'Team can only be deleted via IDP groups!',
            'Error',
          );
        }

        break;

      case 'edit-team':
        if (template.teamsViaGroups.get() === false) {
          const afAtts = {};

          afAtts['type'] = 'method-update';
          afAtts['meteormethod'] = 'updateTeam';
          afAtts['id'] = 'editTeams';
          afAtts['schema'] = 'TeamSchema';
          afAtts['collection'] = 'Teams';
          afAtts['buttonContent'] = 'Update';
          afAtts['backdrop'] = 'static';

          AutoForm.addHooks(
            afAtts['id'],
            {
              onSuccess: function () {
                // noinspection JSCheckFunctionSignatures
                Modal.hide('afModalWindow');
              },
            },
            false,
          );

          Modal.show('afModalWindow', {
            title: 'Update team',
            dialogClass: '',
            afAtts: afAtts,
            operation: 'update',
            collection: 'Teams',
            doc: this,
            backdrop: afAtts['backdrop'],
          });
        } else {
          window.toastr.clear();
          window.toastr['error'](
            'Team can only be deleted via IDP groups!',
            'Error',
          );
        }
        break;
      default:
        Template.instance().teamSelected.set(true);
        Template.instance().selectedTeamName.set(this.name);
        Session.set('teamName', this.name);
        break;
    }
  },
});
