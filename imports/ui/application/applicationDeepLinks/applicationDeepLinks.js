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
import { DeepLinks } from '../../../collections/deeplinks';
import { ReactiveVar } from 'meteor/reactive-var';
import { log } from '/both/logger';

import './applicationDeepLinks.html';
import { Applications } from '../../../collections/applications';

Template.deepLinks.onCreated(function deepLinksOnCreated() {
  Meteor.subscribe('deepLinks');

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
          if (result.error) {
            log.error(JSON.stringify(result.error));
          } else {
            this.userHasPermissionForApplication.set(result.data);
          }
        },
      );
    }
  });

  AutoForm.addHooks(
    'addDeepLinks',
    {
      onSuccess: function () {
        window.toastr.clear();
        window.toastr['success']('Done!', 'Added link!');
      },
      onError: function (formType, err) {
        window.toastr.clear();
        window.toastr['error'](err, 'Error');
      },
    },
    false,
  );
  AutoForm.addHooks(
    'editDeepLinks',
    {
      onSuccess: function () {
        window.toastr.clear();
        window.toastr['success']('Done!', 'Updated link!');
      },
      onError: function (formType, err) {
        window.toastr.clear();
        window.toastr['error'](err, 'Error');
      },
    },
    false,
  );
});

Template.deepLinks.helpers({
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
  deepLinks() {
    const deepLinks = DeepLinks.find({
      $and: [
        { application: Session.get('application') },
        { testEnvironment: Session.get('testEnvironment') },
        { testType: Session.get('testType') },
      ],
    }).fetch();

    if (deepLinks.length > 0) {
      return deepLinks;
    }
  },
  fields() {
    return [
      { key: 'name', label: 'Name', cellClass: 'col-md-2' },
      { key: 'url', label: 'Url', cellClass: 'col-md-7' },
      {
        key: '_id',
        label: '',
        cellClass: 'col-md-1',
        isVisible: Template.instance().userHasPermissionForApplication,

        fn: () => {
          return new Spacebars.SafeString(
            `<i id="edit-deep-link" class="fa fa-pencil reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Edit link"></i>`,
          );
        },
      },
      {
        key: '_id',
        label: '',
        cellClass: 'col-md-1',
        isVisible: Template.instance().userHasPermissionForApplication,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="delete-deep-link" class="fa fa-trash reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete link"></i>`,
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
      noDataTmpl: Template.noDeepLinks,
    };
  },
});

Template.deepLinks.events({
  'click .back'() {
    history.back();
  },

  'click div #add-annotations'(event, template) {
    event.preventDefault();
    const params = {
      application: FlowRouter.current().queryParams.systemUnderTest,
      testEnvironment: FlowRouter.current().queryParams.testEnvironment,
      testType: FlowRouter.current().queryParams.workload,
    };

    if (template.userHasPermissionForApplication.get() === true) {
      Modal.show('deepLinkModal', params);
    }
  },

  'click .reactive-table tbody tr'(event, template) {
    switch (event.target.id) {
      case 'delete-deep-link':
        swal({
          title: 'Delete link',
          text: 'Are you sure?',
          icon: 'warning',
          buttons: ['Cancel', 'OK'],
          dangerMode: true,
        }).then((willDelete) => {
          //bound to the current `this`
          if (willDelete) {
            Meteor.call('deleteDeepLink', this);
            swal.close();
          } else {
            swal.close();
          }
        });

        break;

      case 'edit-deep-link':
        if (template.userHasPermissionForApplication.get() === true) {
          Modal.show('deepLinkModal', this);
        }
        break;
    }
  },
});

Template.noDeepLinks.onCreated(function applicationBenchmarksOnCreated() {
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

Template.noDeepLinks.helpers({
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
});

Template.deepLinkModal.onRendered(function deepLinkModaloOnRendered() {
  Meteor.call(
    'getTestRunVariables',
    Session.get('application'),
    Session.get('testEnvironment'),
    Session.get('testType'),
    (err, variables) => {
      $('.deep-link').mentionVariable({
        delimiter: '{',
        users: variables.data.map((variable) => {
          return { name: variable };
        }),
      });
    },
  );
});

Template.deepLinkModal.helpers({
  url() {
    return this.url;
  },
  name() {
    return this.name;
  },
});

Template.deepLinkModal.events({
  'click button#save-testrun-annotations'(event) {
    event.preventDefault();
    const deeplink = this;
    if (!$('.deep-link-name').val()) {
      toastr.clear();
      toastr['error']('Name is required!', 'Error');
    } else {
      deeplink.name = $('.deep-link-name').val();
    }
    if (!$('.deep-link').val()) {
      toastr.clear();
      toastr['error']('url is required!', 'Error');
    } else {
      deeplink.url = $('.deep-link').val();
    }

    if (deeplink._id) {
      Meteor.call('updateDeepLink', deeplink, deeplink._id, () => {
        // noinspection JSCheckFunctionSignatures
        Modal.hide('deepLinkModal');
      });
    } else {
      Meteor.call('insertDeepLink', deeplink, () => {
        // noinspection JSCheckFunctionSignatures
        Modal.hide('deepLinkModal');
      });
    }
  },
});
