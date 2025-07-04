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
import { ReactiveVar } from 'meteor/reactive-var';

import './testRunTraces.html';

import { Session } from 'meteor/session';
import { CheckResults } from '/imports/collections/checkResults';
import { Applications } from '/imports/collections/applications';
import { ApplicationDashboards } from '/imports/collections/applicationDashboards';
import { getPreviousTestRun, getTestRun } from '/imports/helpers/utils';
import { DsMetrics } from '/imports/collections/dsMetrics';
import { DsPanels } from '/imports/collections/dsPanels';

const traceRequestNamePanelDescription =
  Meteor.settings.public.traceRequestNamePanelDescription ?
    Meteor.settings.public.traceRequestNamePanelDescription
  : 'perfana-response-times';

Template.testRunTraces.onCreated(function grafanaDashboardsOnCreated() {
  this.requestNameFilter = new ReactiveVar();
  this.showRequestFilter = new ReactiveVar(false);
  this.testRunTraces = new ReactiveVar();

  const applicationDashboardQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
    ],
  };

  Meteor.subscribe('applicationDashboards', applicationDashboardQuery);

  const query = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
    ],
  };

  Meteor.subscribe('checkResults', query, 'testRunTraces');
  Meteor.subscribe('applications');

  Session.set('minDuration', undefined);
  Session.set('maxDuration', undefined);
  const testRunId = FlowRouter.current().params.testRunId;

  this.autorun(() => {
    FlowRouter.watchPathChange();

    if (Meteor.subscribe('testRuns', 'testRunTraces', 10, query).ready()) {
      const testRun = getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        FlowRouter.current().params.testRunId,
      );

      if (testRun) {
        const application = Applications.findOne({
          name: testRun.application,
        });

        let tracingService;
        let testTypeIndex = -1;
        let filteredTargets = [];

        const testEnvironmentIndex = application.testEnvironments
          .map((testEnvironment) => {
            return testEnvironment.name;
          })
          .indexOf(FlowRouter.current().queryParams.testEnvironment);

        if (testEnvironmentIndex !== -1) {
          testTypeIndex = application.testEnvironments[
            testEnvironmentIndex
          ].testTypes
            .map((testType) => {
              return testType.name;
            })
            .indexOf(FlowRouter.current().queryParams.workload);
        }

        if (
          testEnvironmentIndex !== -1 &&
          testTypeIndex !== -1 &&
          application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].tracingService
        ) {
          tracingService =
            application.testEnvironments[testEnvironmentIndex].testTypes[
              testTypeIndex
            ].tracingService;
        } else if (
          testEnvironmentIndex !== -1 &&
          application.testEnvironments[testEnvironmentIndex].tracingService
        ) {
          tracingService =
            application.testEnvironments[testEnvironmentIndex].tracingService;
        } else if (application.tracingService) {
          tracingService = application.tracingService;
        }

        const testRunIds = [testRunId];
        const previousTestRunId = getPreviousTestRun(testRun, true);

        if (previousTestRunId) {
          testRunIds.push(previousTestRunId);
        }

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

                this.testRunTraces.set(
                  filteredTargets.map((target) => {
                    return {
                      target: target,
                      testRunId: testRun.testRunId,
                      start: testRun.start,
                      end: testRun.end,
                      service: tracingService,
                      tracingUrl: createTracingUrl(
                        tracingService,
                        testRun.testRunId,
                        testRun.start,
                        testRun.end,
                        target,
                      ),
                    };
                  }),
                );
              }
            }
          }
        }
      }
    }
  });
});

Template.testRunTraces.helpers({
  testRunTraces() {
    return Template.instance().testRunTraces.get();
  },
  showRequestFilter() {
    return Template.instance().showRequestFilter.get();
  },
  hasTestRunTraces() {
    return (
      Template.instance().testRunTraces.get() &&
      Template.instance().testRunTraces.get().length > 0
    );
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
            { panelDescription: traceRequestNamePanelDescription },
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
            { panelDescription: traceRequestNamePanelDescription },
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
    // return  Template.instance().requestNameFilter.get()
    return Session.get('requestNameFilter');
  },
});

Template.testRunTraces.events({
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
});

Template.testRunTrace.onCreated(function testRunTraceOnCreated() {
  this.dashboardHeaderCollapsed = new ReactiveVar(true);
});

Template.testRunTrace.helpers({
  iframeAllowed() {
    return Meteor.settings.public.tracingIframeAllowed ?
        Meteor.settings.public.tracingIframeAllowed === true
      : false;
  },
  tracingUrl() {
    return this.tracingUrl;
  },
  dashboardHeaderCollapsed() {
    return Template.instance().dashboardHeaderCollapsed.get();
  },
});

Template.testRunTrace.events({
  'click #tracing-link'(event, template) {
    event.preventDefault();

    const tracingUrl = template.data.tracingUrl;

    window.open(tracingUrl, '_blank');
  },
  'shown.bs.collapse .dashboard-collapse'() {
    Template.instance().dashboardHeaderCollapsed.set(false);
  },
  'hide.bs.collapse .dashboard-collapse'() {
    Template.instance().dashboardHeaderCollapsed.set(true);
  },
});

Template.testRunTraceAllRequests.onCreated(function testRunTraceOnCreated() {
  this.tracingUrl = new ReactiveVar();

  this.autorun(() => {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const application = Applications.findOne({
        name: testRun.application,
      });
      if (application) {
        let tracingService;
        let testTypeIndex = -1;

        const testEnvironmentIndex = application.testEnvironments
          .map((testEnvironment) => {
            return testEnvironment.name;
          })
          .indexOf(FlowRouter.current().queryParams.testEnvironment);

        if (testEnvironmentIndex !== -1) {
          testTypeIndex = application.testEnvironments[
            testEnvironmentIndex
          ].testTypes
            .map((testType) => {
              return testType.name;
            })
            .indexOf(FlowRouter.current().queryParams.workload);
        }

        if (
          testEnvironmentIndex !== -1 &&
          testTypeIndex !== -1 &&
          application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].tracingService
        ) {
          tracingService =
            application.testEnvironments[testEnvironmentIndex].testTypes[
              testTypeIndex
            ].tracingService;
        } else if (
          testEnvironmentIndex !== -1 &&
          application.testEnvironments[testEnvironmentIndex].tracingService
        ) {
          tracingService =
            application.testEnvironments[testEnvironmentIndex].tracingService;
        } else if (application.tracingService) {
          tracingService = application.tracingService;
        }

        const tracingUrl = createTracingUrl(
          tracingService,
          testRun.testRunId,
          testRun.start,
          testRun.end,
        );
        this.tracingUrl.set(tracingUrl);
      }
    }
  });
});

Template.testRunTraceAllRequests.helpers({
  tracingUrl() {
    return Template.instance().tracingUrl.get();
  },
  iframeAllowed() {
    return Meteor.settings.public.tracingIframeAllowed ?
        Meteor.settings.public.tracingIframeAllowed === true
      : false;
  },
});

Template.testRunTraceAllRequests.events({
  'click #tracing-link'(event, template) {
    event.preventDefault();

    const tracingUrl = template.tracingUrl.get();

    window.open(tracingUrl, '_blank');
  },
});

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

const createTracingUrl = (service, testRunId, start, end, target) => {
  let minDuration;
  let maxDuration;
  let limit;
  let queryString;
  const tracingUi =
    Meteor.settings.public.tracingUi ?
      Meteor.settings.public.tracingUi
    : 'tempo';
  let tracingUrl;

  switch (tracingUi) {
    case 'tempo':
      const theme =
        Meteor.user().profile.theme ? Meteor.user().profile.theme : 'light';
      start = new Date(start).getTime();
      end = new Date(end).getTime();
      minDuration =
        Session.get('minDuration') ? Session.get('minDuration') + 'ms' : '1ms';
      maxDuration =
        Session.get('maxDuration') ? Session.get('maxDuration') + 'ms' : '100s';
      limit =
        Meteor.settings.public.tracingLimit ?
          parseInt(Meteor.settings.public.tracingLimit)
        : 500;
      const tempoUrl =
        Meteor.settings.public.tracingUrl ?
          Meteor.settings.public.tracingUrl
        : 'localhost:16686';
      if (target) {
        tracingUrl = `${tempoUrl}?orgId=1&from=${start}&to=${end}&var-service=${service}&var-perfanaRequestName=${target}&var-perfanaTestRunId=${testRunId}&var-minDuration=${minDuration}&var-maxDuration=${maxDuration}&var-limit=${limit}&theme=${theme}&kiosk`;
      } else {
        tracingUrl = `${tempoUrl}?orgId=1&from=${start}&to=${end}&var-service=${service}&var-perfanaTestRunId=${testRunId}&var-minDuration=${minDuration}&var-maxDuration=${maxDuration}&var-limit=${limit}&theme=${theme}&kiosk`;
      }

      break;
    case 'jaeger':
      let tags;
      start = new Date(start).getTime() * 1000;
      end = new Date(end).getTime() * 1000;
      minDuration =
        Session.get('minDuration') ? Session.get('minDuration') + 'ms' : '';
      maxDuration =
        Session.get('maxDuration') ? Session.get('maxDuration') + 'ms' : '';
      if (target) {
        tags = encodeURI(
          `{"perfana-test-run-id": "${testRunId}", "perfana-request-name": "${target}"}`,
        );
      } else {
        tags = encodeURI(`{"perfana-test-run-id": "${testRunId}"}`);
      }
      limit =
        Meteor.settings.public.tracingLimit ?
          Meteor.settings.public.tracingLimit
        : 500;
      queryString = `start=${start}&end=${end}&lookback&limit=${limit}&maxDuration=${maxDuration}&minDuration=${minDuration}&service=${service}&tags=${tags}`;
      const jaegerUrl =
        Meteor.settings.public.tracingUrl ?
          Meteor.settings.public.tracingUrl
        : 'localhost:16686';
      tracingUrl = `${jaegerUrl}/search?${queryString}`;
      break;
    case 'elastic':
      start = new Date(start).toISOString();
      end = new Date(end).toISOString();
      if (target) {
        queryString = `rangeFrom=${start}&rangeTo=${end}&query=labels.http_request_header_perfana-test-run-id:%20%22${testRunId}%22%20%20and%20labels.http_request_header_perfana-request-name:%20%22${target}%22%20%20and%20service.name%20:%20%22${service}%22%20&type=kql`;
      } else {
        queryString = `rangeFrom=${start}&rangeTo=${end}&query=labels.http_request_header_perfana-test-run-id:%20%22${testRunId}%22%20%20and%20service.name%20:%20%22${service}%22%20&type=kql`;
      }
      const elasticUrl =
        Meteor.settings.public.tracingUrl ?
          Meteor.settings.public.tracingUrl
        : 'localhost:16686';
      tracingUrl = `${elasticUrl}?${queryString}`;
      break;
  }

  return tracingUrl;
};
