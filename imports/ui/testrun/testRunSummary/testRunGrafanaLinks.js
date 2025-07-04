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

/* eslint-disable no-case-declarations */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { getTestRun, renderGrafanaUrl } from '/imports/helpers/utils';

import { Applications } from '/imports/collections/applications';
import { Grafanas } from '/imports/collections/grafanas';
import { GrafanaDashboards } from '/imports/collections/grafanaDashboards';
import { ApplicationDashboards } from '/imports/collections/applicationDashboards';
import { ReactiveVar } from 'meteor/reactive-var';

import './testRunGrafanaLinks.html';
import _ from 'lodash';

Template.grafanaLinks.onCreated(function () {
  const query = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
    ],
  };

  const applicationDashboardQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
    ],
  };

  Meteor.subscribe('testRuns', 'testRunGrafanaLinks', 50, query);
  Meteor.subscribe('grafanas');

  const grafanaDashboardsQuery = {
    $and: [{ usedBySUT: Session.get('application') }],
  };

  Meteor.subscribe('grafanaDashboards', grafanaDashboardsQuery);
  Meteor.subscribe('applications');
  Meteor.subscribe('applicationDashboards', applicationDashboardQuery);
  Meteor.subscribe('benchmarks', query);

  this.numberOfApplicationDashboards = new ReactiveVar();
  this.showFilter = new ReactiveVar(false);

  this.autorun(() => {
    Template.instance().showFilter.set(
      Template.instance().numberOfApplicationDashboards.get() > 5,
    );
  });
});

Template.grafanaLinks.helpers({
  testRunDashboards() {
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

        Template.instance().numberOfApplicationDashboards.set(
          environmentDashboards.length,
        );

        const testRunDashboards = [];
        let grafanaDashboard;

        _.each(environmentDashboards, (dashboard) => {
          const grafana = Grafanas.findOne({ label: dashboard.grafana });

          grafanaDashboard = GrafanaDashboards.findOne({
            $and: [
              { grafana: dashboard.grafana },
              { uid: dashboard.dashboardUid },
            ],
          });

          if (grafanaDashboard) {
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
          }
        });

        return testRunDashboards;
      }
    }
  },
  hasApplicationDashboards() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const applicationDashboardCount = ApplicationDashboards.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
        ],
      }).count();

      if (applicationDashboardCount) return applicationDashboardCount > 0;
    }
  },
  fields() {
    return [
      { key: 'grafana', label: 'Grafana instance' },
      {
        key: 'dashboardLabel',
        label: 'Dashboard label',
        sortOrder: 0,
        sortDirection: 'asscending',
      },
      //             {key: '_id', label: '',
      //                 isVisible: Template.instance().showIcons,
      //                 fn:  (value, object, key) =>  {
      //                     return new Spacebars.SafeString(`<i id="grafana-dashboard-overview" class="fa fa-eye reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="View in Grafana dashboard overview"></i>`);
      //                 }
      //             },
      // ,
      {
        key: '_id',
        label: '',
        // isVisible: Template.instance().showIcons,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="grafana-dashboard-link" class="fa fa-external-link reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Open in Grafana"></i>`,
          );
        },
      },
    ];
  },
  settings() {
    return {
      rowsPerPage: 5,
      showFilter: Template.instance().showFilter.get(),
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
    };
  },
});

Template.grafanaLinks.events({
  'click .reactive-table tbody tr'(event) {
    event.preventDefault();

    switch (event.target.id) {
      case 'grafana-dashboard-link':
        window.open(this.dashboardUrl, '_blank');
        break;

      case 'grafana-dashboard-overview':
        const params = { testRunId: FlowRouter.current().params.testRunId };
        const queryParams = {
          systemUnderTest: FlowRouter.current().queryParams.systemUnderTest,
          workload: FlowRouter.current().queryParams.workload,
          testEnvironment: FlowRouter.current().queryParams.testEnvironment,
          dashboard: this.dashboardLabel,
        };

        FlowRouter.go('testRunGrafanaDashboardsOverview', params, queryParams);
        break;
    }
  },
  'click .open-grafana-dashboards-tab'(event) {
    event.preventDefault();

    const queryParams = {};
    queryParams['systemUnderTest'] =
      FlowRouter.current().queryParams.systemUnderTest;
    queryParams['workload'] = FlowRouter.current().queryParams.workload;
    queryParams['testEnvironment'] =
      FlowRouter.current().queryParams.testEnvironment;

    FlowRouter.go('testRuns', null, queryParams);

    Meteor.setTimeout(() => {
      $('.nav-tabs a[href="#configuration"]').tab('show');

      Meteor.setTimeout(() => {
        $('.nav-tabs a[href="#application-dashboards"]').tab('show');
      }, 100);
    }, 100);
  },
});
