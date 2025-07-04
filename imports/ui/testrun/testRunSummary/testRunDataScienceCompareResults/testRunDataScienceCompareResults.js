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

/* eslint-disable camelcase */
// noinspection HtmlUnknownAttribute

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import './testRunDataScienceCompareResults.html';
import './allMetricsTable';
import './dataScienceModals';
import './differenceDetails';
import './visualizeDifferenceDs';
import { PendingDsCompareConfigChanges } from '/imports/collections/pendingDsCompareConfigChanges';
import { Session } from 'meteor/session';
import { ReactiveVar } from 'meteor/reactive-var';
import { setDefaultDsCompareConfig } from '/both/setDefaultDsCompareConfig';
import { log } from '/both/logger';

import {
  dynamicSortNested,
  getFixedBaselineTestRun,
  getPreviousTestRun,
  getTestRun,
  slugify,
} from '/imports/helpers/utils';
import { DsAdaptResultsSubs } from '/imports/startup/subsManager';
import { DsCompareConfig } from '/imports/collections/dsCompareConfig';
import { DsAdaptResults } from '/imports/collections/dsAdaptResults';
import { DsAdaptConclusion } from '/imports/collections/dsAdaptConclusion';
import { DsMetrics } from '/imports/collections/dsMetrics';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import { MetricClassification } from '/imports/collections/metricClassification';

import { dark } from '/imports/helpers/plotly_dark_template';
import { light } from '/imports/helpers/plotly_light_template';
import Plotly from 'plotly.js-dist';
import { DsChangepoints } from '/imports/collections/dsChangePoints';

Template.testRunDataScienceCompareResults.onCreated(
  function testRunDataScienceCompareResultsOnCreated() {
    this.metrics = new ReactiveVar([]);
    this.dsAdaptResultsSubscriptionReady = new ReactiveVar(false);
    this.dsAdaptResultsQueryConclusion = new ReactiveVar('regression');
    this.adaptAvailable = new ReactiveVar(false);
    this.trackedRegressions = new ReactiveVar([]);
    this.trackedRegressionSelected = new ReactiveVar(false);
    this.dsAdaptConclusion = new ReactiveVar();
    this.hasPendingDsCompareConfigChanges = new ReactiveVar(false);
    this.includeControlGroup = new ReactiveVar(true);
  },
);
Template.testRunDataScienceCompareResults.onRendered(
  function testRunDataScienceCompareResultsOnRendered() {
    this.autorun(() => {
      const testRun = Template.currentData().testRun;

      if (
        Meteor.subscribe(
          'dsAdaptConclusion',
          FlowRouter.current().params.testRunId,
        ).ready()
      ) {
        const dsAdaptConclusion = DsAdaptConclusion.findOne({
          testRunId: FlowRouter.current().params.testRunId,
        });

        if (dsAdaptConclusion) {
          this.dsAdaptConclusion.set(dsAdaptConclusion);
        }
      }

      // let testRun = getTestRun(FlowRouter.current().queryParams.systemUnderTest, FlowRouter.current().params.testRunId);

      const applicationDashboardQuery = {
        $and: [
          { application: Session.get('application') },
          { testEnvironment: Session.get('testEnvironment') },
        ],
      };

      const dsChangePointQuery = {
        $and: [
          { application: Session.get('application') },
          { testEnvironment: Session.get('testEnvironment') },
          { testType: Session.get('testType') },
          { testRunId: testRun.testRunId },
        ],
      };
      const pendingDsCompareConfigChangesQuery = {
        $and: [
          { application: Session.get('application') },
          { testEnvironment: Session.get('testEnvironment') },
          { testType: Session.get('testType') },
          { processed: false },
        ],
      };

      const metricClassificationQuery = {
        $or: [
          {
            $and: [
              { application: Session.get('application') },
              { testEnvironment: Session.get('testEnvironment') },
              { testType: Session.get('testType') },
            ],
          },
          {
            $and: [
              { application: { $eq: null } },
              { testEnvironment: { $eq: null } },
              { testType: { $eq: null } },
            ],
          },
        ],
      };

      // if(testRun) {
      //     Meteor.call('getUnresolvedRegressionForTestRun', testRun, (error, result) => {
      //         if (result.error) {
      //             toastr.error(result.error);
      //         } else {
      //             this.trackedRegressions.set(result.data);
      //         }
      //     });
      // }

      // if (Meteor.subscribe('dsCompareConfig', metricClassificationQuery).ready() && Meteor.subscribe('metricClassification', metricClassificationQuery).ready() && Meteor.subscribe('applicationDashboards', applicationDashboardQuery).ready() && Meteor.subscribe('dsAdaptTrackedResults', testRun.testRunId).ready() && Meteor.subscribe('dsChangepoints', dsChangePointQuery).ready()) {
      if (
        Meteor.subscribe(
          'dsCompareConfig',
          metricClassificationQuery,
        ).ready() &&
        Meteor.subscribe(
          'metricClassification',
          metricClassificationQuery,
        ).ready() &&
        Meteor.subscribe(
          'applicationDashboards',
          applicationDashboardQuery,
        ).ready() &&
        Meteor.subscribe('dsChangepoints', dsChangePointQuery).ready() &&
        Meteor.subscribe(
          'pendingDsCompareConfigChanges',
          pendingDsCompareConfigChangesQuery,
        ).ready()
      ) {
        const pendingDsCompareConfigChanges =
          PendingDsCompareConfigChanges.find(
            pendingDsCompareConfigChangesQuery,
          ).fetch();

        this.hasPendingDsCompareConfigChanges.set(
          pendingDsCompareConfigChanges.length > 0,
        );

        const dsCompareConfigs = DsCompareConfig.find(
          metricClassificationQuery,
        ).fetch();

        const defaultDsCompareConfigSelector = {
          application: { $eq: null },
          testEnvironment: { $eq: null },
          testType: { $eq: null },
          applicationDashboardId: { $eq: null },
          dashboardUid: { $eq: null },
          panelId: { $eq: null },
          metricName: { $eq: null },
        };

        let defaultDsCompareConfig = DsCompareConfig.findOne(
          defaultDsCompareConfigSelector,
        );

        if (!defaultDsCompareConfig) {
          defaultDsCompareConfig = setDefaultDsCompareConfig({});
        }

        const metricClassifiactions = MetricClassification.find(
          metricClassificationQuery,
        ).fetch();

        if (testRun) {
          let dsAdaptResultsQuery;

          if (this.dsAdaptResultsQueryConclusion.get() === 'all') {
            dsAdaptResultsQuery = {
              testRunId: testRun.testRunId,
            };
          } else if (this.dsAdaptResultsQueryConclusion.get() === 'filtered') {
            dsAdaptResultsQuery = {
              $and: [
                { testRunId: testRun.testRunId },
                {
                  $or: [
                    { 'conclusion.ignore': false },
                    { 'conclusion.ignore': { $exists: false } },
                  ],
                },
                {
                  $or: [
                    // {'conclusion.label': 'partial increase'},
                    // {'conclusion.label': 'partial decrease'},
                    // {'conclusion.label': 'partial improvement'},
                    { 'conclusion.label': 'partial regression' },
                  ],
                },
                {
                  $or: [
                    {
                      $and: [
                        {
                          'compareConfig.iqrThreshold.source': {
                            $ne: 'default',
                          },
                        },
                        { 'checks.iqr.valid': true },
                        { 'checks.iqr.isDifference': false },
                      ],
                    },
                    {
                      $and: [
                        {
                          'compareConfig.pctThreshold.source': {
                            $ne: 'default',
                          },
                        },
                        { 'checks.pct.valid': true },
                        { 'checks.pct.isDifference': false },
                      ],
                    },
                    {
                      $and: [
                        {
                          'compareConfig.absThreshold.source': {
                            $ne: 'default',
                          },
                        },
                        { 'checks.abs.valid': true },
                        { 'checks.abs.isDifference': false },
                      ],
                    },
                  ],
                },
              ],
            };
          } else if (this.dsAdaptResultsQueryConclusion.get() === 'ignored') {
            dsAdaptResultsQuery = {
              $and: [
                { testRunId: testRun.testRunId },
                { 'conclusion.ignore': true },
              ],
            };
          } else {
            dsAdaptResultsQuery = {
              $and: [
                {
                  $or: [
                    { 'conclusion.ignore': false },
                    { 'conclusion.ignore': { $exists: false } },
                  ],
                },
                { testRunId: testRun.testRunId },
                {
                  'conclusion.label': this.dsAdaptResultsQueryConclusion.get(),
                },
              ],
            };
          }

          if (
            DsAdaptResultsSubs.subscribe(
              'dsAdaptResults',
              dsAdaptResultsQuery,
            ).ready()
          ) {
            this.dsAdaptResultsSubscriptionReady.set(true);
            const dsAdaptResults =
              DsAdaptResults.find(dsAdaptResultsQuery).fetch();
            if (dsAdaptResults.length > 0) {
              const metrics = [];
              dsAdaptResults.forEach((dsCompareResult) => {
                let metricsCategoryIndex = metricClassifiactions.findIndex(
                  (m) => {
                    return (
                      dsCompareResult.applicationDashboardId ===
                        m.applicationDashboardId &&
                      dsCompareResult.panelId === m.panelId &&
                      dsCompareResult.metricName === m.metricName
                    );
                  },
                );
                if (metricsCategoryIndex === -1) {
                  metricsCategoryIndex = metricClassifiactions.findIndex(
                    (m) => {
                      return (
                        dsCompareResult.applicationDashboardId ===
                          m.applicationDashboardId &&
                        dsCompareResult.panelId === m.panelId
                      );
                    },
                  );
                }
                let metricDsCompareConfigIndex = dsCompareConfigs.findIndex(
                  (m) => {
                    return (
                      dsCompareResult.applicationDashboardId ===
                        m.applicationDashboardId &&
                      dsCompareResult.panelId === m.panelId &&
                      dsCompareResult.metricName === m.metricName
                    );
                  },
                );
                if (metricDsCompareConfigIndex === -1) {
                  metricDsCompareConfigIndex = dsCompareConfigs.findIndex(
                    (m) => {
                      return (
                        dsCompareResult.applicationDashboardId ===
                          m.applicationDashboardId &&
                        dsCompareResult.panelId === m.panelId
                      );
                    },
                  );
                }
                dsCompareResult.dsCompareConfig =
                  metricDsCompareConfigIndex !== -1 ?
                    dsCompareConfigs[metricDsCompareConfigIndex]
                  : defaultDsCompareConfig ? defaultDsCompareConfig
                  : null;
                dsCompareResult.category =
                  metricsCategoryIndex > -1 ?
                    metricClassifiactions[metricsCategoryIndex]
                      .metricClassification
                  : 'UNKNOWN';
                dsCompareResult.higherIsBetter =
                  metricsCategoryIndex > -1 ?
                    metricClassifiactions[metricsCategoryIndex].higherIsBetter
                  : false;

                metrics.push(dsCompareResult);
              });

              this.metrics.set(metrics);
            }
          }
        }
      }
    });
  },
);

Template.testRunDataScienceCompareResults.helpers({
  includeControlGroup() {
    return Template.instance().includeControlGroup.get();
  },
  hasPendingDsCompareConfigChanges() {
    return (
      Template.instance().hasPendingDsCompareConfigChanges &&
      Template.instance().hasPendingDsCompareConfigChanges.get() === true
    );
  },
  testRunIsChangePoint() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    if (testRun) {
      const dsChangePoint = DsChangepoints.findOne({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
          { testRunId: testRun.testRunId },
        ],
      });
      return !!dsChangePoint;
    }
  },
  // trackedRegressionDetected(){
  //     // return Template.instance().dsAdaptConclusion &&  Template.instance().dsAdaptConclusion.get().trackedRegressions.length > 0;
  //     return Template.instance().trackedRegressions && Template.instance().trackedRegressions.get().length > 0;
  // },
  // trackedRegressions(){
  //     return Template.instance().trackedRegressions.get();
  // },
  // trackedRegressionSelected(){
  //   return Template.instance().trackedRegressionSelected.get();
  // },
  allMetrics() {
    return (
      Template.instance().dsAdaptResultsQueryConclusion &&
      Template.instance().dsAdaptResultsQueryConclusion.get() === 'all'
    );
  },
  regressionsDetectedAndOKSLO() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    const dsAdaptConclusion = Template.instance().dsAdaptConclusion.get();
    if (testRun && dsAdaptConclusion !== undefined) {
      const meetsRequirement =
        testRun.consolidatedResult &&
        testRun.consolidatedResult.meetsRequirement === true;
      return (
        meetsRequirement &&
        dsAdaptConclusion.regressions.length > 0 &&
        testRun.adapt.differencesAccepted === 'TBD'
      );
    }
  },
  regressionsAccepted() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    if (testRun) {
      return testRun.adapt.differencesAccepted === 'ACCEPTED';
    }
  },
  regressionsConfirmed() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    if (testRun) {
      return testRun.adapt.differencesAccepted === 'DENIED';
    }
  },
  comparisonType() {
    return this.comparisonType;
  },
  comparePreviousTestRun() {
    return this.comparisonType.toString() === 'compared-to-previous-test-run';
  },
  previousTestRunLink() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    if (testRun) {
      const previousTestRunId = getPreviousTestRun(testRun, true);
      if (previousTestRunId) {
        const previousTestRun = getTestRun(
          FlowRouter.current().queryParams.systemUnderTest,
          previousTestRunId,
        );
        if (previousTestRun) {
          const testRunUrl =
            '/test-run/' +
            previousTestRun.testRunId +
            '?systemUnderTest=' +
            previousTestRun.application +
            '&workload=' +
            previousTestRun.testType +
            '&testEnvironment=' +
            previousTestRun.testEnvironment;

          return new Spacebars.SafeString(
            `<a href='${testRunUrl}' target='_blank'>${previousTestRun.testRunId} <i class='fa fa-external-link'></i></a>`,
          );
        }
      }
    }
  },
  baselineTestRunLink() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    if (testRun) {
      const baselineTestRunId = getFixedBaselineTestRun(testRun);
      if (baselineTestRunId) {
        const baselineTestRun = getTestRun(
          FlowRouter.current().queryParams.systemUnderTest,
          baselineTestRunId,
        );
        if (baselineTestRun) {
          const testRunUrl =
            '/test-run/' +
            baselineTestRun.testRunId +
            '?systemUnderTest=' +
            baselineTestRun.application +
            '&workload=' +
            baselineTestRun.testType +
            '&testEnvironment=' +
            baselineTestRun.testEnvironment;

          return new Spacebars.SafeString(
            `<a href='${testRunUrl}' target='_blank'>${baselineTestRun.testRunId} <i class='fa fa-external-link'></i></a>`,
          );
        }
      }
    }
  },
  dsAdaptResultsSubscriptionReady() {
    return Template.instance().dsAdaptResultsSubscriptionReady.get();
  },
  metrics() {
    return (
      Template.instance().metrics.get().length > 0 &&
      Template.instance()
        .metrics.get()
        .sort(dynamicSortNested('-score.overall'))
    );
  },
  metricsDetected() {
    return Template.instance().metrics.get().length > 0;
  },
  redMetrics() {
    return Template.instance()
      .metrics.get()
      .filter((metric) => metric.category.indexOf('RED_') > -1)
      .sort(dynamicSortNested('-score.overall'));
  },
  metricsReady() {
    return Template.instance().metrics.get() !== undefined;
  },
  useMetrics() {
    return Template.instance()
      .metrics.get()
      .filter((metric) => metric.category.indexOf('USE_') > -1)
      .sort(dynamicSortNested('-score.overall'));
  },
  unclassifiedMetrics() {
    return Template.instance()
      .metrics.get()
      .filter(
        (metric) =>
          metric.category.indexOf('RED_') === -1 &&
          metric.category.indexOf('USE_') === -1,
      )
      .sort(dynamicSortNested('-score.overall'));
  },
  dataScienceCompareIframeUrl() {
    const dataScienceDashboardUrl =
      Meteor.settings.public.dataScienceDashboardUrl;
    const theme =
      Meteor.user().profile.theme ? Meteor.user().profile.theme : 'light';
    return `${dataScienceDashboardUrl}/?theme=${theme}&testRunId=${this.testRunId}&baselineRunId=${this.baseTestRunId}`;
  },
  conclusion() {
    return Template.instance().dsAdaptResultsQueryConclusion.get();
  },
});

Template.testRunDataScienceCompareResults.events({
  'change input#includeControlGroup'(event, template) {
    template.includeControlGroup.set(event.currentTarget.checked);
  },
  'click .process-pending-ds-compare-config-changes'(event, template) {
    event.preventDefault();

    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    if (testRun) {
      const includeControlGroup = template.includeControlGroup.get();

      Meteor.call(
        'processPendingDsCompareConfigChanges',
        testRun,
        includeControlGroup,
        (error) => {
          if (error) {
            window.toastr.clear();
            window.toastr['error'](error, 'Error');
          } else {
            window.toastr.clear();
            window.toastr['success'](
              'Processing ADAPT configuration changes, this might take a while',
              'Success',
            );

            const queryParams = {};

            if (Session.get('team')) queryParams['team'] = Session.get('team');
            if (Session.get('application'))
              queryParams['systemUnderTest'] = Session.get('application');
            if (Session.get('testEnvironment'))
              queryParams['testEnvironment'] = Session.get('testEnvironment');
            if (Session.get('testType'))
              queryParams['workload'] = Session.get('testType');

            FlowRouter.go('testRuns', null, queryParams);
          }
        },
      );
    }
  },
  'click #mark-as-regression '(event) {
    event.preventDefault();

    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    if (testRun) {
      Meteor.call('resolveRegression', testRun, 'DENIED', true, (error) => {
        if (error) {
          window.toastr.clear();
          window.toastr['error'](error, 'Error');
        } else {
          window.toastr.clear();
          window.toastr['success'](
            'Regression confirmed, test run excluded from control group',
            'Success',
          );
        }
      });
    }
  },

  'click #mark-as-variability'(event) {
    event.preventDefault();

    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    if (testRun) {
      Meteor.call('resolveRegression', testRun, 'ACCEPTED', true, (error) => {
        if (error) {
          window.toastr.clear();
          window.toastr['error'](error, 'Error');
        } else {
          window.toastr.clear();
          window.toastr['success'](
            'Regression marked as variability',
            'Success',
          );
        }
      });
    }
  },
  'mouseenter i#mark-as-regression-info'(event) {
    event.preventDefault();

    tippy('[data-tippy-content]', {
      theme: 'light-border',
    });
  },
  'click #show-improvements'(event, template) {
    event.preventDefault();
    template.metrics.set([]);
    template.dsAdaptResultsSubscriptionReady.set(false);
    template.dsAdaptResultsQueryConclusion.set('improvement');
    template.trackedRegressionSelected.set(false);
  },
  'click #show-unresolved-regression'(event, template) {
    event.preventDefault();
    template.metrics.set([]);
    template.dsAdaptResultsQueryConclusion.set(undefined);
    template.trackedRegressionSelected.set(true);
  },
  'click #show-regression'(event, template) {
    event.preventDefault();
    template.metrics.set([]);
    template.dsAdaptResultsSubscriptionReady.set(false);
    template.dsAdaptResultsQueryConclusion.set('regression');
    template.trackedRegressionSelected.set(false);
  },
  'click #show-no-difference'(event, template) {
    event.preventDefault();
    template.metrics.set([]);
    template.dsAdaptResultsSubscriptionReady.set(false);
    template.dsAdaptResultsQueryConclusion.set('no difference');
    template.trackedRegressionSelected.set(false);
  },
  'click #show-filtered'(event, template) {
    event.preventDefault();
    template.metrics.set([]);
    template.dsAdaptResultsSubscriptionReady.set(false);
    template.dsAdaptResultsQueryConclusion.set('filtered');
    template.trackedRegressionSelected.set(false);
  },
  'click #show-ignored'(event, template) {
    event.preventDefault();
    template.metrics.set([]);
    template.dsAdaptResultsSubscriptionReady.set(false);
    template.dsAdaptResultsQueryConclusion.set('ignored');
    template.trackedRegressionSelected.set(false);
  },
  'click #show-no-comparison'(event, template) {
    event.preventDefault();
    template.metrics.set([]);
    template.dsAdaptResultsSubscriptionReady.set(false);
    template.dsAdaptResultsQueryConclusion.set('incomparable');
    template.trackedRegressionSelected.set(false);
  },
  'click #show-all-metrics'(event, template) {
    event.preventDefault();
    template.metrics.set([]);
    template.dsAdaptResultsSubscriptionReady.set(false);
    template.dsAdaptResultsQueryConclusion.set('all');
    template.trackedRegressionSelected.set(false);
  },
  'click #reset-control-group'(event) {
    event.preventDefault();
    const testRunId = FlowRouter.current().params.testRunId;
    Meteor.call('resetControlGroup', testRunId, (err, result) => {
      if (result.error) {
        window.toastr.clear();
        window.toastr['error'](JSON.stringify(result.error), 'Error');
      } else {
        window.toastr.clear();
        window.toastr['success'](
          'Done!',
          'Control group has been reset to this test run! It is good practice to run some tests in baseline mode to improve the quality of the new control group.',
        );
      }
    });
  },
});

Template.testRunDataScienceCompareResultsRedTLDR.helpers({
  redMetrics() {
    return Template.currentData().metrics.sort(
      dynamicSortNested('-score.overall'),
    );
  },
  comparisonType() {
    return this.comparisonType;
  },
  conclusion() {
    return this.conclusion;
  },
});

Template.testRunDataScienceCompareResultsRedTLDRAccordion.onCreated(
  function testRunDataScienceCompareResultsRedTLDRAccordionOnCreated() {
    this.redRateMetricHeaderCollapsed = new ReactiveVar(true);
    this.redErrorsMetricHeaderCollapsed = new ReactiveVar(true);
    this.redDurationMetricHeaderCollapsed = new ReactiveVar(true);
    // this.showAllRedRateMetrics = new ReactiveVar(false);
    // this.showIgnoredRedRateMetrics = new ReactiveVar(false);
    // this.showAllRedErrorsMetrics = new ReactiveVar(false);
    // this.showIgnoredRedErrorsMetrics = new ReactiveVar(false);
    // this.showAllRedDurationMetrics = new ReactiveVar(false);
    // this.showIgnoredRedDurationMetrics = new ReactiveVar(false);
  },
);

Template.testRunDataScienceCompareResultsRedTLDRAccordion.helpers({
  // showAllRedRateMetrics(){
  //     return Template.instance().showAllRedRateMetrics.get();
  // },
  // showAllRedErrorsMetrics(){
  //     return Template.instance().showAllRedErrorsMetrics.get();
  // },
  // showAllRedDurationMetrics(){
  //     return Template.instance().showAllRedDurationMetrics.get();
  // },
  noChanges(metrics) {
    return metrics.length === 0;
  },
  redRateMetricHeaderCollapsed() {
    return Template.instance().redRateMetricHeaderCollapsed.get();
  },
  redErrorsMetricHeaderCollapsed() {
    return Template.instance().redErrorsMetricHeaderCollapsed.get();
  },
  redDurationMetricHeaderCollapsed() {
    return Template.instance().redDurationMetricHeaderCollapsed.get();
  },
  comparisonType() {
    return this.comparisonType;
  },
  redRateMetrics() {
    return Template.currentData()
      .redMetrics.filter((metric) => metric.category === 'RED_rate')
      .sort(dynamicSortNested('-score.overall'));
  },
  RED_rate_text() {
    const numberOfchangedMetrics = getNumberOfchangedMetricsWithRegression(
      this.redMetrics,
      'RED_rate',
    );
    return conclusionText(numberOfchangedMetrics, this.conclusion);
  },
  RED_rate_thresholdExceeded() {
    const numberOfchangedMetricsWithRegression =
      getNumberOfchangedMetricsWithRegression(this.redMetrics, 'RED_rate');
    return numberOfchangedMetricsWithRegression > 0;
  },
  redErrorsMetrics() {
    return Template.currentData()
      .redMetrics.filter((metric) => metric.category === 'RED_errors')
      .sort(dynamicSortNested('-score.overall'));
  },
  RED_errors_text() {
    const numberOfchangedMetrics = getNumberOfchangedMetricsWithRegression(
      this.redMetrics,
      'RED_errors',
    );
    return conclusionText(numberOfchangedMetrics, this.conclusion);
  },
  RED_errors_thresholdExceeded() {
    const numberOfchangedMetricsWithRegression =
      getNumberOfchangedMetricsWithRegression(this.redMetrics, 'RED_errors');
    return numberOfchangedMetricsWithRegression > 0;
  },
  redDurationMetrics() {
    return Template.currentData()
      .redMetrics.filter((metric) => metric.category === 'RED_duration')
      .sort(dynamicSortNested('-score.overall'));
  },
  RED_duration_text() {
    const numberOfchangedMetrics = getNumberOfchangedMetricsWithRegression(
      this.redMetrics,
      'RED_duration',
    );
    return conclusionText(numberOfchangedMetrics, this.conclusion);
  },
  RED_duration_thresholdExceeded() {
    const numberOfchangedMetricsWithRegression =
      getNumberOfchangedMetricsWithRegression(this.redMetrics, 'RED_duration');
    return numberOfchangedMetricsWithRegression > 0;
  },
  conclusionIsRegression() {
    return this.conclusion === 'regression';
  },
});

Template.testRunDataScienceCompareResultsRedTLDRAccordion.events({
  'shown.bs.collapse .red-rate'(event, template) {
    event.stopPropagation();

    template.redRateMetricHeaderCollapsed.set(false);
  },
  'hide.bs.collapse .red-rate'(event, template) {
    event.stopPropagation();

    template.redRateMetricHeaderCollapsed.set(true);
  },

  'shown.bs.collapse .red-errors'(event, template) {
    event.stopPropagation();

    template.redErrorsMetricHeaderCollapsed.set(false);
  },
  'hide.bs.collapse .red-errors'(event, template) {
    event.stopPropagation();

    template.redErrorsMetricHeaderCollapsed.set(true);
  },

  'shown.bs.collapse  .red-duration'(event, template) {
    event.stopPropagation();

    template.redDurationMetricHeaderCollapsed.set(false);
  },
  'hide.bs.collapse  .red-duration'(event, template) {
    event.stopPropagation();

    template.redDurationMetricHeaderCollapsed.set(true);
  },
});

Template.testRunDataScienceCompareResultsUseTLDR.helpers({
  useMetrics() {
    return Template.currentData().metrics.sort(
      dynamicSortNested('-score.overall'),
    );
  },
  comparisonType() {
    return this.comparisonType;
  },
});

Template.testRunDataScienceCompareResultsUnclassifiedTLDR.helpers({
  unclassifiedMetrics() {
    return Template.currentData().metrics.sort(
      dynamicSortNested('-score.overall'),
    );
  },
  comparisonType() {
    return this.comparisonType;
  },
  conclusion() {
    return this.conclusion;
  },
});

Template.testRunDataScienceCompareResultsUseTLDRAccordion.onCreated(
  function testRunDataScienceCompareResultsUseTLDRAccordionOnCreated() {
    this.useUsageMetricHeaderCollapsed = new ReactiveVar(true);
    this.useSaturationMetricHeaderCollapsed = new ReactiveVar(true);
    this.useErrorsMetricHeaderCollapsed = new ReactiveVar(true);
    // this.showAllUseUsageMetrics = new ReactiveVar(false);
    // this.showIgnoredUseUsageMetrics = new ReactiveVar(false);
    // this.showAllUseSaturationMetrics = new ReactiveVar(false);
    // this.showIgnoredUseSaturationMetrics = new ReactiveVar(false);
    // this.showAllUseErrorsMetrics = new ReactiveVar(false);
    // this.showIgnoredUseErrorsMetrics = new ReactiveVar(false);
  },
);

Template.testRunDataScienceCompareResultsUseTLDRAccordion.helpers({
  // showAllUseUsageMetrics(){
  //     return Template.instance().showAllUseUsageMetrics.get();
  // },
  // showAllUseSaturationMetrics(){
  //     return Template.instance().showAllUseSaturationMetrics.get();
  // },
  // showAllUseErrorsMetrics(){
  //     return Template.instance().showAllUseErrorsMetrics.get();
  // },
  noChanges(metrics) {
    return metrics.length === 0;
  },
  useUsageMetricHeaderCollapsed() {
    return Template.instance().useUsageMetricHeaderCollapsed.get();
  },
  useSaturationMetricHeaderCollapsed() {
    return Template.instance().useSaturationMetricHeaderCollapsed.get();
  },
  useErrorsMetricHeaderCollapsed() {
    return Template.instance().useErrorsMetricHeaderCollapsed.get();
  },
  comparisonType() {
    return this.comparisonType;
  },
  useUsageMetrics() {
    return Template.currentData()
      .useMetrics.filter((metric) => metric.category === 'USE_usage')
      .sort(dynamicSortNested('-score.overall'));
  },
  USE_usage_text() {
    const numberOfchangedMetrics = getNumberOfchangedMetricsWithRegression(
      this.useMetrics,
      'USE_usage',
    );
    return conclusionText(numberOfchangedMetrics, this.conclusion);
  },
  USE_usage_thresholdExceeded() {
    const numberOfchangedMetrics = getNumberOfchangedMetricsWithRegression(
      this.useMetrics,
      'USE_usage',
    );
    return numberOfchangedMetrics > 0;
  },
  useSaturationMetrics() {
    return Template.currentData()
      .useMetrics.filter((metric) => metric.category === 'USE_saturation')
      .sort(dynamicSortNested('-score.overall'));
  },
  USE_saturation_text() {
    const numberOfchangedMetrics = getNumberOfchangedMetricsWithRegression(
      this.useMetrics,
      'USE_saturation',
    );
    return conclusionText(numberOfchangedMetrics, this.conclusion);
  },
  USE_saturation_thresholdExceeded() {
    const numberOfchangedMetrics = getNumberOfchangedMetricsWithRegression(
      this.useMetrics,
      'USE_saturation',
    );
    return numberOfchangedMetrics > 0;
  },
  useErrorsMetrics() {
    return Template.currentData()
      .useMetrics.filter((metric) => metric.category === 'USE_errors')
      .sort(dynamicSortNested('-score.overall'));
  },
  USE_errors_text() {
    const numberOfchangedMetrics = getNumberOfchangedMetricsWithRegression(
      this.useMetrics,
      'USE_errors',
    );
    return conclusionText(numberOfchangedMetrics, this.conclusion);
  },
  USE_errors_thresholdExceeded() {
    const numberOfchangedMetrics = getNumberOfchangedMetricsWithRegression(
      this.useMetrics,
      'USE_errors',
    );
    return numberOfchangedMetrics > 0;
  },
  conclusionIsRegression() {
    return this.conclusion === 'regression';
  },
});

Template.testRunDataScienceCompareResultsUseTLDRAccordion.events({
  'shown.bs.collapse .use-usage'(event, template) {
    event.stopPropagation();

    template.useUsageMetricHeaderCollapsed.set(false);
  },
  'hide.bs.collapse .use-usage'(event, template) {
    event.stopPropagation();

    template.useUsageMetricHeaderCollapsed.set(true);
  },

  'shown.bs.collapse .use-saturation'(event, template) {
    event.stopPropagation();

    template.useSaturationMetricHeaderCollapsed.set(false);
  },
  'hide.bs.collapse .use-saturation'(event, template) {
    event.stopPropagation();

    template.useSaturationMetricHeaderCollapsed.set(true);
  },

  'shown.bs.collapse  .use-errors'(event, template) {
    event.stopPropagation();

    template.useErrorsMetricHeaderCollapsed.set(false);
  },
  'hide.bs.collapse  .use-errors'(event, template) {
    event.stopPropagation();

    template.useErrorsMetricHeaderCollapsed.set(true);
  },
});

Template.testRunDataScienceCompareResultsUnclassifiedAccordion.onCreated(
  function testRunDataScienceCompareResultsUnclassifiedAccordionOnCreated() {
    this.metricHeaderCollapsed = new ReactiveVar(true);
    // this.showAllUnclassifiedMetrics = new ReactiveVar(false);
    // this.showIgnoredUnclassifiedMetrics = new ReactiveVar(false);
  },
);

Template.testRunDataScienceCompareResultsUnclassifiedAccordion.helpers({
  comparisonType() {
    return this.comparisonType;
  },
  // showAllUnclassifiedMetrics(){
  //     return Template.instance().showAllUnclassifiedMetrics.get();
  // },
  noChanges(metrics) {
    return metrics.length === 0;
  },
  metricHeaderCollapsed() {
    return Template.instance().metricHeaderCollapsed.get();
  },
  unclassifiedMetrics() {
    return Template.currentData()
      .unclassifiedMetrics.filter((metric) => metric.category === 'UNKNOWN')
      .sort(dynamicSortNested('-score.overall'));
  },
  unclassifiedText() {
    const numberOfchangedMetrics = getNumberOfchangedMetricsWithRegression(
      this.unclassifiedMetrics,
      'UNKNOWN',
    );
    return conclusionText(numberOfchangedMetrics, this.conclusion);
  },
  conclusionIsRegression() {
    return this.conclusion === 'regression';
  },
});

Template.testRunDataScienceCompareResultsUnclassifiedAccordion.events({
  'shown.bs.collapse .metric-collapse'(event, template) {
    event.stopPropagation();

    template.metricHeaderCollapsed.set(false);
  },
  'hide.bs.collapse .metric-collapse'(event, template) {
    event.stopPropagation();

    template.metricHeaderCollapsed.set(true);
  },
  // 'change #show-unclassified-metrics'(event, template) {
  //     event.preventDefault();
  //     var selectedValue = event.currentTarget.value;
  //     if (selectedValue === 'regression') {
  //         template.showAllUnclassifiedMetrics.set(false);
  //     } else if (selectedValue === 'allMetrics') {
  //         template.showAllUnclassifiedMetrics.set(true);
  //     }
  //
  // },
});

Template.testRunDataScienceCompareResultsDetails.onCreated(
  function testRunDataScienceCompareResultsDetailsOnCreated() {
    this.showFilter = new ReactiveVar(
      this.data.metrics.length ? this.data.metrics.length > 10 : false,
    );
    this.metric = new ReactiveVar();
    this.dsCompareStatistics = new ReactiveVar();
    this.selectedMetricName = new ReactiveVar(
      this.data.metrics.length > 0 ?
        `${this.data.metrics.sort(dynamicSortNested('-score.overall'))[0].applicationDashboardId}${this.data.metrics.sort(dynamicSortNested('-score.overall'))[0].panelId}${this.data.metrics.sort(dynamicSortNested('-score.overall'))[0].metricName}`
      : '',
    );
    this.metrics = new ReactiveVar();
    this.activeHref = new ReactiveVar(`#overview`);
    this.autorun(() => {
      const metrics = Template.currentData().metrics;
      this.metrics.set(metrics);
      Template.instance().showFilter.set(
        this.metrics.get().length ? this.metrics.get().length > 10 : false,
      );
      const selectedMetricName = this.selectedMetricName.get();
      const metric = Template.currentData().metrics.find(
        (metric) =>
          `${metric.applicationDashboardId}${metric.panelId}${metric.metricName}` ===
          selectedMetricName,
      );
      if (metric) {
        this.metric.set(metric);

        Meteor.call('getDsCompareStatistics', metric, (err, response) => {
          if (response.error) {
            log.error(JSON.stringify(response.error));
          } else {
            this.dsCompareStatistics.set(response.data);
          }
        });
      }
    });
  },
);

Template.testRunDataScienceCompareResultsDetails.helpers({
  tabActive(href) {
    return Template.instance().activeHref.get() === href;
  },
  testRunId() {
    return FlowRouter.current().params.testRunId;
  },
  comparisonType() {
    return this.comparisonType;
  },
  metric() {
    if (Template.instance().metric) return Template.instance().metric.get();
    // if(metric) {
    //     return {dashboardPanelMetricName: `${metric.dashboardLabel}#${metric.applicationDashboardId}#${metric.panelId}#${metric.panelTitle}#${metric.metricName}`};
    // }
  },
  metricName() {
    if (Template.instance().metric)
      return Template.instance().metric.get().metricName;
  },
  dashboardLabel() {
    if (Template.instance().metric)
      return Template.instance().metric.get().dashboardLabel;
  },
  panelId() {
    if (Template.instance().metric)
      return Template.instance().metric.get().panelId;
  },
  panelTitle() {
    if (Template.instance().metric)
      return Template.instance().metric.get().panelTitle;
  },
  applicationDashboardId() {
    if (Template.instance().metric)
      return Template.instance().metric.get().applicationDashboardId;
  },

  selectedMetricName() {
    return Template.instance().selectedMetricName.get();
  },
  dsCompareStatistics() {
    return Template.instance().dsCompareStatistics.get();
  },

  rowClass() {
    if (Template.instance().selectedMetricName.get()) {
      return function (item) {
        // let rowClass = (item.ignore.ignore === true) ? 'ignored ' : '';
        let rowClass = '';

        if (
          `${item.applicationDashboardId}${item.panelId}${item.metricName}` ===
          this.templateData.selectedMetricName
        ) {
          rowClass += 'profile-selected';
        }
        return rowClass;
      };
    }
  },
  metrics() {
    return Template.instance()
      .metrics.get()
      .sort(dynamicSortNested('-score.overall'));
  },
  hasMetrics() {
    return Template.instance().metrics.get().length > 0;
  },
  fields() {
    return [
      {
        key: 'dashboardLabel',
        label: 'Dashboard',
        sortOrder: 0,
        sortDirection: 'ascending',
      },
      { key: 'panelTitle', label: 'Panel' },
      { key: 'metricName', label: 'Metric' },
      // { key: 'score.overall', label: 'Score', sortOrder: 0, sortDirection: 'descending'},
      {
        key: '_id',
        sortable: false,
        label: '',
        // cellClass: 'align-right-column',
        // headerClass: 'align-right-column',
        fn: (value, object) => {
          return new Spacebars.SafeString(getSettingsMenu(value._str, object));
        },
      },
    ];
  },
  showFilter() {
    return Template.instance().showFilter.get();
  },
  metricNameFilter() {
    return `${this.comparisonType}-${this.metricType}`;
  },
  settings() {
    return {
      rowsPerPage: 10,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      filters: [`${this.comparisonType}-${this.metricType}`],
    };
  },
});

Template.testRunDataScienceCompareResultsDetails.events({
  'click .nav-tabs.adapt-details  a'(event, template) {
    event.preventDefault();
    template.activeHref.set(event.currentTarget.getAttribute('href'));
  },

  'click #set-ignore'(event) {
    event.preventDefault();
    let source = 'dashboard';
    const metricName =
      event.currentTarget.getAttribute('metricName') !== undefined ?
        event.currentTarget.getAttribute('metricName')
      : null;
    const panelId =
      event.currentTarget.getAttribute('panelId') !== undefined ?
        event.currentTarget.getAttribute('panelId')
      : null;
    const panelTitle =
      event.currentTarget.getAttribute('panelTitle') !== undefined ?
        event.currentTarget.getAttribute('panelTitle')
      : null;
    const dashboardUid = event.currentTarget.getAttribute('dashboardUid');
    const dashboardLabel = event.currentTarget.getAttribute('dashboardLabel');
    const applicationDashboardId = event.currentTarget.getAttribute(
      'applicationDashboardId',
    );
    const dsCompareConfig = {
      application: FlowRouter.current().queryParams.systemUnderTest,
      testEnvironment: FlowRouter.current().queryParams.testEnvironment,
      testType: FlowRouter.current().queryParams.workload,
      dashboardUid: dashboardUid,
      dashboardLabel: dashboardLabel,
      applicationDashboardId: applicationDashboardId,
    };

    if (panelId !== null) {
      dsCompareConfig.panelId = parseInt(panelId);
      dsCompareConfig.panelTitle = panelTitle;
      source = 'panel';
    }
    if (metricName !== null) {
      dsCompareConfig.metricName = metricName;
      source = 'metric';
    }
    dsCompareConfig.ignore = {
      value: true,
      source: source,
    };

    Meteor.call(
      'updateDsCompareConfig',
      dsCompareConfig,
      FlowRouter.current().params.testRunId,
      source,
      (err, result) => {
        if (result.error) {
          window.toastr.clear();
          window.toastr['error'](JSON.stringify(result.error), 'Error');
        } else {
          window.toastr.clear();
          window.toastr['success']('Done!', 'Updated configuration!');
        }

        // noinspection JSCheckFunctionSignatures
        Modal.hide('updateThreshold');
      },
    );
  },
  'click #set-include'(event) {
    event.preventDefault();
    let source = 'dashboard';
    const metricName =
      event.currentTarget.getAttribute('metricName') !== undefined ?
        event.currentTarget.getAttribute('metricName')
      : null;
    const panelId =
      event.currentTarget.getAttribute('panelId') !== undefined ?
        event.currentTarget.getAttribute('panelId')
      : null;
    const panelTitle =
      event.currentTarget.getAttribute('panelTitle') !== undefined ?
        event.currentTarget.getAttribute('panelTitle')
      : null;
    const dashboardUid = event.currentTarget.getAttribute('dashboardUid');
    const dashboardLabel = event.currentTarget.getAttribute('dashboardLabel');
    const applicationDashboardId = event.currentTarget.getAttribute(
      'applicationDashboardId',
    );
    const dsCompareConfig = {
      application: FlowRouter.current().queryParams.systemUnderTest,
      testEnvironment: FlowRouter.current().queryParams.testEnvironment,
      testType: FlowRouter.current().queryParams.workload,
      dashboardUid: dashboardUid,
      dashboardLabel: dashboardLabel,
      applicationDashboardId: applicationDashboardId,
    };

    if (panelId !== null) {
      dsCompareConfig.panelId = parseInt(panelId);
      dsCompareConfig.panelTitle = panelTitle;
      source = 'panel';
    }
    if (metricName !== null) {
      dsCompareConfig.metricName = metricName;
      source = 'metric';
    }
    dsCompareConfig.ignore = {
      value: false,
      source: source,
    };

    Meteor.call(
      'updateDsCompareConfig',
      dsCompareConfig,
      FlowRouter.current().params.testRunId,
      source,
      (err, result) => {
        if (result.error) {
          window.toastr.clear();
          window.toastr['error'](JSON.stringify(result.error), 'Error');
        } else {
          window.toastr.clear();
          window.toastr['success']('Done!', 'Updated configuration!');
        }

        // noinspection JSCheckFunctionSignatures
        Modal.hide('updateThreshold');
      },
    );
  },
  'click #classify'(event) {
    event.preventDefault();
    const query = {
      $and: [
        { application: FlowRouter.current().queryParams.systemUnderTest },
        { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
        { testType: FlowRouter.current().queryParams.workload },
        {
          metricName:
            event.currentTarget.getAttribute('metricName') !== undefined ?
              event.currentTarget.getAttribute('metricName')
            : null,
        },
        {
          panelId:
            event.currentTarget.getAttribute('panelId') !== undefined ?
              parseInt(event.currentTarget.getAttribute('panelId'))
            : null,
        },
        {
          panelTitle:
            event.currentTarget.getAttribute('panelTitle') !== undefined ?
              event.currentTarget.getAttribute('panelTitle')
            : null,
        },
        { dashboardUid: event.currentTarget.getAttribute('dashboardUid') },
        { dashboardLabel: event.currentTarget.getAttribute('dashboardLabel') },
        {
          applicationDashboardId: event.currentTarget.getAttribute(
            'applicationDashboardId',
          ),
        },
      ],
    };

    Meteor.call(
      'getMetricClassification',
      query,
      (err, metricClassification) => {
        if (metricClassification.error) {
          log.error(JSON.stringify(metricClassification.error));
        } else {
          Modal.show('classification', {
            metricClassification: metricClassification.data,
          });
        }
      },
    );
  },
  'mouseenter .reactive-table tbody tr td i'(event) {
    event.preventDefault();

    tippy('[data-tippy-content]', {
      theme: 'light-border',
    });
  },
  'click .reactive-table tbody tr'(event) {
    event.preventDefault();

    if (event.target.classList.contains('difference-scores')) {
      return; // prevent from triggering if the user clicks on the difference scores reactive table
    }

    let dsComparisonMetricId;
    const ignoreScope = event.target.getAttribute('ignore-scope');
    const ignoreRule = event.target.getAttribute('ignore-rule');
    const ignoreMetricName = event.target.getAttribute('ignore-metric-name');

    switch (event.target.id) {
      case 'remove-ignore':
        dsComparisonMetricId = event.target.getAttribute(
          'dsComparisonMetricId',
        );

        Meteor.call(
          'deleteDsMetricComparisonIgnores',
          dsComparisonMetricId,
          ignoreScope,
          ignoreRule,
          ignoreMetricName,
          (err, dsMetricComparison) => {
            if (dsMetricComparison.error) {
              log.error(JSON.stringify(dsMetricComparison.error));
            }
          },
        );
        break;
      default:
        Template.instance().selectedMetricName.set(
          `${this.applicationDashboardId}${this.panelId}${this.metricName}`,
        );

        break;
    }
  },
});

Template.visualizeDifference.onRendered(
  function visualizeDifferenceOnRendered() {
    this.autorun(() => {
      const metricName = Template.currentData().metricName;
      const applicationDashboardId = this.data.applicationDashboardId;
      const panelId = parseInt(this.data.panelId);
      const panelYAxesFormat =
        this.data.panelYAxesFormat ? this.data.panelYAxesFormat : '';
      const showTitle = this.data.showTitle;
      const testRun = getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        FlowRouter.current().params.testRunId,
      );
      let compareBaselineTestRunId;
      const validateWithDefaultIfNoDataValue =
        this.data.validateWithDefaultIfNoDataValue;
      const targets = this.data.targets;
      const testRunIds = [testRun.testRunId];

      // check if the target has artificial
      const hasArtificalTarget =
        targets
          .filter((item) => {
            return item.target === metricName;
          })
          .filter((item) => {
            return (
              item.isBaselineArtificial === true ||
              item.isCurrentArtificial === true
            );
          }).length > 0;

      if (testRun) {
        if (this.data.comparisonType !== 'compared-to-selected-baseline') {
          if (this.data.comparisonType === 'compared-to-previous-test-run') {
            const previousTestRunId = getPreviousTestRun(testRun, true);
            if (previousTestRunId) {
              compareBaselineTestRunId = previousTestRunId;
            }
          } else {
            const baselineTestRunId = getFixedBaselineTestRun(testRun);
            if (baselineTestRunId) {
              compareBaselineTestRunId = baselineTestRunId;
            }
          }
        } else {
          compareBaselineTestRunId = this.data.baselineTestRunId;
        }

        if (compareBaselineTestRunId) {
          testRunIds.push(compareBaselineTestRunId);
          // this.autorun(() => {
          if (
            Meteor.subscribe(
              'dsMetrics',
              testRunIds,
              [panelId],
              applicationDashboardId,
            ).ready()
          ) {
            const dsMetricsPanel = DsMetrics.find({
              $and: [
                { testRunId: { $in: testRunIds } },
                { panelId: panelId },
                { applicationDashboardId: applicationDashboardId },
              ],
            }).fetch();

            if (dsMetricsPanel.length > 0 && !hasArtificalTarget) {
              createPlotlyGraph(
                dsMetricsPanel,
                metricName,
                applicationDashboardId,
                panelId,
                showTitle,
                testRun,
                compareBaselineTestRunId,
                panelYAxesFormat,
              );
            } else {
              if (hasArtificalTarget) {
                createPlotlyGraph(
                  dsMetricsPanel,
                  metricName,
                  applicationDashboardId,
                  panelId,
                  showTitle,
                  testRun,
                  compareBaselineTestRunId,
                  panelYAxesFormat,
                  validateWithDefaultIfNoDataValue,
                  targets,
                );
              } else {
                createPlotlyGraph(
                  [],
                  metricName,
                  applicationDashboardId,
                  panelId,
                  showTitle,
                  testRun,
                  compareBaselineTestRunId,
                  panelYAxesFormat,
                );
              }
            }
          }
          // })
        }
      }
    });
  },
);

const getNumberOfchangedMetricsWithRegression = (metrics, category) => {
  return metrics.filter((metric) => metric.category === category).length;
};

export const getSettingsMenu = (id, object) => {
  if (object.compareConfig.ignore.value === false) {
    return `<div class='testrun-menu'>
                <div class='dropdown btn-group'>
                    <i class='fa fa-bars dropdown-toggle' id='dropdownMenuIcon' data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'></i>
                    <ul class='dropdown-menu test-run-menu-lef' aria-labelledby='dropdownMenuIcon'>
                        <li class='dropdown-header'>Settings</li>
                        <li class='test-run-menu'><a id='classify' dsCompareResultId=${id} metricName='${object.metricName}' panelTitle='${object.panelTitle}' panelId=${object.panelId} dashboardUid=${object.dashboardUid} dashboardLabel='${object.dashboardLabel}'  applicationDashboardId=${object.applicationDashboardId}>Classify</a></li>
                        <li class='test-run-menu dropdown-submenu'>
                            <a id='ignore' tabindex='-1' >Exclude</a>
                            <ul class='dropdown-menu'>
                                <li><a tabindex='-1' href='#' id='set-ignore' dsCompareResultId=${id} metricName='${object.metricName}' panelTitle='${object.panelTitle}' panelId=${object.panelId} dashboardUid=${object.dashboardUid} dashboardLabel='${object.dashboardLabel}'  applicationDashboardId=${object.applicationDashboardId} >Metric</a></li>
                                <li><a tabindex='-1' href='#' id='set-ignore' dsCompareResultId=${id}  panelTitle='${object.panelTitle}' panelId=${object.panelId} dashboardUid=${object.dashboardUid} dashboardLabel='${object.dashboardLabel}'  applicationDashboardId=${object.applicationDashboardId} >All metrics in panel</a></li>
            <!--                    <li><a tabindex='-1' href='#' id='set-ignore' dsCompareResultId=${id} dashboardUid=${object.dashboardUid} dashboardLabel='${object.dashboardLabel}'  applicationDashboardId=${object.applicationDashboardId} >All metrics in dashboard</a></li>-->
                            </ul>
                        </li>
                    </ul>
                </div>
            </div>`;
  } else {
    return `<div class='testrun-menu'>
                <div class='dropdown btn-group'>
                    <i class='fa fa-bars dropdown-toggle' id='dropdownMenuIcon' data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'></i>
                    <ul class='dropdown-menu test-run-menu-lef' aria-labelledby='dropdownMenuIcon'>
                        <li class='dropdown-header'>Settings</li>
                        <li class='test-run-menu'><a id='classify' dsCompareResultId=${id} metricName='${object.metricName}' panelTitle='${object.panelTitle}' panelId=${object.panelId} dashboardUid=${object.dashboardUid} dashboardLabel='${object.dashboardLabel}'  applicationDashboardId=${object.applicationDashboardId}>Classify</a></li>
                        <li class='test-run-menu dropdown-submenu'>
                            <a id='ignore' tabindex='-1'>Include</a>
                            <ul class='dropdown-menu'>
                                <li><a tabindex='-1' href='#' id='set-include' dsCompareResultId=${id} metricName='${object.metricName}' panelTitle='${object.panelTitle}' panelId=${object.panelId} dashboardUid=${object.dashboardUid} dashboardLabel='${object.dashboardLabel}'  applicationDashboardId=${object.applicationDashboardId} >Metric</a></li>
                                <li><a tabindex='-1' href='#' id='set-include' dsCompareResultId=${id}  panelTitle='${object.panelTitle}' panelId=${object.panelId} dashboardUid=${object.dashboardUid} dashboardLabel='${object.dashboardLabel}'  applicationDashboardId=${object.applicationDashboardId} >All metrics in panel</a></li>
            <!--                    <li><a tabindex='-1' href='#' id='set-ignore' dsCompareResultId=${id} dashboardUid=${object.dashboardUid} dashboardLabel='${object.dashboardLabel}'  applicationDashboardId=${object.applicationDashboardId} >All metrics in dashboard</a></li>-->
                            </ul>
                        </li>
                    </ul>
                </div>
            </div>`;
  }
};

const conclusionText = (numberOfchangedMetrics, conclusion) => {
  const metricsText = numberOfchangedMetrics === 1 ? 'metric' : 'metrics';
  let conclusionText = '';
  switch (conclusion) {
    case 'regression':
      conclusionText = `Regression detected for ${numberOfchangedMetrics} ${metricsText}`;
      break;
    case 'improvement':
      conclusionText = `Improvement detected for ${numberOfchangedMetrics} ${metricsText}`;
      break;
    case 'no difference':
      conclusionText = `No significant differences detected for ${numberOfchangedMetrics} ${metricsText}`;
      break;
    case 'filtered':
      conclusionText = `${numberOfchangedMetrics} ${metricsText} not marked as regression because of non-default threshold set`;
      break;
    case 'incomparable':
      conclusionText = `Comparison not possible for ${numberOfchangedMetrics} ${metricsText}`;
      break;
    case 'ignored':
      conclusionText = `${numberOfchangedMetrics} ${metricsText} are excluded`;
      break;
    case 'all':
      conclusionText = `${numberOfchangedMetrics} ${metricsText}`;
      break;
  }
  let conclusionTextNoMetrics = '';
  switch (conclusion) {
    case 'regression':
      conclusionTextNoMetrics = `No metrics found with regression`;
      break;
    case 'improvement':
      conclusionTextNoMetrics = `No metrics found with improvement`;
      break;
    case 'no difference':
      conclusionTextNoMetrics = `No metrics found without significant differences`;
      break;
    case 'filtered':
      conclusionTextNoMetrics = `No metrics found`;
      break;
    case 'incomparable':
      conclusionTextNoMetrics = `No incomparable metrics found`;
      break;
    case 'all':
      conclusionTextNoMetrics = `No metrics found`;
      break;
  }
  if (numberOfchangedMetrics === 0) {
    return conclusionTextNoMetrics;
  } else {
    return conclusionText;
  }
};

const createPlotlyGraph = (
  dsMetricsPanel,
  metricName,
  applicationDashboardId,
  panelId,
  showTitle,
  testRun,
  compareBaselineTestRunId,
  panelYAxesFormat,
  validateWithDefaultIfNoDataValue,
  targets,
) => {
  const x = [];

  const y = [];

  const baselineX = [];

  const baselineY = [];
  let test;
  let baseline;
  let maxDataPointTest;
  let minDataPointTest;
  let maxDataPointBaseline;
  let minDataPointBaseline;

  const testRunPanels = [];

  const baselinePanels = [];
  let hasArtificalTestRun = false;
  let hasArtificalBaseline = false;

  const maxTimestep = (testRun.end.getTime() - testRun.start.getTime()) / 1000;

  if (targets) {
    hasArtificalTestRun =
      targets
        .filter((item) => {
          return item.target === metricName;
        })
        .filter((item) => {
          return item.isCurrentArtificial === true;
        }).length > 0;

    hasArtificalBaseline =
      targets
        .filter((item) => {
          return item.target === metricName;
        })
        .filter((item) => {
          return item.isBaselineArtificial === true;
        }).length > 0;
  }

  // sort by test run id
  dsMetricsPanel.forEach((metricPanel) => {
    if (metricPanel.testRunId === testRun.testRunId) {
      testRunPanels.push(metricPanel);
    } else {
      baselinePanels.push(metricPanel);
    }
  });

  if (validateWithDefaultIfNoDataValue !== undefined && hasArtificalTestRun) {
    x.push(0);
    y.push(validateWithDefaultIfNoDataValue);
    x.push(maxTimestep);
    y.push(validateWithDefaultIfNoDataValue);
  } else {
    testRunPanels.forEach((metricPanel) => {
      metricPanel.data.forEach((dataPoint) => {
        if (dataPoint.metricName === metricName) {
          if (
            dataPoint.value !== undefined &&
            dataPoint.value !== null &&
            dataPoint.timestep >= 0
          ) {
            // Track the maximum and minimum data point value
            if (
              maxDataPointTest === undefined ||
              dataPoint.value > maxDataPointTest
            ) {
              maxDataPointTest = dataPoint.value;
            }
            if (
              minDataPointTest === undefined ||
              dataPoint.value < minDataPointTest
            ) {
              minDataPointTest = dataPoint.value;
            }
            x.push(dataPoint.timestep);
            y.push(dataPoint.value);
          }
        }
      });
    });
  }

  if (validateWithDefaultIfNoDataValue !== undefined && hasArtificalBaseline) {
    baselineX.push(0);
    baselineY.push(validateWithDefaultIfNoDataValue);
    baselineX.push(maxTimestep);
    baselineY.push(validateWithDefaultIfNoDataValue);
  } else {
    baselinePanels.forEach((metricPanel) => {
      metricPanel.data.forEach((dataPoint) => {
        if (dataPoint.metricName === metricName) {
          if (
            dataPoint.value !== undefined &&
            dataPoint.value !== null &&
            dataPoint.timestep >= 0
          ) {
            // Track the maximum and minimum data point value
            if (
              maxDataPointBaseline === undefined ||
              dataPoint.value > maxDataPointBaseline
            ) {
              maxDataPointBaseline = dataPoint.value;
            }
            if (
              minDataPointBaseline === undefined ||
              dataPoint.value < minDataPointBaseline
            ) {
              minDataPointBaseline = dataPoint.value;
            }
            baselineX.push(dataPoint.timestep);
            baselineY.push(dataPoint.value);
          }
        }
      });
    });
  }

  // If unit is 'percentunit' convert to percentage
  if (panelYAxesFormat === 'percentunit') {
    y.forEach((item, index) => {
      y[index] = item * 100;
    });
    baselineY.forEach((item, index) => {
      baselineY[index] = item * 100;
    });
  }

  // If unit is 'seconds' and all data points are under 1, convert to 'ms'
  if (
    panelYAxesFormat === 's' &&
    maxDataPointTest < 1 &&
    maxDataPointBaseline < 1
  ) {
    y.forEach((item, index) => {
      y[index] = item * 1000;
    });
    baselineY.forEach((item, index) => {
      baselineY[index] = item * 1000;
    });
    panelYAxesFormat = 'ms';
  }
  // If unit is 'ms' and all data points are over 1000, convert to 'sec'
  else if (
    panelYAxesFormat === 'ms' &&
    minDataPointTest > 1000 &&
    minDataPointBaseline > 1000
  ) {
    y.forEach((item, index) => {
      y[index] = item / 1000;
    });
    baselineY.forEach((item, index) => {
      baselineY[index] = item / 1000;
    });
    panelYAxesFormat = 's';
  }

  let rectColor;
  let theme;

  const user = Meteor.user();

  if (user && user.profile.theme) {
    rectColor = user.profile.theme === 'dark' ? '#3D3E3FFF' : '#dde4ed';
    theme = user.profile.theme === 'dark' ? dark : light;
  }

  if (x.length === 1 && baselineX.length === 1) {
    test = {
      x: ['Baseline', 'Test run'],
      y: [baselineY[0], y[0]],
      type: 'bar',
      hovertemplate: `%{y} ${panelYAxesFormat === 'percentunit' ? '%' : panelYAxesFormat}<extra></extra>`,
      marker: {
        color: ['rgb(77,89,231)', 'rgba(222,45,38,0.8)'],
      },
    };

    const layout = {
      template: theme,
      title: showTitle ? `${metricName}` : '',
      yaxis: {
        title:
          panelYAxesFormat === 'short' ? ''
          : panelYAxesFormat === 'percentunit' ? '%'
          : panelYAxesFormat,
      },
      hovermode: false,
    };

    const data = [test];

    const sluggifiedMetricName = slugify(metricName);

    Plotly.newPlot(
      `line-chart-${applicationDashboardId}-${panelId}-${sluggifiedMetricName}`,
      data,
      layout,
      { displayModeBar: false },
    );
  } else {
    if (hasArtificalTestRun === true) {
      test = {
        name: 'Test (default value)',
        x: x,
        y: y,
        type: 'scatter',
        mode: 'lines',
        line: {
          dash: 'dash', // This line makes the trace dashed.
        },
        showlegend: true,
        hovertemplate: `%{y} ${panelYAxesFormat === 'percentunit' ? '%' : panelYAxesFormat}<extra></extra>`,
      };
    } else {
      test = {
        name: 'Test run',
        x: x,
        y: y,
        type: 'scatter',
        mode: 'lines+markers',
        hovertemplate: `%{y} ${panelYAxesFormat === 'percentunit' ? '%' : panelYAxesFormat}<extra></extra>`,
        connectgaps: true,
      };
    }

    if (hasArtificalBaseline === true) {
      baseline = {
        name: 'Baseline (default value)',
        x: baselineX,
        y: baselineY,
        type: 'scatter',
        mode: 'lines',
        line: {
          dash: 'dash', // This line makes the trace dashed.
        },
        showlegend: true,
        hovertemplate: `%{y} ${panelYAxesFormat === 'percentunit' ? '%' : panelYAxesFormat}<extra></extra>`,
      };
    } else {
      baseline = {
        name: 'Baseline',
        x: baselineX,
        y: baselineY,
        type: 'scatter',
        mode: 'lines+markers',
        hovertemplate: `%{y} ${panelYAxesFormat === 'percentunit' ? '%' : panelYAxesFormat}<extra></extra>`,
        connectgaps: true,
      };
    }

    const minXValue =
      Math.min(...test.x) < Math.min(...baseline.x) ?
        Math.min(...test.x)
      : Math.min(...baseline.x);
    const maxXValue =
      Math.max(...test.x) > Math.max(...baseline.x) ?
        Math.max(...test.x)
      : Math.max(...baseline.x);

    const layout = {
      template: theme,
      legend: {
        orientation: 'h',
        yanchor: 'bottom',
        y: 1.02,
        xanchor: 'left',
        x: 0,
      },
      xaxis: {
        range: [minXValue, maxXValue],
        showgrid: true, // grid lines are shown
        showline: true, // zero line is shown
        visible: true,
      },
      yaxis: {
        // range: [0, maxYValue * 1.1],
        rangemode: 'tozero',
        title:
          panelYAxesFormat === 'short' ? ''
          : panelYAxesFormat === 'percentunit' ? '%'
          : panelYAxesFormat,
        // showgrid: true, // grid lines are shown
        showline: true, // zero line is shown
        // gridcolor: gridcolor
        // visible: true,  // y-axis labels and ticks are shown
      },
      title:
        x.length === 0 && baselineX.length === 0 ? 'No data available'
        : showTitle ? `${metricName}`
        : '',
      hovermode: 'x',
      shapes: [
        {
          type: 'rect',
          x0: minXValue,
          y0: 0,
          x1: testRun.rampUp,
          y1: 1,
          yref: 'paper',
          line: { width: 0 },
          fillcolor: rectColor,
          layer: 'below',
        },
      ],
    };

    const data = [baseline, test];

    const sluggifiedMetricName = slugify(metricName);

    Plotly.react(
      `line-chart-${applicationDashboardId}-${panelId}-${sluggifiedMetricName}`,
      data,
      layout,
      { displayModeBar: false },
    );
  }
};
