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
import { ReactiveDict } from 'meteor/reactive-dict';
import { getTestRun, renderGrafanaUrl } from '/imports/helpers/utils';
import { ReactiveVar } from 'meteor/reactive-var';

import { ApplicationDashboards } from '/imports/collections/applicationDashboards';
import { Applications } from '/imports/collections/applications';
import { Grafanas } from '/imports/collections/grafanas';
import { GrafanaDashboards } from '/imports/collections/grafanaDashboards';

import './testRunGrafanaDashboardsOverview.html';
import _ from 'lodash';

Template.testRunGrafanaDashboardsOverview.onCreated(function () {
  this.state = new ReactiveDict();
  this.activeHref = new ReactiveVar();

  const query = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
    ],
  };

  Meteor.subscribe('testRuns', 'testRunGrafanaDashboardsOverview', 50, query);

  this.grafanaDashboardFilterInput = new ReactiveVar('');
});

Template.testRunGrafanaDashboardsOverview.onRendered(function () {
  const self = this;

  Meteor.setTimeout(() => {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    const environmentDashboards = ApplicationDashboards.find(
      {
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
        ],
      },
      { sort: { dashboardLabel: 1 } },
    ).fetch();

    const selectedTabIndex = environmentDashboards
      .map((dashboard) => dashboard.dashboardLabel)
      .indexOf(FlowRouter.current().queryParams.dashboard);

    const selector = `.nav-tabs a[href="#${selectedTabIndex}"]`;

    $(selector).tab('show');

    const href = self.$('.nav-tabs .active a').attr('href');
    this.activeHref.set(href);
  }, 1000);
});

Template.testRunGrafanaDashboardsOverview.helpers({
  url() {},

  testRunGrafanaDashboards() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      /* Get application */
      const application = Applications.findOne({ name: testRun.application });

      if (application) {
        /* Filter on test environment*/
        const environmentDashboards = ApplicationDashboards.find(
          {
            $and: [
              { application: testRun.application },
              { testEnvironment: testRun.testEnvironment },
            ],
          },
          { sort: { dashboardLabel: 1 } },
        ).fetch();

        const testRunDashboards = [];
        let grafanaDashboard;

        _.each(environmentDashboards, (dashboard) => {
          const grafana = Grafanas.findOne({ label: dashboard.grafana });

          grafanaDashboard = GrafanaDashboards.findOne({
            $and: [
              { grafana: dashboard.grafana },
              { name: dashboard.dashboardName },
            ],
          });

          testRunDashboards.push({
            dashboardLabel: dashboard.dashboardLabel,
            dashboardUrl: renderGrafanaUrl(
              testRun,
              dashboard,
              grafana,
              grafanaDashboard,
              true,
            ),
            grafana: grafanaDashboard.grafana,
          });
        });

        if (Template.instance().grafanaDashboardFilterInput.get() !== '') {
          // console.log('test run snapshots: ' + JSON.stringify(testRun.snapshots));
          const grafanaDashboardFilterRegExp = new RegExp(
            '.*' + Template.instance().grafanaDashboardFilterInput.get() + '.*',
            'i',
          );

          // console.log('filtered test run snapshots: ' + JSON.stringify(filteredSnaphots));

          return testRunDashboards.filter((grafanaDashboard) => {
            return grafanaDashboardFilterRegExp.test(
              grafanaDashboard.dashboardLabel,
            );
          });
        } else {
          return testRunDashboards;
        }
      }
    }
  },
  tabActive(index) {
    return Template.instance().activeHref.get() === `#${index}`;
  },
});

Template.testRunGrafanaDashboardsOverview.events({
  'click .nav-tabs  a'(event) {
    event.preventDefault();
    $(this).tab('show');
    Template.instance().activeHref.set(
      event.currentTarget.getAttribute('href'),
    );
  },
});

Template.testRunGrafanaDashboardsOverview.events({
  'keyup #grafana-dashboard-filter': function (event, template) {
    template.grafanaDashboardFilterInput.set(
      $('#grafana-dashboard-filter').val(),
    );
  },
  'click #clear-grafana-dashboard-filter': function (event, template) {
    $('#grafana-dashboard-filter').val('');
    template.grafanaDashboardFilterInput.set('');
  },
});
