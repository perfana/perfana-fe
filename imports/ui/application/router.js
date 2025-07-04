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

import './applicationTestRuns/testRuns';
import '../perfanaLayout.js';
import '../perfanaLoginLayout.js';
import './applicationTestRuns/recentTestRuns.js';
import './applicationTestRuns/runningTests.js';
import './applicationTestRuns/testRunFilter';
import './applicationTestRuns/applicationDashboardSearchBox';
import './applicationGrafanaDashboards/applicationGrafanaDashboards.js';
import './applicationDynatrace/applicationDynatrace.js';
import './applicationAborAlerts/applicationAborAlertTags';
import './applicationAlerts/applicationAlerts';
import './applicationBenchmarks/applicationBenchmarks.js';
import './applicationBenchmarks/filterSeriesSearchBox';
import './applicationTrends/allMetricsTrends.js';
import './applicationDeepLinks/applicationDeepLinks';
import './applicationReport/applicationReportSpecs.js';
import './applicationReport/reportsFilter';
import './applicationReport/applicationReportRequirements';
import './applicationReport/reportsList';
import './applicationRelease/applicationReleases.js';
import './applicationRelease/applicationReleaseReports.js';
import './applicationRelease/applicationReleaseManagementSummary';
import './applicationNotificationChannels/applicationNotificationsChannels';
import './systemUnderTest/systemUnderTest';
import './systemUnderTest/dynatraceSearchBox';
import './runningTestDashboards/runningTestDashboards';

import { Session } from 'meteor/session';

FlowRouter.route('/test-runs', {
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'testRuns',
      // layout: {applications: true},
    });
  },
  title: 'Test runs',
  name: 'testRuns',
});

FlowRouter.route('/reports', {
  triggersEnter: [
    () => {
      if (Session.get('reportFilterSettings')) {
        const reportFilterSettings = Session.get('reportFilterSettings');

        if (reportFilterSettings.application)
          Session.set('application', reportFilterSettings.application);
        if (reportFilterSettings.testEnvironment)
          Session.set('testEnvironment', reportFilterSettings.testEnvironment);
        if (reportFilterSettings.testType)
          Session.set('testType', reportFilterSettings.testType);
        if (reportFilterSettings.tags)
          Session.set('tags', reportFilterSettings.tags);
      }
    },
  ],
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'applicationReportsList',
      // layout: {applications: true},
    });
  },
  title: 'Reports',
  name: 'reports',
});

FlowRouter.route('/dashboards', {
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'grafanaDashboards',
    });
  },
  parent: 'testRuns',
  title: 'Grafana dashboards',
  name: 'grafanaDashboards',
});

FlowRouter.route('/dynatrace', {
  triggersEnter: [
    () => {
      const queryParams = FlowRouter.current().queryParams;
      if (queryParams.systemUnderTest) {
        Session.set('application', queryParams.systemUnderTest);
      }
      if (queryParams.testEnvironment) {
        Session.set('testEnvironment', queryParams.testEnvironment);
      }
    },
  ],
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'dynatraceDql',
    });
  },
  parent: 'testRuns',
  title: 'Dynatrace DQL queries',
  name: 'dynatrace',
});

FlowRouter.route('/key-metrics', {
  triggersEnter: [
    () => {
      // if(queryParams.queryParams.systemUnderTest) {
      //     Session.set('application', queryParams.queryParams.systemUnderTest);
      // }
      // if(queryParams.queryParams.testEnvironment) {
      //     Session.set('testEnvironment', queryParams.queryParams.testEnvironment);
      // }
      // if(queryParams.queryParams.workload) {
      //     Session.set('testType', queryParams.queryParams.workload);
      // }
    },
  ],
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'applicationBenchmarks',
    });
  },
  parent: 'testRuns',
  title: 'Service level indicators',
  name: 'keyMetrics',
});

FlowRouter.route('/reporting-template', {
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'applicationReportSpecs',
    });
  },
  parent: 'testRuns',
  title: 'Reporting template',
  name: 'reportingTemplate',
});

FlowRouter.route('/abort-alert-tags', {
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'abortAlertTags',
    });
  },
  parent: 'testRuns',
  title: 'Abort alert tags',
  name: 'abortAlertTags',
});

FlowRouter.route('/links', {
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'deepLinks',
    });
  },
  parent: 'testRuns',
  title: 'Links',
  name: 'deepLinks',
});

FlowRouter.route('/system-under-test', {
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'systemUnderTest',
    });
  },
  parent: 'testRuns',
  title: 'System under test',
  name: 'systemUnderTest',
});

FlowRouter.route('/notifications-channels', {
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'applicationNotificationsChannels',
    });
  },
  parent: 'testRuns',
  title: 'Notifications channels',
  name: 'applicationNotificationsChannels',
});

FlowRouter.route(
  '/report/:systemUnderTest/:testEnvironment/:workload/:testRunId',
  {
    action: function () {
      BlazeLayout.render('perfanaLayout', {
        header: 'header',
        sidebar: 'sidebar',
        main: 'testRunReportPage',
      });
    },
    parent: 'reports',
    //
    // parent: function() {
    //     let route = Session.get('reportRoute') ? Session.get('reportRoute') : 'reports'
    //     return {name: route, params: {}, queryParams: {}};
    // },
    title: function () {
      return (
        this.params.testRunId +
        ' / ' +
        this.params.systemUnderTest +
        ' / ' +
        this.params.testEnvironment +
        ' / ' +
        this.params.workload
      );
    },
    name: 'report',
  },
);

FlowRouter.route('/running-test/:testRunId', {
  triggersEnter: [
    () => {
      Session.set('dashboardFilter', undefined);
    },
  ],
  triggersExit: [
    () => {
      Session.set('dashboardFilter', undefined);
    },
  ],
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      sidebar: 'sidebar',
      header: 'header',
      main: 'runningTestDashboards',
    });
  },
  parent: 'testRuns',
  title: ':testRunId',
  name: 'runningTestCarousel',
});
