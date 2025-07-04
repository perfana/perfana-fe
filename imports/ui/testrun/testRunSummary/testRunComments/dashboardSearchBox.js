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

import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { getTestRun } from '/imports/helpers/utils';
import { ApplicationDashboards } from '/imports/collections/applicationDashboards';

import './dashboardSearchBox.html';

Template.dashboardSearchBox.onRendered(function () {
  // Enable select2
  $('.select2-dropdown#dashboard')
    .select2({
      placeholder: 'Select dashboard',
      allowClear: true,
    })
    .on('change', function () {
      const dashboardData = $('.select2-dropdown#dashboard').select2('data');
      Session.set('dashboardUid', dashboardData[0].id);
      Session.set('dashboardLabel', dashboardData[0].text);
      const testRun = getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        FlowRouter.current().params.testRunId,
      );
      const applicationDashboard = ApplicationDashboards.findOne({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { dashboardUid: dashboardData[0].id },
          { dashboardLabel: dashboardData[0].text },
        ],
      });

      if (applicationDashboard)
        Session.set('grafana', applicationDashboard.grafana);
    });
});

Template.dashboardSearchBox.onCreated(function () {
  const query = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
    ],
  };

  Meteor.subscribe('applicationDashboards', query, 'dashboardSearchBox');
});

Template.dashboardSearchBox.helpers({
  dashboards() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    if (testRun) {
      const applicationDashboards = ApplicationDashboards.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
        ],
      });

      if (applicationDashboards) return applicationDashboards;
    }
  },
});

Template.dashboardSearchBox.events({});
