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

// noinspection RegExpDuplicateCharacterInClass

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import './apiKeys.html';
import { formatDate } from '../../helpers/utils';

Template.apiKeys.onCreated(function apiKeysOnCreated() {
  this.apiKeys = new ReactiveVar();
  this.isAdmin = new ReactiveVar();

  this.autorun(() => {
    Session.get('apiKeysUpdateToggle');

    Meteor.call('getApiKeys', (err, apiKeys) => {
      if (apiKeys.error) {
        console.log(JSON.stringify(apiKeys.error));
      } else {
        this.apiKeys.set(apiKeys.data);
      }
    });
  });
});

Template.apiKeys.onRendered(function apiKeysOnRendered() {
  this.isAdmin.set(
    Roles.userHasRole(Meteor.userId(), 'admin') ||
      Roles.userHasRole(Meteor.userId(), 'super-admin'),
  );
});
Template.apiKeys.helpers({
  isAdmin() {
    return Template.instance().isAdmin.get();
  },

  apiKeys() {
    const apiKeys = Template.instance().apiKeys.get();
    return apiKeys || [];
  },
  fields() {
    return [
      { key: 'description', label: '', cellClass: 'col-md-2' },
      {
        key: 'validUntil',
        label: 'Valid until',
        cellClass: 'col-md-9',
        fn: (value) => {
          return formatDate(value);
        },
      },
      {
        key: '_id',
        label: '',
        isVisible: Template.instance().isAdmin.get(),
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="delete-api-key" class="fa fa-trash" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete API key"></i>`,
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
      noDataTmpl: Template.noApiKeys,
    };
  },
});
Template.apiKeys.events({
  'click .reactive-table.api-keys tbody tr'(event) {
    switch (event.target.id) {
      case 'delete-api-key':
        // noinspection JSCheckFunctionSignatures
        swal({
          title: 'Delete Api Key',
          text: 'Are you sure?',
          icon: 'warning',
          buttons: ['Cancel', 'OK'],
          dangerMode: true,
        }).then((willDelete) => {
          //bound to the current `this`
          if (willDelete) {
            Meteor.call('deleteApiKey', this.description);
            if (Session.equals('apiKeysUpdateToggle', true)) {
              Session.set('apiKeysUpdateToggle', false);
            } else {
              Session.set('apiKeysUpdateToggle', true);
            }
            swal.close();
          } else {
            swal.close();
          }
        });

        break;

      default:
    }
  },
  'click button#add-api-key'(event, template) {
    Modal.show('addApiKey', { apiKeys: template.apiKeys.get() });
  },
});

Template.addApiKey.onCreated(function apiKeysOnCreated() {
  this.apiKeyCreated = new ReactiveVar(false);
  this.apiKey = new ReactiveVar('');
});

Template.addApiKey.events({
  'click button#modal-add-api-key'(event, template) {
    event.preventDefault();

    const ttl = $('#api-key-ttl').val();
    const apiKeyDescription = $('#api-key-description').val();

    if (
      this.apiKeys.findIndex(
        (apiKey) => apiKey.description === apiKeyDescription,
      ) !== -1
    ) {
      toastr.clear();
      window.toastr['error'](
        'Description already exist for other API key!',
        'Error',
      );
      return;
    }
    const characterPattern = new RegExp('#', '');

    if (characterPattern.test(apiKeyDescription)) {
      toastr.clear();
      window.toastr['error']('# character not allowed in description', 'Error');
      return;
    }

    const ttlPattern = new RegExp('[0-9]+[{d,w,M,y}]', '');

    if (!ttlPattern.test(ttl)) {
      toastr.clear();
      window.toastr['error'](
        'Time to live has incorrect format, supported units are: d,w,M,y',
        'Error',
      );
      return;
    }

    Meteor.call('insertApiKey', apiKeyDescription, ttl, (err, result) => {
      if (result.error) {
        toastr.clear();
        window.toastr['error'](JSON.stringify(result.error), 'Error');
      } else {
        template.apiKeyCreated.set(true);
        template.apiKey.set(result.data);
        if (Session.equals('apiKeysUpdateToggle', true)) {
          Session.set('apiKeysUpdateToggle', false);
        } else {
          Session.set('apiKeysUpdateToggle', true);
        }
      }
    });
  },
});

Template.addApiKey.helpers({
  apiKeyCreated() {
    return Template.instance().apiKeyCreated.get();
  },
  apiKey() {
    return Template.instance().apiKey.get();
  },
  perfanaUrl() {
    return Meteor.settings.perfanaUrl ?
        Meteor.settings.perfanaUrl
      : 'http://localhost:4000' + '/api';
  },
});
