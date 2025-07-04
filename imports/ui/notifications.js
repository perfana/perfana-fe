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
import { Applications } from '../collections/applications';
import { Notifications } from '../collections/notifications';
import { formatDate } from '../helpers/utils';

import './notifications.html';

Template.notifications.onCreated(function homeOnCreated() {
  this.query = new ReactiveVar({});

  this.autorun(function () {
    const user = Meteor.user();
    let applications;

    if (user) {
      if (
        Roles.userHasRole(user._id, 'admin') ||
        Roles.userHasRole(user._id, 'super-admin')
      ) {
        applications = Applications.find({}).fetch();
      } else if (user.profile.memberOf) {
        applications = Applications.find({
          team: { $in: user.profile.memberOf.teams },
        }).fetch();
      } else {
        applications = Applications.find({}).fetch();
      }

      const applicationNames = applications.map((application) => {
        return application.name;
      });

      const now = Date.now();
      const currentHour = now - (now % (1000 * 3600));
      const dateBeforeTwoWeeks = new Date(currentHour - 1000 * 3600 * 24 * 14);

      const query = {
        $and: [
          {
            application: {
              $in: applicationNames,
            },
          },
          {
            createdAt: {
              $gte: dateBeforeTwoWeeks, // ms 14 days
            },
          },
          {
            viewedBy: { $ne: user._id },
          },
          {
            createdBy: { $ne: user._id },
          },
        ],
      };

      this.subscribe(['notifications', query, 'notifications']);

      Template.instance().query.set(query);
    }
  });
});

Template.notifications.helpers({
  hasNotifications() {
    return (
      Notifications.find(Template.instance().query.get()).fetch().length > 0
    );
  },
  notifications() {
    return Notifications.find(Template.instance().query.get(), {
      sort: { createdAt: -1 },
    });
  },
  fields() {
    return [
      {
        key: 'createdAt',
        label: 'Date',
        fn: (value) => {
          return formatDate(value);
        },
      },
      { key: 'application', label: 'System under test' },
      // { key: 'testEnvironment', label: 'Test environment'},
      // { key: 'testType', label: 'Workload'},
      { key: 'testRunId', label: 'Test run ID' },
      { key: 'message', label: 'Message' },
      {
        key: 'createdAt',
        hidden: true,
        sortOrder: 0,
        sortDirection: 'descending',
      }, //hidden column to sort unformatted date
    ];
  },
  settings() {
    return {
      rowsPerPage: 10,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      // collection: 'reactiveTableTestRuns',
      noDataTmpl: Template.noNotifications,
    };
  },
});

Template.notifications.events({
  'click .clear-all-notifications'(event, template) {
    /* Update viewedBy property */

    const user = Meteor.user();

    const notifications = Notifications.find(template.query.get());

    if (user && notifications) {
      notifications.forEach((notification) => {
        Meteor.call('notificationUpdateViewedBy', notification, user);
      });
    }
  },
  'click .reactive-table tbody tr'(event) {
    /* Update viewedBy property */

    const user = Meteor.user();

    if (user) {
      Meteor.call('notificationUpdateViewedBy', this, user);
    }

    const notification = this;

    if (!event.target.className.includes('disabled')) {
      const params = { testRunId: notification.testRunId };
      const queryParams = {
        systemUnderTest: notification.application,
        workload: notification.testType,
        testEnvironment: notification.testEnvironment,
      };

      if (notification.message.indexOf('comment') !== -1) {
        queryParams['tab'] = 'comments';
      }

      FlowRouter.go('testRunSummary', params, queryParams);
    }
  },
});
