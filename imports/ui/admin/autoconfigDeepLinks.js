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
import { GenericDeepLinks } from '../../collections/genericDeeplinks';
import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';

import './autoconfigDeepLinks.html';

Template.autoconfigDeepLinks.onCreated(function profilesOnCreated() {
  this.isAdmin = new ReactiveVar();
  Meteor.subscribe('genericDeepLinks');

  Session.set('profileName', this.data.profileName);

  AutoForm.addHooks(
    'editGenericDeepLinks',
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

  AutoForm.addHooks(
    'addGenericDeepLinks',
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
});

Template.autoconfigDeepLinks.onRendered(function profilesOnRendered() {
  this.isAdmin.set(
    Roles.userHasRole(Meteor.userId(), 'admin') ||
      Roles.userHasRole(Meteor.userId(), 'super-admin'),
  );
});
Template.autoconfigDeepLinks.helpers({
  isAdmin() {
    return Template.instance().isAdmin.get();
  },

  deepLinks() {
    return GenericDeepLinks.find({ profile: this.profileName });
  },
  fields() {
    return [
      { key: 'name', label: 'Name', cellClass: 'col-md-2' },
      { key: 'url', label: 'Url', cellClass: 'col-md-8' },
      {
        key: '_id',
        label: '',
        isVisible: Template.instance().isAdmin,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="edit-auto-config-deep-link" class="fa fa-pencil" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Edit report panel"></i>`,
          );
        },
      },

      {
        key: '_id',
        label: '',
        isVisible: Template.instance().isAdmin,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="delete-auto-config-deep-link" class="fa fa-trash" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete report panel"></i>`,
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
      noDataTmpl: Template.noAutoConfigDeepLinks,
    };
  },
});
Template.autoconfigDeepLinks.events({
  'click .reactive-table.auto-config-report-panels tbody tr'(event) {
    const afAtts = {};
    switch (event.target.id) {
      case 'delete-auto-config-deep-link':
        swal({
          title: 'Delete link',
          text: 'Are you sure?',
          icon: 'warning',
          buttons: ['Cancel', 'OK'],
          dangerMode: true,
        }).then((willDelete) => {
          //bound to the current `this`
          if (willDelete) {
            Meteor.call('deleteGenericDeepLink', this, (err, result) => {
              if (result.error) {
                window.toastr.clear();
                window.toastr['error'](JSON.stringify(result.error), 'Error');
              } else {
                window.toastr.clear();
                window.toastr['success']('Done!', 'Deleted report panel!');
              }
            });

            swal.close();
          } else {
            swal.close();
          }
        });

        break;

      case 'edit-auto-config-deep-link':
        afAtts['type'] = 'method-update';
        afAtts['meteormethod'] = 'updateGenericDeepLink';
        afAtts['id'] = 'editGenericDeepLinks';
        afAtts['schema'] = 'GenericDeepLinksSchema';
        afAtts['collection'] = 'GenericDeepLinks';
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
          title: 'Update link',
          dialogClass: '',
          afAtts: afAtts,
          operation: 'update',
          collection: 'GenericDeepLinks',
          doc: this,
          backdrop: afAtts['backdrop'],
        });

        break;
    }
  },
});
