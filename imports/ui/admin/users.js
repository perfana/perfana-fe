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

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { log } from '/both/logger';

import './users.html';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';
import { formatDate } from '../../helpers/utils';

Template.users.onCreated(function usersOnCreated() {
  this.selectedTeamName = new ReactiveVar();
  this.isAdmin = new ReactiveVar();

  this.users = new ReactiveVar();
  this.teamsViaGroups = new ReactiveVar();
  this.adminViaGroup = new ReactiveVar();

  this.autorun(() => {
    Session.get('usersUpdated');
    Meteor.call('getUsers', (err, users) => {
      if (users.error) {
        log.error(JSON.stringify(users.error));
      } else {
        this.users.set(users.data);
      }
    });
  });

  AutoForm.addHooks(
    'addUsers',
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

Template.users.onRendered(function usersOnRendered() {
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

    Meteor.call('getAdminSetByGroup', (err, result) => {
      if (result.error) {
        log.error(JSON.stringify(result.error));
      } else {
        this.adminViaGroup.set(result.data);
      }
    });
  });
});

Template.users.helpers({
  isAdmin() {
    return Template.instance().isAdmin.get();
  },
  users() {
    return Template.instance().users && Template.instance().users.get();
  },

  fields() {
    return [
      { key: 'profile.name', label: 'Name', cellClass: 'col-md-2' },
      { key: 'emails.0.address', label: 'Email', cellClass: 'col-md-2' },
      {
        key: 'teams',
        label: 'Teams',
        cellClass: 'col-md-2',
        isVisible: Template.instance().isAdmin,
        fn: (value) => {
          return new Spacebars.SafeString(getTeamsSpan(value));
        },
      },

      {
        key: 'createdAt',
        label: 'Created',
        isVisible: Template.instance().isAdmin,
        cellClass: 'col-md-2',
        fn: (value) => {
          const sortValue = new Date(value).getTime(); // parse date format here and get value to sort by
          // noinspection HtmlUnknownAttribute
          return new Spacebars.SafeString(
            '<span sort=' + sortValue + '>' + formatDate(value) + '</span>',
          );
        },
      },
      {
        key: 'profile.lastLogin',
        label: 'Last login',
        isVisible: Template.instance().isAdmin,
        cellClass: 'col-md-3',
        fn: (value) => {
          if (value) {
            const sortValue = new Date(value).getTime(); // parse date format here and get value to sort by
            // noinspection HtmlUnknownAttribute
            return new Spacebars.SafeString(
              '<span sort=' + sortValue + '>' + formatDate(value) + '</span>',
            );
          } else {
            return 'Unknown';
          }
        },
      },
      {
        key: 'roles',
        label: 'Admin',
        isVisible: Template.instance().isAdmin,
        fn: (value) => {
          return new Spacebars.SafeString(getRolesSpan(value));
        },
      },

      {
        key: '_id',
        label: '',
        isVisible: Template.instance().isAdmin,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="delete-user" class="fa fa-trash" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete user"></i>`,
          );
        },
      },
    ];
  },
  settings() {
    return {
      rowsPerPage: 50,
      showFilter: true,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
    };
  },
});

Template.users.events({
  'click .reactive-table.admin-users tbody tr'(event, template) {
    const user = this;
    switch (event.target.id) {
      case 'delete-user':
        swal({
          title: 'Delete user',
          text: 'Are you sure?',
          icon: 'warning',
          buttons: ['Cancel', 'OK'],
          dangerMode: true,
        }).then((willDelete) => {
          //bound to the current `this`
          if (willDelete) {
            Meteor.call('deleteUser', this._id, (err, result) => {
              if (result.error) {
                window.toastr.clear();
                window.toastr['error'](JSON.stringify(result.error), 'Error');
              } else {
                window.toastr.clear();
                window.toastr['success']('Done!', 'Deleted user!');
              }

              // trigger rerender
              if (Session.equals('usersUpdated', true)) {
                Session.set('usersUpdated', false);
              } else {
                Session.set('usersUpdated', true);
              }
              swal.close();
            });
          } else {
            swal.close();
          }
        });

        break;

      case 'make-admin-user':
        if (template.adminViaGroup.get() === false) {
          user.admin = !!event.target.checked;

          Meteor.call('updateUser', user, (err, result) => {
            if (result.error) {
              window.toastr.clear();
              window.toastr['error'](JSON.stringify(result.error), 'Error');
            } else {
              window.toastr.clear();
              window.toastr['success']('Done!', 'Updated user!');
            }
          });
        } else {
          event.preventDefault();
          window.toastr.clear();
          window.toastr['error'](
            'Admin role can only be configured via IDP group!',
            'Error',
          );
        }
        break;

      case 'edit-teams':
        if (template.teamsViaGroups.get() === false) {
          Modal.show('addTeamsModal', { user: this });
        } else {
          window.toastr.clear();
          window.toastr['error'](
            'Team members can only be assigned to a team via IDP groups!',
            'Error',
          );
        }
        break;

      default:
        break;
    }
  },
  'click #add-user'() {
    Modal.show('addUserModal');
  },
});

Template.addUserModal.events({
  'click #add-new-user'() {
    const user = {};
    user.profile = {};
    user.profile.name = $('#user-name').val();
    user.emails = [];
    user.emails.push({
      address: $('#user-name').val(),
      verified: false,
    });
  },
});

const getTeamsSpan = (teams) => {
  let HTML = '';
  if (teams && teams.length > 0) {
    teams.forEach((team) => {
      HTML += `<span id="edit-teams" class="break-word label label-default" style="margin:5px;"  aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Edit teams for user">${team}</span>`;
    });
  } else {
    HTML = '<a id="edit-teams">Add team</a>';
  }

  return HTML;
};
const getRolesSpan = (roles) => {
  let HTML = '';
  if (roles && roles.indexOf('admin') !== -1) {
    // HTML += `<span class="break-word label label-default" style="margin:5px;">Admin</span>`
    HTML += `<input id="make-admin-user" class="reactive-table-icon" type='checkbox' checked />`;
  } else {
    HTML += `<input id="make-admin-user" class="reactive-table-icon" type='checkbox' />`;
  }

  return HTML;
};
