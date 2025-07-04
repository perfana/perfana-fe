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
import { Configuration } from '../../collections/configuration';
import { OmitAlertTags } from '../../collections/omitAlertTags';

import './settings.html';
import { durationInDays } from '../../helpers/utils';

Template.settings.onCreated(function settingsOnCreated() {
  this.isAdmin = new ReactiveVar();
  Meteor.subscribe('configuration');
  Meteor.subscribe('omitAlertTags');
});

Template.settings.onRendered(function settingsOnRendered() {
  this.isAdmin.set(
    Roles.userHasRole(Meteor.userId(), 'admin') ||
      Roles.userHasRole(Meteor.userId(), 'super-admin'),
  );
});

Template.settings.helpers({
  isAdmin() {
    return Template.instance().isAdmin.get();
  },
  hasOmitAlertTags() {
    return OmitAlertTags.find().fetch().length > 0;
  },
  hasCustomAlerts() {
    return (
      Configuration.find({
        type: 'alert',
      }).fetch().length > 0
    );
  },
  customAlertTags() {
    return Configuration.find({
      type: 'alert',
    });
  },

  omitAlertTags() {
    return OmitAlertTags.find();
  },
  perfanaSettings() {
    return Configuration.find({
      type: 'perfana',
    });
  },
  miscSettings() {
    return Configuration.find({
      type: { $nin: ['datasource', 'grafana', 'perfana', 'alert'] },
    });
  },

  datasourceRetention() {
    return Configuration.find({
      type: 'datasource',
    });
  },
  perfanaSettingsFields() {
    return [
      { key: 'key', label: 'Setting', sortable: false, cellClass: 'col-md-2' },
      { key: 'value', label: 'Value', sortable: false },
    ];
  },
  miscSettingsFields() {
    return [
      { key: 'key', label: 'Setting', sortable: false, cellClass: 'col-md-2' },
      { key: 'value', label: 'Value', sortable: false },
    ];
  },
  datasourceRetentionFields() {
    return [
      {
        key: 'key',
        label: 'Datasource',
        sortable: false,
        fn: (value, _object, _key) => {
          return value.replace('Retention', '');
        },
        cellClass: 'col-md-2',
      },
      {
        key: 'value',
        label: 'Retention',
        sortable: false,
        fn: (value, _object, _key) => {
          return durationInDays(value);
        },
      },
    ];
  },
  customAlertTagsFields() {
    return [
      { key: 'key', label: 'Tag', sortable: false, cellClass: 'col-md-2' },
      { key: 'value', label: 'Value', sortable: false },
    ];
  },
  omitAlertTagsFields() {
    return [
      {
        key: 'alertSource',
        label: 'Source',
        sortOrder: 0,
        sortDirection: 'ascending',
        cellClass: 'col-md-2',
      },
      { key: 'tag', label: 'Tag', sortable: false },
    ];
  },
  settings() {
    return {
      rowsPerPage: 50,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
    };
  },
  heapDumpEnabled() {
    return Meteor.settings.public.createHeapDumpEnabled ?
        Meteor.settings.public.createHeapDumpEnabled === true
      : false;
  },
});

Template.settings.events({
  'click div .create-heapdump'(_event, _template) {
    Meteor.call('createHeapDump', (error, response) => {
      if (error) {
        toastr.clear();
        window.toastr['error'](JSON.stringify(response.error), 'Error');
      } else {
        if (response) {
          toastr.clear();
          window.toastr['success'](response.data.message, 'Done!');
        }
      }
    });
  },
});
