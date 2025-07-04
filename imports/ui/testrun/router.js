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

import './testRunSummary/testRunGrafanaDashboardsOverview.js';
import './testRunSummary/testRunSummary.js';
import './testRunSummary/testRunStatus.js';
import './testRunReport/testRunReport.js';
import './testRunReport/compareResultsSearchBox.js';
import './testRunSummary/testRunKeyMetrics.js';
import './testRunReport/testRunReportInformation.js';
import './testRunReport/testRunReportPanelAnnotation';
import './testRunReport/testRunReportPanel';
import './testRunReport/testRunReportRequirements';
import './testRunReport/testRunReportPanelRequirements';
import './testRunReport/testRunManagementSummary.js';
import './testRunSummary/testRunGrafanaLinks.js';
import './testRunSummary/testRunGrafanaSnapshots.js';
import './testRunSummary/testRunAlerts.js';
import './testRunSummary/testRunEvents.js';
import './testRunSummary/testRunManage.js';
import './testRunSummary/testRunBenchmarks.js';
import './testRunSummary/testRunVariables.js';
import './testRunSummary/testRunLinks.js';
import './testRunSummary/testRunMetadata/index';
import './testRunSummary/testRunComments/index';
import './testRunSummary/testRunComparison/index';
import './testRunSummary/testRunConfig/index';
import './testRunSummary/testRunTraces/testRunTraces';
import './testRunSummary/testRunPyroscope/testRunPyroscope';
import './testRunSummary/testRunPyroscope/selectPyroscoopBaseline';
import './testRunSummary/testRunDynatrace/testRunDynatrace';
import './testRunSummary/testRunDynatrace/selectDynatraceBaseline';
import './testRunSummary/testRunDynatrace/selectRequests';
import './testRunSummary/testRunDynatrace/selectDynatraceEntity';
import './testRunSummary/testRunTraces/testRunTraceRequirementSearchBox';
import './testRunSummary/testRunCheckResults/testRunCheckResults';
import './testRunSummary/testRunCompareResultsPreviousTestRun/testRunCompareResultsPreviousTestRun';
import './testRunSummary/testRunCompareResultsBaselineTestRun/testRunCompareResultsBaselineTestRun';
import './testRunSummary/testRunDataScienceCompareResults/testRunDataScienceCompareResults';
import './testRunDashboards/index';

import { Session } from 'meteor/session';

FlowRouter.route('/test-run/:testRunId', {
  triggersExit: [
    () => {
      Session.set('period', undefined);
      Session.set('dashboardLabel', undefined);
      Session.set('dashboardUid', undefined);
      Session.set('panelTitle', undefined);
      Session.set('selectedCommentId', undefined);
      Session.set('tags', undefined);
      Session.set('graphsPerRow', undefined);

      Meteor.setTimeout(() => {
        // unless query param tab is "unresolved-regression" set tab to null
        if (
          FlowRouter.getQueryParam('tab') !== 'unresolved-regression' &&
          FlowRouter.getQueryParam('tab') !== 'trends'
        ) {
          FlowRouter.setQueryParams({ tab: null });
        }
      }, 100);
    },
  ],
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'testRunSummaryTabs',
    });
  },
  parent: 'testRuns',
  title: 'Test run details',
  name: 'testRunSummary',
});

FlowRouter.route('/test-run-not-found', {
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'testRunError',
      // data: {
      //     compareResultLabel: queryParams.label
      // }
    });
  },
  parent: 'testRuns',
  title: 'Not found',
  name: 'testRunError',
});

FlowRouter.route('/test-run-comparison/:testRunId', {
  triggersEnter: [
    (queryParams) => {
      if (queryParams.queryParams.label)
        Session.set('compareResultLabel', queryParams.queryParams.label);
    },
  ],
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'compareResultDetails',
      // data: {
      //     compareResultLabel: queryParams.label
      // }
    });
  },
  parent: 'testRun',
  title: ':testRunId',
  name: 'testRunComparison',
});

FlowRouter.route('/testrun/:testRunId/report', {
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'testRunReportPage',
    });
  },
  parent: 'testRunSummary',
  title: 'Report',
  name: 'testRunReport',
});

FlowRouter.route('/testrun/:testRunId/benchmarks/:benchmarkType', {
  // triggersEnter: [ queryParams => {
  //     if(queryParams.queryParams.systemUnderTest)
  //         Session.set('application', queryParams.queryParams.systemUnderTest);
  //     else
  //         Session.set('application', null);
  //     if(queryParams.queryParams.workload)
  //         Session.set('testType', queryParams.queryParams.workload);
  //     else
  //         Session.set('testType', null);
  //     if(queryParams.queryParams.testEnvironment)
  //         Session.set('testEnvironment', queryParams.queryParams.testEnvironment);
  //     else
  //         Session.set('testEnvironment', null);
  // }],
  triggersExit: [
    () => {
      Meteor.setTimeout(() => {
        FlowRouter.setQueryParams({ baseline: null });
      }, 100);
    },
  ],
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'testRunBenchmarkDetails',
    });
  },
  parent: 'testRunSummary',
  title: ':benchmarkType',
  name: 'testRunBenchmarkDetails',
});

FlowRouter.route('/testrun/:testRunId/report/benchmarks/:benchmarkType', {
  // triggersEnter: [ queryParams => {
  //     if(queryParams.queryParams.systemUnderTest)
  //         Session.set('application', queryParams.queryParams.systemUnderTest);
  //     else
  //         Session.set('application', null);
  //     if(queryParams.queryParams.workload)
  //         Session.set('testType', queryParams.queryParams.workload);
  //     else
  //         Session.set('testType', null);
  //     if(queryParams.queryParams.testEnvironment)
  //         Session.set('testEnvironment', queryParams.queryParams.testEnvironment);
  //     else
  //         Session.set('testEnvironment', null);
  // }],
  triggersExit: [
    () => {
      Meteor.setTimeout(() => {
        FlowRouter.setQueryParams({ baseline: null });
      }, 100);
    },
  ],
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'testRunBenchmarkDetails',
    });
  },
  parent: 'testRunReport',
  title: ':benchmarkType',
  name: 'testRunReportBenchmarkDetails',
});

FlowRouter.route('/testrun/:testRunId/full-test-run-comparison', {
  // triggersEnter: [ queryParams => {
  //     if(queryParams.queryParams.systemUnderTest)
  //         Session.set('application', queryParams.queryParams.systemUnderTest);
  //     else
  //         Session.set('application', null);
  //     if(queryParams.queryParams.workload)
  //         Session.set('testType', queryParams.queryParams.workload);
  //     else
  //         Session.set('testType', null);
  //     if(queryParams.queryParams.testEnvironment)
  //         Session.set('testEnvironment', queryParams.queryParams.testEnvironment);
  //     else
  //         Session.set('testEnvironment', null);
  // }],
  triggersExit: [
    () => {
      Meteor.setTimeout(() => {
        FlowRouter.setQueryParams({ baseline: null });
      }, 100);
    },
  ],
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'testRunComparison',
    });
  },
  parent: 'testRunSummary',
  title: 'Full test run comparison',
  name: 'testRunComparison',
});

FlowRouter.route('/testrun/:testRunId/requirements', {
  triggersEnter: [
    (queryParams) => {
      if (queryParams.queryParams.systemUnderTest)
        Session.set('application', queryParams.queryParams.systemUnderTest);
      else Session.set('application', null);
      if (queryParams.queryParams.workload)
        Session.set('testType', queryParams.queryParams.workload);
      else Session.set('testType', null);
      if (queryParams.queryParams.testEnvironment)
        Session.set('testEnvironment', queryParams.queryParams.testEnvironment);
      else Session.set('testEnvironment', null);
    },
  ],
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'testRunRequirementsDetails',
    });
  },
  parent: 'testRunSummary',
  title: 'service level objectives',
  name: 'testRunRequirementsDetails',
});

FlowRouter.route('/testrun/:testRunId/report/requirements', {
  triggersEnter: [
    (queryParams) => {
      if (queryParams.queryParams.systemUnderTest)
        Session.set('application', queryParams.queryParams.systemUnderTest);
      else Session.set('application', null);
      if (queryParams.queryParams.workload)
        Session.set('testType', queryParams.queryParams.workload);
      else Session.set('testType', null);
      if (queryParams.queryParams.testEnvironment)
        Session.set('testEnvironment', queryParams.queryParams.testEnvironment);
      else Session.set('testEnvironment', null);
    },
  ],
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'testRunRequirementsDetails',
    });
  },
  parent: 'testRunReport',
  title: 'Service Level Objectives',
  name: 'testRunReportRequirementsDetails',
});

FlowRouter.route('/testrun/:testRunId/snapshots', {
  triggersEnter: [
    (queryParams) => {
      if (queryParams.queryParams.dashboardLabel)
        Session.set('activeTab', queryParams.queryParams.dashboardLabel);
    },
  ],
  triggersExit: [
    () => {
      Meteor.setTimeout(() => {
        FlowRouter.setQueryParams({ dashboard: null });
      }, 100);
    },
  ],
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'testRunSnapshots',
    });
  },
  parent: 'testRunSummary',
  title: 'Snapshots',
  name: 'testRunSnapshots',
});

FlowRouter.route('/testrun/:testRunId/dashboard-overview', {
  triggersEnter: [
    (queryParams) => {
      if (queryParams.queryParams.dashboardLabel)
        Session.set('activeTab', queryParams.queryParams.dashboardLabel);
    },
  ],
  triggersExit: [
    () => {
      Meteor.setTimeout(() => {
        FlowRouter.setQueryParams({ dashboard: null });
      }, 100);
    },
  ],
});
