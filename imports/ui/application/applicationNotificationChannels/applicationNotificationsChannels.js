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
import { log } from '/both/logger';

// import { NotificationsChannels } from '../../../collections/notificationChannels';
import { ReactiveVar } from 'meteor/reactive-var';

import './applicationNotificationsChannels.html';
import { Applications } from '../../../collections/applications';
import { Teams } from '../../../collections/teams';

Template.applicationNotificationsChannels.onCreated(
  function abortAlertTagsOnCreated() {
    Meteor.subscribe('notificationsChannels');

    this.notificationChannels = new ReactiveVar();

    Session.set('updated', false);

    this.userHasPermissionForApplication = new ReactiveVar(false);

    this.autorun(() => {
      Session.get('updated'); //trigger on update

      const user = Meteor.user();

      Meteor.subscribe('applications');
      Meteor.subscribe('teams');

      if (
        user &&
        (Roles.userHasRole(user._id, 'admin') ||
          Roles.userHasRole(user._id, 'super-admin'))
      ) {
        this.userHasPermissionForApplication.set(true);
      } else {
        const application = Applications.findOne({
          name: Session.get('application'),
        });

        if (application) {
          Meteor.call(
            'userHasPermissionForApplication',
            application.name,
            (err, result) => {
              if (result.error) {
                log.error(JSON.stringify(result.error));
              } else {
                this.userHasPermissionForApplication.set(result.data);
              }
            },
          );
        }
      }

      let query = {};

      if (Session.get('application')) {
        Meteor.subscribe(
          'applications',
          {},
          {
            onReady: () => {
              Meteor.subscribe(
                'teams',
                {},
                {
                  onReady: () => {
                    const application = Applications.findOne({
                      name: Session.get('application'),
                    });

                    if (application) {
                      if (application.team) {
                        const team = Teams.findOne({
                          _id: application.team,
                        });

                        if (team) {
                          query.$or = [
                            { application: application.name },
                            { team: team.name },
                          ];
                        } else {
                          query = { application: application.name };
                        }
                      } else {
                        query = { application: application.name };
                      }
                    }

                    Meteor.call(
                      'getNotificationsChannels',
                      query,
                      (err, notificationChannels) => {
                        if (notificationChannels.error) {
                          log.error(JSON.stringify(notificationChannels.error));
                        } else {
                          this.notificationChannels.set(
                            notificationChannels.data,
                          );
                        }
                      },
                    );
                  },
                },
              );
            },
          },
        );
      } else {
        query = { application: { $exists: false } };

        Meteor.call(
          'getNotificationsChannels',
          query,
          (err, notificationChannels) => {
            if (notificationChannels.error) {
              log.error(JSON.stringify(notificationChannels.error));
            } else {
              this.notificationChannels.set(notificationChannels.data);
            }
          },
        );
      }
    });

    AutoForm.addHooks(
      'addNotificationsChannel',
      {
        before: {
          method: function (doc) {
            if (doc.teamChannel === true) {
              const application = Applications.findOne({
                name: doc.application,
              });

              if (application) {
                const team = Teams.findOne({
                  _id: application.team,
                });

                if (team) doc.team = team.name;
              }
            }

            return doc;
          },
        },
        onSuccess: function () {
          window.toastr.clear();
          window.toastr['success']('Done!', 'Added notification channel!');
          if (Session.equals('updated', false)) {
            Session.set('updated', true);
          } else {
            Session.set('updated', false);
          }
        },
        onError: function (formType, err) {
          window.toastr.clear();
          window.toastr['error'](err, 'Error');
        },
      },
      false,
    );
    AutoForm.addHooks(
      'editNotificationsChannels',
      {
        before: {
          'method-update': function (doc) {
            if (doc.$set.teamChannel === true) {
              if (doc.$unset && doc.$unset.team === '')
                delete doc.$unset['team'];

              const application = Applications.findOne({
                name: doc.$set.application,
              });

              if (application) {
                const team = Teams.findOne({
                  _id: application.team,
                });

                if (team) doc.$set.team = team.name;
              }
            } else {
              doc.$unset = {};
              doc.$unset.team = '';
              if (doc.$set && doc.$set.team) delete doc.$set['team'];
            }

            return doc;
          },
        },
        onSuccess: function () {
          window.toastr.clear();
          window.toastr['success']('Done!', 'Updated notification channel!');
          if (Session.equals('updated', false)) {
            Session.set('updated', true);
          } else {
            Session.set('updated', false);
          }
        },
        onError: function (formType, err) {
          window.toastr.clear();
          window.toastr['error'](err.reason, 'Error');
        },
      },
      false,
    );
  },
);

Template.applicationNotificationsChannels.helpers({
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
  application() {
    return Session.get('application');
  },
  notificationsChannels() {
    return (
      Template.instance().notificationChannels &&
      Template.instance().notificationChannels.get()
    );
    // const query  = Session.get('application') ? { application: Session.get('application')} : { application: { $exists: false}}
    // const notificationChannels =  NotificationsChannels.find(query, {sort: {type: 1}}).fetch();
    //
    // if(notificationChannels.length > 0){
    //
    //     return notificationChannels;
    // }
  },
  fields() {
    return [
      {
        key: 'type',
        label: 'Channel type',
        sortOrder: 0,
        sortDirection: 'asscending',
        cellClass: 'col-md-2',
        fn: (value) => {
          return new Spacebars.SafeString(getType(value));
        },
      },
      { key: 'name', label: 'Channel name', cellClass: 'col-md-2' },
      { key: 'team', label: 'Team channel for', cellClass: 'col-md-2' },

      // {key: 'sendWhenAnyTeamMemberIsMentioned', label: 'Send notification if team member is mentioned'},
      {
        key: 'includeUserMentions',
        label: 'Send Notification when user is mentioned',
        cellClass: 'col-md-8',
        fn: (value) => {
          return new Spacebars.SafeString(getUserNames(value));
        },
      },
      {
        key: '_id',
        label: '',
        isVisible: Template.instance().userHasPermissionForApplication,

        fn: () => {
          return new Spacebars.SafeString(
            `<i id="edit-notifications-channel" class="fa fa-pencil reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Edit notifications channel"></i>`,
          );
        },
      },
      {
        key: '_id',
        label: '',
        isVisible: Template.instance().userHasPermissionForApplication,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="delete-notifications-channel" class="fa fa-trash reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete  notifications channel"></i>`,
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
      noDataTmpl: Template.noNotificationsChannels,
    };
  },
});

Template.applicationNotificationsChannels.events({
  'click .back'() {
    history.back();
  },

  'click .reactive-table tbody tr'(event) {
    const afAtts = {};
    switch (event.target.id) {
      case 'delete-notifications-channel':
        swal({
          title: 'Delete notifications channel',
          text: 'Are you sure?',
          icon: 'warning',
          buttons: ['Cancel', 'OK'],
          dangerMode: true,
        }).then((willDelete) => {
          //bound to the current `this`
          if (willDelete) {
            Meteor.call('deleteNotificationsChannel', this);

            if (Session.equals('updated', false)) {
              Session.set('updated', true);
            } else {
              Session.set('updated', false);
            }
            swal.close();
          } else {
            swal.close();
          }
        });

        break;

      case 'edit-notifications-channel':
        afAtts['id'] = 'editNotificationsChannels';
        afAtts['type'] = 'method-update';
        afAtts['meteormethod'] = 'updateNotificationsChannel';
        afAtts['schema'] = 'NotificationsChannelsSchema';
        afAtts['collection'] = 'NotificationsChannels';
        afAtts['buttonContent'] = 'Update';
        afAtts['backdrop'] = 'static';

        AutoForm.addHooks(
          afAtts['id'],
          {
            onSuccess: function () {
              // noinspection JSCheckFunctionSignatures
              Modal.hide('afModalWindow');

              if (Session.equals('updated', false)) {
                Session.set('updated', true);
              } else {
                Session.set('updated', true);
              }
            },
          },
          false,
        );

        Modal.show('afModalWindow', {
          title: 'Update notifications channel',
          dialogClass: '',
          afAtts: afAtts,
          operation: 'update',
          collection: 'NotificationsChannels',
          doc: this,
          backdrop: afAtts['backdrop'],
        });

        break;
    }
  },
});

Template.noNotificationsChannels.onCreated(
  function applicationBenchmarksOnCreated() {
    this.userHasPermissionForApplication = new ReactiveVar(false);

    Meteor.subscribe('applications');

    this.autorun(() => {
      const user = Meteor.user();
      if (
        Roles.userHasRole(user._id, 'admin') ||
        Roles.userHasRole(user._id, 'super-admin')
      ) {
        this.userHasPermissionForApplication.set(true);
      } else {
        const application = Applications.findOne({
          name: Session.get('application'),
        });

        if (application) {
          Meteor.call(
            'userHasPermissionForApplication',
            application.name,
            (err, result) => {
              if (result.error) {
                log.error(JSON.stringify(result.error));
              } else {
                this.userHasPermissionForApplication.set(result.data);
              }
            },
          );
        }
      }
    });
  },
);

Template.noNotificationsChannels.helpers({
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
});

const getUserNames = (users) => {
  let HTML = '';
  if (users && users.length > 0) {
    users.forEach((user) => {
      HTML += `<span class="break-word label label-default" style="margin:5px;">${user.name}</span>`;
    });
  } else {
    HTML = '<span></span>';
  }

  return HTML;
};
const getType = (type) => {
  switch (type) {
    case 'slack':
      return 'Slack';
    case 'teams':
      return 'Microsoft Teams';
    case 'google':
      return 'Google Chat';
  }
};
