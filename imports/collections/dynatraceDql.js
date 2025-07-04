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

export const DynatraceDql = new Mongo.Collection('dynatraceDql');

const DynatraceDqlSchema = new SimpleSchema({
  application: {
    type: String,
    index: 1,
    label: 'System under test',
    autoform: {
      // type: "universe-select",
      // create: true,
      // createOnBlur: true,
      // options: [],
      // optionsMethod: "getApplications",
      defaultValue: () => {
        return Session.get('application') ? Session.get('application') : '';
      },
      readOnly: () => {
        return Session.get('application') !== null;
      },
      type: 'hidden',
    },
  },
  testEnvironment: {
    type: String,
    index: 1,
    autoform: {
      defaultValue: () => {
        return Session.get('testEnvironment') ?
            Session.get('testEnvironment')
          : '';
      },
      readOnly: () => {
        return Session.get('testEnvironment') !== null;
      },
      type: 'hidden',
    },
  },
  dashboardLabel: {
    type: String,
    label: 'Dashboard Label',
    autoform: {
      type: 'hidden',
    },
  },
  dashboardUid: {
    type: String,
    label: 'Dashboard UID',
    autoform: {
      type: 'hidden',
    },
  },
  panelTitle: {
    type: String,
    label: 'Title',
  },
  dqlQuery: {
    type: String,
    label: 'DQL Query',
  },
  matchMetricPattern: {
    type: String,
    label: 'Match Metric Pattern',
    optional: true,
  },
  omitGroupByVariableFromMetricName: {
    type: [String],
    label: 'Omit Group By Variables',
    optional: true,
  },
});

DynatraceDql.attachSchema(DynatraceDqlSchema);

if (Meteor.isClient) {
  window.DynatraceDql = DynatraceDql;
  window.DynatraceDqlSchema = DynatraceDqlSchema;

  // AutoForm hooks for insert form
  AutoForm.addHooks(
    'addDynatraceDql',
    {
      before: {
        method: function (doc) {
          doc.dashboardUid = 'Dynatrace';
          doc.dashboardLabel = 'Dynatrace';
          return doc;
        },
      },
      onSuccess: function () {
        window.toastr.clear();
        window.toastr['success']('Done!', 'Added DQL query!');
      },
      onError: function (formType, err) {
        window.toastr.clear();
        window.toastr['error'](err, 'Error');
      },
    },
    false,
  );

  // AutoForm hooks for update form
  AutoForm.addHooks(
    'editDynatraceDql',
    {
      before: {
        'method-update': function (modifier) {
          // Set dashboardUid to the same value as dashboardLabel if it's being updated
          if (modifier.$set) {
            modifier.$set.dashboardUid = 'Dynatrace';
            modifier.$set.dashboardLabel = 'Dynatrace';
          }
          return modifier;
        },
      },
      onSuccess: function () {
        window.toastr.clear();
        window.toastr['success']('Done!', 'Updated DQL query!');
      },
      onError: function (formType, err) {
        window.toastr.clear();
        window.toastr['error'](err, 'Error');
      },
    },
    false,
  );
}
