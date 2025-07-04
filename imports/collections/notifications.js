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
export const Notifications = new Mongo.Collection('notifications');

const NotificationsSchema = new SimpleSchema({
  application: {
    type: String,
    index: 1,
    label: 'System under test',
    autoform: {
      defaultValue: function () {
        return Session.get('application') ? Session.get('application') : '';
      },
      readOnly: function () {
        return Session.get('application') !== null;
      },
    },
  },
  testType: {
    label: 'Workload',
    index: 1,
    type: String,
    autoform: {
      defaultValue: function () {
        return Session.get('testType') ? Session.get('testType') : '';
      },
      readOnly: function () {
        return Session.get('testType') !== null;
      },
    },
  },
  testEnvironment: {
    type: String,
    index: 1,
    autoform: {
      defaultValue: function () {
        return Session.get('testEnvironment')
          ? Session.get('testEnvironment')
          : '';
      },
      readOnly: function () {
        return Session.get('testEnvironment') !== null;
      },
    },
  },
  testRunId: {
    type: String,
    index: 1,
  },
  message: {
    type: String,
  },
  createdAt: {
    type: Date,
  },
  createdBy: {
    type: String,
    index: 1,
    optional: true,
  },

  viewedBy: {
    type: [String],
    optional: true,
  },
});

Notifications.attachSchema(NotificationsSchema);

if (Meteor.isClient) {
  // Meteor.subscribe('reportPanels');
  window.Notifications = Notifications;
  window.NotificationsSchema = NotificationsSchema;
}
