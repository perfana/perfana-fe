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

// noinspection JSVoidFunctionReturnValueUsed

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import './testRunDynatraces.html';

import {
  formatDate,
  getPreviousTestRun,
  getTestRun,
} from '/imports/helpers/utils';
import { Session } from 'meteor/session';
import { CheckResults } from '/imports/collections/checkResults';
import { Applications } from '/imports/collections/applications';
import { ApplicationDashboards } from '/imports/collections/applicationDashboards';
import { TestRuns } from '/imports/collections/testruns';
import { Dynatrace } from '/imports/collections/dynatrace';
import { log } from '/both/logger';
import { DsPanels } from '/imports/collections/dsPanels';
import { DsMetrics } from '/imports/collections/dsMetrics';

Template.testRunDynatraces.onCreated(function grafanaDashboardsOnCreated() {
  this.requestNameFilter = new ReactiveVar();
  this.testRunDynatraces = new ReactiveVar();
  this.testRun = new ReactiveVar();
  this.problems = new ReactiveVar([]);
  this.showRequestFilter = new ReactiveVar(false);

  Session.set('requestNameFilter', undefined);

  const applicationDashboardQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
    ],
  };

  const query = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
    ],
  };

  Meteor.subscribe('testRuns', 'testRunDynatrace', 50, query);
  Meteor.subscribe('applicationDashboards', applicationDashboardQuery);

  Meteor.subscribe('checkResults', query, 'testRunDynatrace');
  Meteor.subscribe('applications');
  Meteor.subscribe('dynatrace');

  Session.set('minDuration', undefined);
  Session.set('maxDuration', undefined);

  this.autorun(() => {
    FlowRouter.watchPathChange();
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    if (testRun) {
      this.testRun.set(testRun);
      if (Session.get('selectedDynatraceEntity') !== undefined) {
        Meteor.call(
          'getDynatraceProblems',
          testRun,
          Session.get('selectedDynatraceEntity'),
          (err, problems) => {
            if (err) {
              log.error(err);
            } else {
              this.problems.set(problems);
            }
          },
        );
      }

      const application = Applications.findOne({
        name: testRun.application,
      });

      if (application) {
        const applicationDashboards = ApplicationDashboards.find({
          $and: [
            { application: FlowRouter.current().queryParams.systemUnderTest },
            {
              testEnvironment: FlowRouter.current().queryParams.testEnvironment,
            },
            { tags: 'perfana-performance-test-tool' },
          ],
        }).fetch();

        if (applicationDashboards.length > 0) {
          const testRunIds = [testRun.testRunId];
          const previousTestRunId = getPreviousTestRun(testRun, true);

          if (previousTestRunId) {
            testRunIds.push(previousTestRunId);
          }
          let filteredTargets = [];
          const traceRequestNamePanelDescription =
            Meteor.settings.public.traceRequestNamePanelDescription ?
              Meteor.settings.public.traceRequestNamePanelDescription
            : 'perfana-request-names';

          if (
            Meteor.subscribe(
              'dsPanelsDescription',
              testRunIds,
              traceRequestNamePanelDescription,
            ).ready()
          ) {
            const dsPanels = DsPanels.find({
              $and: [
                { testRunId: { $in: testRunIds } },
                { 'panel.description': traceRequestNamePanelDescription },
              ],
            }).fetch();

            if (dsPanels.length > 0) {
              const panelIds = dsPanels.map((panel) => panel.panelId);

              const applicationDashboardId = dsPanels[0].applicationDashboardId;

              if (
                Meteor.subscribe(
                  'dsMetrics',
                  testRunIds,
                  panelIds,
                  applicationDashboardId,
                ).ready()
              ) {
                const dsMetricsPanels = DsMetrics.find({
                  $and: [
                    { testRunId: { $in: testRunIds } },
                    { panelId: { $in: panelIds } },
                    { applicationDashboardId: applicationDashboardId },
                  ],
                }).fetch();

                if (dsMetricsPanels.length > 0) {
                  dsMetricsPanels.forEach((dsMetricsPanel) => {
                    dsMetricsPanel.data.forEach((item) => {
                      if (
                        filteredTargets
                          .map((filteredTarget) => {
                            return filteredTarget;
                          })
                          .indexOf(item.metricName) === -1
                      ) {
                        filteredTargets.push(item.metricName);
                      }
                    });
                  });

                  if (filteredTargets.length > 0)
                    this.showRequestFilter.set(true);

                  if (
                    Session.get('requestNameFilter') !== undefined &&
                    Session.get('requestNameFilter') !== ''
                  ) {
                    // if(this.requestNameFilter.get() !== undefined && this.requestNameFilter.get() !== ''){

                    filteredTargets = filteredTargets.filter((target) => {
                      // return target.target.toLowerCase().indexOf(this.requestNameFilter.get().toLowerCase()) !== -1;
                      return (
                        target
                          .toLowerCase()
                          .indexOf(
                            Session.get('requestNameFilter').toLowerCase(),
                          ) !== -1
                      );
                    });
                  }

                  this.testRunDynatraces.set(
                    filteredTargets.map((target) => {
                      return {
                        target: target,
                        testRunId: testRun.testRunId,
                        start: testRun.start,
                        end: testRun.end,
                      };
                    }),
                  );
                }
              }
            }
          }
        }
      }
    }
  });
});

Template.testRunDynatraces.helpers({
  dynatraceEntities() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const application = Applications.findOne({
        name: testRun.application,
      });

      if (application) {
        const testEnvironmentIndex = application.testEnvironments
          .map((testEnvironment) => {
            return testEnvironment.name;
          })
          .indexOf(testRun.testEnvironment);

        const testTypeIndex = application.testEnvironments[
          testEnvironmentIndex
        ].testTypes
          .map((testType) => {
            return testType.name;
          })
          .indexOf(testRun.testType);

        if (
          application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].dynatraceEntities &&
          application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].dynatraceEntities.length > 0
        ) {
          return application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].dynatraceEntities;
        } else if (
          application.testEnvironments[testEnvironmentIndex]
            .dynatraceEntities &&
          application.testEnvironments[testEnvironmentIndex].dynatraceEntities
            .length > 0
        ) {
          return application.testEnvironments[testEnvironmentIndex]
            .dynatraceEntities;
        } else if (
          application.dynatraceEntities &&
          application.dynatraceEntities.length > 0
        ) {
          return application.dynatraceEntities;
        }
      }
    }
  },
  dynatraceBaselineSelected() {
    return Session.get('dynatraceBaselineSelected');
  },
  problems() {
    return Template.instance().problems.get();
  },
  testRunDynatraces() {
    return Template.instance().testRunDynatraces.get();
  },
  requirements() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const applicationDashboards = ApplicationDashboards.find({
        $and: [
          { application: FlowRouter.current().queryParams.systemUnderTest },
          { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
          { tags: 'perfana-performance-test-tool' },
        ],
      }).fetch();

      if (applicationDashboards.length > 0) {
        const checkResults = CheckResults.find({
          $and: [
            { application: testRun.application },
            { testEnvironment: testRun.testEnvironment },
            { testType: testRun.testType },
            { testRunId: testRun.testRunId },
            { dashboardUid: applicationDashboards[0].dashboardUid },
            { panelDescription: 'perfana-response-times' },
            { 'requirement.operator': { $exists: true } },
          ],
        }).fetch();

        if (checkResults.length > 0) {
          return checkResults.map((checkResult) => {
            return {
              value: `${checkResult.requirement.operator}-${checkResult.requirement.value}`,
              label: createRequirementLabel(checkResult),
            };
          });
        }
      }
    }
  },
  hasTestRunDynatraces() {
    return (
      Template.instance().testRunDynatraces.get() &&
      Template.instance().testRunDynatraces.get().length > 0
    );
  },
  hasRequiremnts() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const applicationDashboards = ApplicationDashboards.find({
        $and: [
          { application: FlowRouter.current().queryParams.systemUnderTest },
          { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
          { tags: 'perfana-performance-test-tool' },
        ],
      }).fetch();

      if (applicationDashboards.length > 0) {
        const checkResults = CheckResults.find({
          $and: [
            { application: testRun.application },
            { testEnvironment: testRun.testEnvironment },
            { testType: testRun.testType },
            { testRunId: testRun.testRunId },
            { dashboardUid: applicationDashboards[0].dashboardUid },
            { panelDescription: 'perfana-response-times' },
            { 'requirement.operator': { $exists: true } },
          ],
        }).fetch();

        return checkResults.length > 0;
      }
    }
  },
  maxDuration() {
    return Session.get('maxDuration');
  },
  minDuration() {
    return Session.get('minDuration');
  },
  requestNameFilter() {
    // return Template.instance().showRequestFilte.get();
    return Session.get('requestNameFilter');
  },
  problemsFields() {
    return [
      { key: 'rankedImpacts.0.entityName', label: 'Service' },
      { key: 'rankedImpacts.0.eventType', label: 'Problem type' },
      {
        key: 'startTime',
        label: 'Start',
        fn: (value) => {
          return formatDate(value);
        },
      },
      {
        key: 'endTime',
        hidden: true,
        sortOrder: 0,
        sortDirection: 'descending',
      }, //hidden column to sort unformatted date
      {
        key: 'endTime',
        label: 'End',
        fn: (value) => {
          return formatDate(value);
        },
      },
      { key: 'severityLevel', label: 'Severity level' },
      { key: 'status', label: 'Status' },
      {
        key: '_id',
        label: '',
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="dynatrace-problem-link" class="fa fa-external-link reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Show problem in Dynatrace"></i>`,
          );
        },
      },
    ];
  },
  fields() {
    return [
      {
        key: 'target',
        label: 'Request',
        sortOrder: 0,
        sortDirection: 'asscending',
      },
      {
        key: '_id',
        label: '',
        fn: () => {
          return new Spacebars.SafeString(
            `<button id="view-response-time-hotspots" class="break-word  dynatrace-button">View response time hotspots</button>`,
          );
        },
      },
      {
        key: '_id',
        label: '',
        fn: () => {
          return new Spacebars.SafeString(
            `<button id="view-pure-paths" class="break-word  dynatrace-button">View PurePaths</button>`,
          );
        },
      },
      {
        key: '_id',
        label: '',
        fn: () => {
          return new Spacebars.SafeString(
            `<button id="analyze-outliers" class="break-word  dynatrace-button">Analyze outliers</button>`,
          );
        },
      },
      {
        key: '_id',
        label: '',
        fn: () => {
          return new Spacebars.SafeString(
            `<button id="method-hotspots" class="break-word  dynatrace-button">Method hotspots</button>`,
          );
        },
      },
    ];
  },
  settings() {
    return {
      rowsPerPage: 20,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      noDataTmpl: Template.noTestRunTraces,
    };
  },
  problemsSettings() {
    return {
      rowsPerPage: 20,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      noDataTmpl: Template.noTestRunProblems,
    };
  },
});

Template.testRunDynatraces.events({
  'change #minDuration'(event) {
    Session.set('minDuration', event.target.value);
  },
  'change #maxDuration'(event) {
    Session.set('maxDuration', event.target.value);
  },
  'keyup #request-name-filter'(event) {
    // template.requestNameFilter.set(event.target.value)
    Session.set('requestNameFilter', event.target.value);
  },
  'click .reactive-table.dynatrace-problems tbody tr'(event) {
    const dynatraceProblemUrl = createDynatraceProblemUrl(this);

    switch (event.target.id) {
      case 'dynatrace-problem-link':
        window.open(dynatraceProblemUrl, '_blank');
        break;
    }
  },
  'click #view-response-time-hotspots'(event, template) {
    const dynatraceUrl = createDynatraceUrl(
      Session.get('selectedRequests'),
      'responsetimeanalysis',
      template.testRun.get(),
    );
    window.open(dynatraceUrl, '_blank');
  },
  'click #view-pure-paths'(event, template) {
    const dynatraceUrl = createNewDynatraceUrl(
      Session.get('selectedRequests'),
      'purepaths',
      template.testRun.get(),
    );
    window.open(dynatraceUrl, '_blank');
  },
  'click #analyze-outliers'(event, template) {
    const dynatraceUrl = createDynatraceUrl(
      Session.get('selectedRequests'),
      'responsetimedistribution',
      template.testRun.get(),
    );
    window.open(dynatraceUrl, '_blank');
  },
  'click #method-hotspots'(event, template) {
    const dynatraceUrl = createDynatraceUrl(
      Session.get('selectedRequests'),
      'methodhotspots',
      template.testRun.get(),
    );
    window.open(dynatraceUrl, '_blank');
  },
  'click #view-top-web-requests'(event, template) {
    const deeplinkUrl = createNewDynatraceDeeplinkUrl(
      'mda?mdaId=topweb',
      template.testRun.get(),
    );
    window.open(deeplinkUrl, '_blank');
  },

  'click #view-exception-analysis'(event, template) {
    const deeplinkUrl = createDynatraceDeeplinkUrl(
      'exceptionsoverview',
      template.testRun.get(),
    );
    window.open(deeplinkUrl, '_blank');
  },
  'click #view-service-flow'(event, template) {
    const deeplinkUrl = createDynatraceDeeplinkUrl(
      'serviceflow',
      template.testRun.get(),
    );
    window.open(deeplinkUrl, '_blank');
  },
  'click #compare'(event, template) {
    const deeplinkUrl = createDynatraceCompareUrl(
      Session.get('selectedRequests'),
      template.testRun.get(),
      Session.get('dynatraceBaseline'),
    );
    window.open(deeplinkUrl, '_blank');
  },
  'click #multi-dimensional-analysis-response-times'(event, template) {
    const dynatraceUrl = createDynatraceMdaUrl(
      Session.get('selectedRequests'),
      'RESPONSE_TIME',
      template.testRun.get(),
    );
    window.open(dynatraceUrl, '_blank');
  },
  'click #multi-dimensional-analysis-failure-rate'(event, template) {
    const dynatraceUrl = createDynatraceMdaUrl(
      Session.get('selectedRequests'),
      'FAILURE_RATE',
      template.testRun.get(),
    );
    window.open(dynatraceUrl, '_blank');
  },
  'click #multi-dimensional-analysis-cpu-time'(event, template) {
    const dynatraceUrl = createDynatraceMdaUrl(
      Session.get('selectedRequests'),
      'CPU_TIME',
      template.testRun.get(),
    );
    window.open(dynatraceUrl, '_blank');
  },
  'click #multi-dimensional-analysis-io-time'(event, template) {
    const dynatraceUrl = createDynatraceMdaUrl(
      Session.get('selectedRequests'),
      'IO_TIME',
      template.testRun.get(),
    );
    window.open(dynatraceUrl, '_blank');
  },
  'click #multi-dimensional-analysis-db-time'(event, template) {
    const dynatraceUrl = createDynatraceMdaUrl(
      Session.get('selectedRequests'),
      'DATABASE_CHILD_CALL_TIME',
      template.testRun.get(),
    );
    window.open(dynatraceUrl, '_blank');
  },
  'click #multi-dimensional-analysis-other-services-time'(event, template) {
    const dynatraceUrl = createDynatraceMdaUrl(
      Session.get('selectedRequests'),
      'NON_DATABASE_CHILD_CALL_TIME',
      template.testRun.get(),
    );
    window.open(dynatraceUrl, '_blank');
  },
});

const createDynatraceUrl = (requestName, view, testRun) => {
  const dynatrace = Dynatrace.findOne({});

  if (dynatrace) {
    const dynatraceEntity = Session.get('selectedDynatraceEntity');
    const start = new Date(testRun.start).getTime();
    const end = new Date(testRun.end).getTime();
    const minDuration = Session.get('minDuration');
    const maxDuration = Session.get('maxDuration');
    const component = view === 'methodhotspots' ? 'entityId' : 'sci';

    let durationParam = '';
    if (minDuration && maxDuration) {
      durationParam = `%100%11${minDuration}000%14${maxDuration}000`;
    } else {
      if (minDuration) {
        durationParam = `%100%11${minDuration}000%144611686018427387`;
      } else if (maxDuration) {
        durationParam = `%100%110%14${maxDuration}000`;
      }
    }

    let requestNameParam = '';

    if (requestName !== 'all') {
      const encodedRequestName = requestName.replace(/\//g, '%5C0');
      requestNameParam = `%1015%11${dynatrace.perfanaRequestNameAttribute}%14${encodedRequestName}%140%14%14%14%14`;
    }

    const urlEncodedTestRunId = testRun.testRunId.replace(/\//g, '%5C0');

    return `${dynatrace.host}/#${view};${component}=${dynatraceEntity};timeframe=custom${start}to${end};servicefilter=0%1E15%11${dynatrace.perfanaTestRunIdAttribute}%14${urlEncodedTestRunId}%140%14%14%14%14${requestNameParam}${durationParam};gf=all`;
  }
};
const createNewDynatraceUrl = (requestName, view, testRun) => {
  const dynatrace = Dynatrace.findOne({});

  if (dynatrace) {
    const dynatraceEntity = Session.get('selectedDynatraceEntity');
    const start = new Date(testRun.start).getTime();
    const end = new Date(testRun.end).getTime();
    const minDuration = Session.get('minDuration');
    const maxDuration = Session.get('maxDuration');

    let durationParam = '';
    if (minDuration && maxDuration) {
      durationParam = `%100%11${minDuration}000%14${maxDuration}000`;
    } else {
      if (minDuration) {
        durationParam = `%100%11${minDuration}000%144611686018427387`;
      } else if (maxDuration) {
        durationParam = `%100%110%14${maxDuration}000`;
      }
    }

    let requestNameParam = '';

    if (requestName !== 'all') {
      requestNameParam = `%1015%11${dynatrace.perfanaRequestNameAttribute}%14${requestName}%140%14%14%14%14`;
    }

    const urlEncodedTestRunId = testRun.testRunId.replace(/\//g, '%5C0');

    return `${dynatrace.host}/ui/services/${dynatraceEntity}/${view}?servicefilter=0%1E15%11${dynatrace.perfanaTestRunIdAttribute}%14${urlEncodedTestRunId}%140%14%14%14%14${requestNameParam}${durationParam}&gtf=c_${start}_${end}&gf=all`;
  }
};
const createDynatraceMdaUrl = (requestName, metric, testRun) => {
  const dynatrace = Dynatrace.findOne({});

  if (dynatrace) {
    const dynatraceEntity = Session.get('selectedDynatraceEntity');
    const start = new Date(testRun.start).getTime();
    const end = new Date(testRun.end).getTime();
    const minDuration = Session.get('minDuration');
    const maxDuration = Session.get('maxDuration');

    let durationParam = '';
    if (minDuration && maxDuration) {
      durationParam = `%100%11${minDuration}000%14${maxDuration}000`;
    } else {
      if (minDuration) {
        durationParam = `%100%11${minDuration}000%144611686018427387`;
      } else if (maxDuration) {
        durationParam = `%100%110%14${maxDuration}000`;
      }
    }

    let requestNameParam = '';

    if (requestName !== 'all') {
      requestNameParam = `%1015%11${dynatrace.perfanaRequestNameAttribute}%14${requestName}`;
    }

    const urlEncodedTestRunId = testRun.testRunId.replace(/\//g, '%5C0');

    return `${dynatrace.host}/ui/services/${dynatraceEntity}/mda?metric=${metric}&dimension=%7BRequestAttribute:perfana-request-name%7D&mergeServices=false&aggregation=P95&percentile=95&chart=LINE&servicefilter=0%1E15%11${dynatrace.perfanaTestRunIdAttribute}%14${urlEncodedTestRunId}${requestNameParam}${durationParam}&gf=all&gtf=c_${start}_${end}`;
  }
};

const createDynatraceCompareUrl = (requestName, testRun, baselineTestRunId) => {
  const dynatrace = Dynatrace.findOne({});

  const baselineTestRun = TestRuns.findOne({
    _id: baselineTestRunId,
  });

  if (dynatrace && baselineTestRun) {
    const dynatraceEntity = Session.get('selectedDynatraceEntity');
    const start = new Date(testRun.start).getTime();
    const end = new Date(testRun.end).getTime();
    const baselineStart = new Date(baselineTestRun.start).getTime();
    const minDuration = Session.get('minDuration');
    const maxDuration = Session.get('maxDuration');

    let durationParam = '';
    if (minDuration && maxDuration) {
      durationParam = `%100%11${minDuration}000%14${maxDuration}000`;
    } else {
      if (minDuration) {
        durationParam = `%100%11${minDuration}000%144611686018427387`;
      } else if (maxDuration) {
        durationParam = `%100%110%14${maxDuration}000`;
      }
    }

    let requestNameParam = '';

    if (requestName !== 'all') {
      requestNameParam = `%1015%11${dynatrace.perfanaRequestNameAttribute}%14${requestName}%140%14%14%14%14`;
    }

    return `${dynatrace.host}/#serviceComparison;serviceId=${dynatraceEntity};timeframe=custom${start}to${end};servicefilter=${requestNameParam}${durationParam};gf=all;tfshift=CustomTimeframe;ctfstart=${baselineStart}`;
  }
};

const createDynatraceProblemUrl = (problem) => {
  const dynatrace = Dynatrace.findOne({});

  if (dynatrace) {
    return `${dynatrace.host}/#problems/problemdetails;pid=${problem.id};gf=all`;
  }
};

const createDynatraceDeeplinkUrl = (view, testRun) => {
  const start = new Date(testRun.start).getTime();
  const end = new Date(testRun.end).getTime();

  const dynatrace = Dynatrace.findOne({});

  if (dynatrace) {
    const dynatraceEntity = Session.get('selectedDynatraceEntity');
    if (view === 'serviceflow') {
      return `${dynatrace.host}/#${view};sci=${dynatraceEntity};timeframe=custom${start}to${end};gf=all;mode=RESPONSE_TIME`;
    } else {
      return `${dynatrace.host}/#${view};sci=${dynatraceEntity};gtf=c_${start}_${end};gf=all`;
    }
  }
};

const createNewDynatraceDeeplinkUrl = (view, testRun) => {
  const start = new Date(testRun.start).getTime();
  const end = new Date(testRun.end).getTime();

  const dynatrace = Dynatrace.findOne({});

  if (dynatrace) {
    const dynatraceEntity = Session.get('selectedDynatraceEntity');

    return `${dynatrace.host}/ui/services/${dynatraceEntity}/${view}&gtf=c_${start}_${end}&gf=all  `;
  }
};

const createRequirementLabel = (checkResult) => {
  const requirementOperator = humanReadableOperator(
    checkResult.requirement.operator,
  );
  const requirementValue = checkResult.requirement.value;
  const panelTitle = checkResult.panelTitle.replace(/[0-9]+-(.*)/, '$1');
  const matchPattern =
    checkResult.matchPattern ?
      ` for series matching pattern "${checkResult.matchPattern}"`
    : '';

  // if based on generic check, try to get data from generic check to override it

  return `${panelTitle} should be ${requirementOperator} ${requirementValue}${matchPattern}`;
};

const humanReadableOperator = (operator) => {
  switch (operator) {
    case 'st': //legacy
      return 'less than';

    case 'lt':
      return 'less than';
    case 'gt':
      return 'greater than';
  }
};
