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
import { AbortAlertTags } from '../../../collections/abortAlertTags';
import { ReactiveVar } from 'meteor/reactive-var';
import { log } from '/both/logger';

import './applicationAborAlertTags.html';
import { Applications } from '../../../collections/applications';

Template.abortAlertTags.onCreated(function abortAlertTagsOnCreated() {
  Meteor.subscribe('abortAlertTags');

  Meteor.subscribe('applications');

  this.userHasPermissionForApplication = new ReactiveVar(false);

  this.autorun(() => {
    const application = Applications.findOne({
      name: Session.get('application'),
    });

    if (application) {
      Meteor.call(
        'userHasPermissionForApplication',
        application.name,
        (err, result) => {
          if (err) {
            log.error(JSON.stringify(err));
          } else {
            if (result.error) {
              log.error(JSON.stringify(result.error));
            } else {
              this.userHasPermissionForApplication.set(result.data);
            }
          }
        },
      );
    }
  });

  AutoForm.addHooks(
    'addAbortAlertTags',
    {
      onSuccess: function () {
        window.toastr.clear();
        window.toastr['success']('Done!', 'Added abort alert tag!');
      },
      onError: function (formType, err) {
        window.toastr.clear();
        window.toastr['error'](err, 'Error');
      },
    },
    false,
  );
  AutoForm.addHooks(
    'editAbortAlertTags',
    {
      onSuccess: function () {
        window.toastr.clear();
        window.toastr['success']('Done!', 'Updated abort alert tag!');
      },
      onError: function (formType, err) {
        window.toastr.clear();
        window.toastr['error'](err, 'Error');
      },
    },
    false,
  );
});

Template.abortAlertTags.helpers({
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
  application() {
    return Session.get('application');
  },
  testEnvironment() {
    return Session.get('testEnvironment');
  },
  testType() {
    return Session.get('testType');
  },
  abortAlertTags() {
    const abortAlertTags = AbortAlertTags.find(
      {
        $and: [
          { application: Session.get('application') },
          { testEnvironment: Session.get('testEnvironment') },
          { testType: Session.get('testType') },
        ],
      },
      { sort: { alertSource: 1 } },
    ).fetch();

    return abortAlertTags || [];
  },
  fields() {
    return [
      {
        key: 'alertSource',
        label: 'Alert source',
        sortOrder: 0,
        sortDirection: 'asscending',
      },
      { key: 'tag.key', label: 'Tag key' },
      { key: 'tag.value', label: 'Tag value' },
      {
        key: '_id',
        label: '',
        isVisible: Template.instance().userHasPermissionForApplication,

        fn: () => {
          return new Spacebars.SafeString(
            `<i id="edit-abort-alert-tag" class="fa fa-pencil reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Edit tag"></i>`,
          );
        },
      },
      {
        key: '_id',
        label: '',
        isVisible: Template.instance().userHasPermissionForApplication,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="delete-abort-alert-tag" class="fa fa-trash reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete tag"></i>`,
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
      noDataTmpl: Template.noAbortAlertTags,
    };
  },
});
Template.abortAlertTags.events({
  'click .back'() {
    history.back();
  },

  'click .reactive-table tbody tr'() {
    const afAtts = {};
    switch (event.target.id) {
      case 'delete-abort-alert-tag':
        swal({
          title: 'Delete tag',
          text: 'Are you sure?',
          icon: 'warning',
          buttons: ['Cancel', 'OK'],
          dangerMode: true,
        }).then((willDelete) => {
          //bound to the current `this`
          if (willDelete) {
            Meteor.call('deleteAbortAlertTag', this);
            swal.close();
          } else {
            swal.close();
          }
        });

        break;

      case 'edit-abort-alert-tag':
        afAtts['type'] = 'method-update';
        afAtts['meteormethod'] = 'updateAbortAlertTag';
        afAtts['id'] = 'editAbortAlertTags';
        afAtts['schema'] = 'AbortAlertTagsSchema';
        afAtts['collection'] = 'AbortAlertTags';
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
          title: 'Update tag',
          dialogClass: '',
          afAtts: afAtts,
          operation: 'update',
          collection: 'AbortAlertTags',
          doc: this,
          backdrop: afAtts['backdrop'],
        });

        break;
    }
  },
});

Template.noAbortAlertTags.onCreated(function applicationBenchmarksOnCreated() {
  this.userHasPermissionForApplication = new ReactiveVar(false);

  Meteor.subscribe('applications');

  this.autorun(() => {
    const application = Applications.findOne({
      name: Session.get('application'),
    });

    if (application) {
      Meteor.call(
        'userHasPermissionForApplication',
        application.name,
        (err, result) => {
          if (err) {
            log.error(JSON.stringify(err));
          } else {
            if (result.error) {
              log.error(JSON.stringify(result.error));
            } else {
              this.userHasPermissionForApplication.set(result.data);
            }
          }
        },
      );
    }
  });
});

Template.noAbortAlertTags.helpers({
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
});
