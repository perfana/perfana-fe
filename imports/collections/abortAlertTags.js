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

/* eslint-disable meteor/no-session */
export const AbortAlertTags = new Mongo.Collection('abortAlertTags');

const AbortAlertTagsSchema = new SimpleSchema({
  application: {
    type: String,
    label: 'System under test',
    autoform: {
      defaultValue: function () {
        return Session.get('application') ? Session.get('application') : '';
      },
      readOnly: function () {
        return Session.get('application') !== undefined;
      },
      type: 'hidden',
    },
  },
  testType: {
    type: String,
    label: 'Workload',
    autoform: {
      defaultValue: function () {
        return Session.get('testType') ? Session.get('testType') : '';
      },
      readOnly: function () {
        return Session.get('testType') !== undefined;
      },
      type: 'hidden',
    },
  },
  testEnvironment: {
    type: String,
    autoform: {
      defaultValue: function () {
        return Session.get('testEnvironment')
          ? Session.get('testEnvironment')
          : '';
      },
      readOnly: function () {
        return Session.get('testEnvironment') !== undefined;
      },
      type: 'hidden',
    },
  },
  alertSource: {
    type: String,
    autoform: {
      options: [
        { label: 'Kapacitor', value: 'kapacitor' },
        { label: 'Alertmanager', value: 'alertmanager' },
        { label: 'Grafana', value: 'grafana' },
      ],
    },
  },
  tag: {
    type: Object,
    autoform: {
      type: function () {
        if (AutoForm.getFieldValue('alertSource') !== undefined) {
          return '';
        } else {
          return 'hidden';
        }
      },
    },
  },
  'tag.key': {
    type: String,
    autoform: {
      type: function () {
        if (AutoForm.getFieldValue('alertSource') !== undefined) {
          return '';
        } else {
          return 'hidden';
        }
      },
    },
  },
  'tag.value': {
    type: String,
    optional: true,
    autoform: {
      type: function () {
        if (AutoForm.getFieldValue('alertSource') !== undefined) {
          return '';
        } else {
          return 'hidden';
        }
      },
    },
  },
});

AbortAlertTags.attachSchema(AbortAlertTagsSchema);

if (Meteor.isClient) {
  window.AbortAlertTags = AbortAlertTags;
  window.AbortAlertTagsSchema = AbortAlertTagsSchema;
}
