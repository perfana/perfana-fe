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

import './testRunCompareResultsPreviousTestRun.html';
import { log } from '/both/logger';
import { CompareResults } from '/imports/collections/compareResults';
import { Applications } from '/imports/collections/applications';
import { ApplicationDashboards } from '/imports/collections/applicationDashboards';
import { TestRuns } from '/imports/collections/testruns';
import { Session } from 'meteor/session';
import { ReactiveVar } from 'meteor/reactive-var';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import {
  dynamicSortMultiple,
  getFixedBaselineTestRun,
  getPreviousTestRun,
  getTestRun,
} from '/imports/helpers/utils';
import { Benchmarks } from '/imports/collections/benchmarks';
import { Snapshots } from '/imports/collections/snapshots';
import _ from 'lodash';

Template.testRunCompareResultsPreviousTestRun.onCreated(
  function testRunCompareResultsPreviousTestRunOnCreated() {
    this.panels = new ReactiveVar([]);
    this.showFailedChecksOnly = new ReactiveVar(false);
    this.checkResultsFilter = new ReactiveVar();
    this.hasFailedChecks = new ReactiveVar(false);
    this.showPassedChecksDetails = new ReactiveVar(false);

    this.autorun(() => {
      if (
        Session.get('application') &&
        Session.get('testEnvironment') &&
        Session.get('testType') &&
        FlowRouter.current().params.testRunId
      ) {
        const query = {
          $and: [
            { application: Session.get('application') },
            { testEnvironment: Session.get('testEnvironment') },
            { testType: Session.get('testType') },
            { testRunId: FlowRouter.current().params.testRunId },
          ],
        };

        const benchmarksQuery = {
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

        const snapshotQuery = {
          $and: [
            { application: Session.get('application') },
            { testEnvironment: Session.get('testEnvironment') },
            { testType: Session.get('testType') },
            { testRunId: FlowRouter.current().params.testRunId },
            {
              $or: [{ status: 'COMPLETE' }, { status: 'ERROR' }],
            },
          ],
        };

        Meteor.subscribe(
          'checkResults',
          query,
          'testRunCompareResultsPreviousTestRun',
        );
        Meteor.subscribe('benchmarks', benchmarksQuery);
        Meteor.subscribe('compareResults', query);
        Meteor.subscribe('applicationDashboards', applicationDashboardQuery);
        Meteor.subscribe(
          'snapshots',
          snapshotQuery,
          'testRunCompareResultsPreviousTestRun',
        );
        Meteor.subscribe(
          'testRuns',
          'testRunCompareResultsPreviousTestRun',
          50,
          query,
          Session.get('team'),
        );
      }

      Meteor.subscribe('configuration');
      Meteor.subscribe('applications');

      // FlowRouter.watchPathChange();

      let previousTestRunCompareResults;

      const testRun = getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        FlowRouter.current().params.testRunId,
      );

      if (testRun) {
        /* previous test run */

        const baselineTestRunId = getFixedBaselineTestRun(testRun);
        const previousTestRunId = getPreviousTestRun(testRun, true);

        if (previousTestRunId) {
          previousTestRunCompareResults = CompareResults.find({
            $and: [
              { application: testRun.application },
              { testEnvironment: testRun.testEnvironment },
              { testType: testRun.testType },
              { testRunId: testRun.testRunId },
              { baselineTestRunId: previousTestRunId },
              { label: { $regex: 'Compared to previous test run.*' } },
              {
                $or: [{ status: 'COMPLETE' }, { status: 'ERROR' }],
              },
            ],
          }).fetch();
        }

        const panels = [];

        if (
          previousTestRunCompareResults !== undefined &&
          baselineTestRunId !== previousTestRunId
        ) {
          previousTestRunCompareResults.forEach((compareResult) => {
            const applicationDashboard = ApplicationDashboards.findOne({
              application: compareResult.application,
              testEnvironment: compareResult.testEnvironment,
              dashboardLabel: compareResult.dashboardLabel,
            });
            if (applicationDashboard) {
              const panel = {};
              panel.applicationDashboardId = applicationDashboard._id;
              panel.application = compareResult.application;
              panel.testEnvironment = compareResult.testEnvironment;
              panel.testType = compareResult.testType;
              panel.testRunId = compareResult.testRunId;
              panel.grafana = compareResult.grafana;
              panel.dashboardLabel = compareResult.dashboardLabel;
              panel.dashboardUid = compareResult.dashboardUid;
              panel.panelTitle = compareResult.panelTitle;
              panel.panelId = compareResult.panelId;
              panel.panelType = compareResult.panelType;
              panel.targets = compareResult.targets;
              panel.panelYAxesFormat = compareResult.panelYAxesFormat;
              panel.genericCheckId =
                compareResult.genericCheckId ?
                  compareResult.genericCheckId
                : undefined;
              panel.validateWithDefaultIfNoData =
                compareResult.validateWithDefaultIfNoData;
              panel.validateWithDefaultIfNoDataValue =
                compareResult.validateWithDefaultIfNoDataValue;
              panel.benchmarkId = compareResult.benchmarkId;
              // panel.snapshotId = compareResult.snapshotId;
              // panel.snapshotPanelUrl = compareResult.snapshotPanelUrl;
              // panel.snapshotKey = compareResult.snapshotKey;
              panel.excludeRampUpTime = compareResult.excludeRampUpTime;
              panel.rampUp = compareResult.rampUp;
              panel.averageAll = compareResult.averageAll;
              panel.evaluateType = compareResult.evaluateType;
              panel.matchPattern = compareResult.matchPattern;
              panel.meetsRequirement = compareResult.meetsRequirement;
              panel.requirement = compareResult.requirement;
              panel.benchmark = compareResult.benchmark;
              panel.previousTestRunCompareCheck = {};
              panel.previousTestRunCompareCheck.baselineTestRunId =
                compareResult.baselineTestRunId;
              panel.previousTestRunCompareCheck.benchmarkBaselineTestRunOK =
                compareResult.benchmarkBaselineTestRunOK;
              panel.previousTestRunCompareCheck.baselineSnapshotPanelUrl =
                compareResult.baselineSnapshotPanelUrl;
              panel.previousTestRunCompareCheck.label = compareResult.label;
              panel.previousTestRunCompareCheck.status = compareResult.status;
              panel.previousTestRunCompareCheck.message = compareResult.message;
              panel.previousTestRunCompareCheck.panelAverage =
                compareResult.panelAverage;
              panel.previousTestRunCompareCheck.benchmarkBaselineTestRunPanelAverage =
                compareResult.benchmarkBaselineTestRunPanelAverage;
              panel.previousTestRunCompareCheck.benchmarkBaselineTestRunPanelAverageDelta =
                compareResult.benchmarkBaselineTestRunPanelAverageDelta;
              panel.previousTestRunCompareCheck.benchmarkBaselineTestRunPanelAverageDeltaPct =
                compareResult.benchmarkBaselineTestRunPanelAverageDeltaPct;
              panel.previousTestRunCompareCheck.targets = compareResult.targets;

              if (
                panel.previousTestRunCompareCheck.benchmarkBaselineTestRunOK ===
                false
              ) {
                this.hasFailedChecks.set(true);
                this.showFailedChecksOnly.set(true);
              }

              panels.push(panel);
            }
          });
        }

        this.panels.set(panels);
      }
    });
  },
);

Template.testRunCompareResultsPreviousTestRun.helpers({
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
            `<a href="${testRunUrl}" target="_blank">${previousTestRun.testRunId} <i class="fa fa-external-link"></i></a>`,
          );
        }
      }
    }
  },

  checkResultsFilter() {
    return Template.instance().checkResultsFilter.get();
  },
  hasFailedChecks() {
    return Template.instance().hasFailedChecks.get();
  },
  showFilter() {
    return (
      Template.instance().panels.get() &&
      Template.instance().panels.get().length > 0 &&
      (Template.instance().showPassedChecksDetails.get() ||
        Template.instance().hasFailedChecks.get())
    );
  },
  showPassedChecksDetails() {
    return Template.instance().showPassedChecksDetails.get();
  },
  showFailedChecksOnly() {
    return Template.instance().showFailedChecksOnly.get();
  },
  isInProgress() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const snapshotsComplete =
        testRun.status &&
        (testRun.status.creatingSnapshots === 'COMPLETE' ||
          testRun.status.creatingSnapshots === 'ERROR');
      const checkResultsComplete =
        testRun.status &&
        (testRun.status.evaluatingChecks === 'COMPLETE' ||
          testRun.status.evaluatingChecks === 'ERROR' ||
          testRun.status.evaluatingChecks === 'NOT_CONFIGURED');
      const compareResultsComplete =
        testRun.status &&
        (testRun.status.evaluatingComparisons === 'COMPLETE' ||
          testRun.status.evaluatingComparisons === 'ERROR' ||
          testRun.status.evaluatingComparisons === 'NOT_CONFIGURED' ||
          testRun.status.evaluatingComparisons === 'NO_BASELINES_FOUND');

      return (
        !snapshotsComplete || !checkResultsComplete || !compareResultsComplete
      );
    }
  },
  hasErrors() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const snapshotsError =
        testRun.status && testRun.status.creatingSnapshots === 'ERROR';
      const checkResultsError =
        testRun.status && testRun.status.evaluatingChecks === 'ERROR';
      const compareResultsError =
        (testRun.status && testRun.status.evaluatingComparisons === 'ERROR') ||
        testRun.status.evaluatingComparisons === 'NO_BASELINES_FOUND';

      return snapshotsError || checkResultsError || compareResultsError;
    }
  },
  hasSnapshots() {
    const snapshots = Snapshots.find({
      $and: [
        { application: Session.get('application') },
        { testEnvironment: Session.get('testEnvironment') },
        { testType: Session.get('testType') },
        { testRunId: FlowRouter.current().params.testRunId },
        {
          $or: [{ status: 'COMPLETE' }, { status: 'ERROR' }],
        },
      ],
    });

    if (snapshots) return snapshots.fetch().length > 0;
  },
  hasPanels() {
    return (
      Template.instance().panels.get() &&
      Template.instance().panels.get().length > 0
    );
  },
  hasChecks() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const benchmarks = Benchmarks.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
          { 'panel.benchmark.operator': { $exists: true } },
        ],
      }).fetch();

      return benchmarks.length > 0;
    }
  },

  panels() {
    if (Template.instance().showFailedChecksOnly.get()) {
      const failedChecks = Template.instance()
        .panels.get()
        .filter((panel) => {
          return (
            panel.previousTestRunCompareCheck &&
            panel.previousTestRunCompareCheck.benchmarkBaselineTestRunOK !==
              undefined &&
            panel.previousTestRunCompareCheck.benchmarkBaselineTestRunOK ===
              false
          );
        })
        .sort(dynamicSortMultiple('dashboardLabel', 'panelTitle'));
      if (
        Template.instance().checkResultsFilter.get() &&
        Template.instance().checkResultsFilter.get() !== ''
      ) {
        return failedChecks
          .filter((panel) => {
            return (
              panel.panelTitle
                .toLowerCase()
                .indexOf(
                  Template.instance().checkResultsFilter.get().toLowerCase(),
                ) !== -1 ||
              panel.dashboardLabel
                .toLowerCase()
                .indexOf(
                  Template.instance().checkResultsFilter.get().toLowerCase(),
                ) !== -1
            );
          })
          .sort(dynamicSortMultiple('dashboardLabel', 'panelTitle'));
      } else {
        return failedChecks.sort(
          dynamicSortMultiple('dashboardLabel', 'panelTitle'),
        );
      }
    } else {
      if (
        Template.instance().checkResultsFilter.get() &&
        Template.instance().checkResultsFilter.get() !== ''
      ) {
        return Template.instance()
          .panels.get()
          .filter((panel) => {
            return (
              panel.panelTitle
                .toLowerCase()
                .indexOf(
                  Template.instance().checkResultsFilter.get().toLowerCase(),
                ) !== -1 ||
              panel.dashboardLabel
                .toLowerCase()
                .indexOf(
                  Template.instance().checkResultsFilter.get().toLowerCase(),
                ) !== -1
            );
          })
          .sort(dynamicSortMultiple('dashboardLabel', 'panelTitle'));
      } else {
        return Template.instance()
          .panels.get()
          .sort(dynamicSortMultiple('dashboardLabel', 'panelTitle'));
      }
    }
  },
  baselineRelease() {
    const testRun = this.testRun;

    if (
      testRun.benchmarks &&
      testRun.benchmarks.dashboards.length > 0 &&
      _.has(testRun.benchmarks, 'baselineTestRun')
    ) {
      const baselineTestRun = TestRuns.findOne({
        $and: [
          { application: testRun.application },
          { testType: testRun.testType },
          { testEnvironment: testRun.testEnvironment },
          { testRunId: testRun.benchmarks.baselineTestRun },
        ],
      });

      return baselineTestRun.applicationRelease;
    }
  },
});

Template.testRunCompareResultsPreviousTestRun.events({
  'click .go-to-manage-tab'(event) {
    event.preventDefault();
    const params = { testRunId: FlowRouter.current().params.testRunId };
    const queryParams = {
      systemUnderTest: FlowRouter.current().queryParams.systemUnderTest,
      workload: FlowRouter.current().queryParams.workload,
      testEnvironment: FlowRouter.current().queryParams.testEnvironment,
      tab: 'manage',
    };

    BlazeLayout.reset();
    FlowRouter.go('testRunSummary', params, queryParams);
  },
  'click a#evaluate-checks'(event) {
    event.preventDefault();

    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      Meteor.call('updateChecksForTestRun', testRun, (err) => {
        if (err) {
          window.toastr.clear();
          window.toastr['error'](err.reason, 'Error');
        } else {
          window.toastr.clear();
          window.toastr['success']('Done!', 'Updated test run checks');
        }
      });
    }
  },
  'click .open-kpi-tab'(event) {
    event.preventDefault();

    const queryParams = {};
    queryParams['systemUnderTest'] =
      FlowRouter.current().queryParams.systemUnderTest;
    queryParams['workload'] = FlowRouter.current().queryParams.workload;
    queryParams['testEnvironment'] =
      FlowRouter.current().queryParams.testEnvironment;

    FlowRouter.go('keyMetrics', null, queryParams);
  },
  'click a#create-snapshots'(event) {
    event.preventDefault();
    // event.target.innerHTML = '<i class="fa fa-spinner fa-spin" aria-hidden="true"></i>';

    toastr['info']('This might take a while', 'Creating snapshots');

    Meteor.call(
      'createSnapshots',
      getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        FlowRouter.current().params.testRunId,
      ),
      (error) => {
        if (error) toastr['error'](error.reason, 'Error');
      },
    );
  },
  'change input#showFailedChecksOnly'(event, template) {
    template.showFailedChecksOnly.set(event.currentTarget.checked);
    $('[id^="dashboard-accordion-"]')
      .filter('.panel-collapse.collapse')
      .collapse('hide');
  },
  'change input#showPassedChecksDetails'(event, template) {
    template.showPassedChecksDetails.set(event.currentTarget.checked);
  },
  'click #show-check-details'(event, template) {
    template.showPassedChecksDetails.set(true);
  },
  'keyup #check-results-filter'(event, template) {
    template.checkResultsFilter.set(event.target.value);
  },
  'click span#clear-check-results-filter'(event, template) {
    template.checkResultsFilter.set('');
  },
  'mouseenter i#previous-test-run-info'(event) {
    event.preventDefault();

    tippy('[data-tippy-content]', {
      theme: 'light-border',
    });
  },
});

Template.testRunCompareResultsPreviousTestRunAccordion.onCreated(
  function testRunCompareResultsPreviousTestRunAccordion() {
    this.metricHeaderCollapsed = new ReactiveVar(true);
    this.userHasPermissionForApplication = new ReactiveVar(false);

    Meteor.subscribe(
      'applications',
      {},
      {
        onReady: () => {
          const application = Applications.findOne({
            name: FlowRouter.current().queryParams.systemUnderTest,
          });

          if (application) {
            Meteor.call(
              'userHasPermissionForApplication',
              application.name,
              (err, result) => {
                if (result.error) {
                  log.error(JSON.stringify(result.error));
                } else {
                  this.userHasPermissionForApplication.set(result.data);
                }
              },
            );
          }
        },
      },
    );
  },
);

Template.testRunCompareResultsPreviousTestRunAccordion.onRendered(
  function testRunCompareResultsPreviousTestRunOnRendered() {
    // Meteor.setTimeout(() => {
    //
    //     if((this.data.requirementsCheck && this.data.requirementsCheck.meetsRequirement === false) || (this.data.previousTestRunCompareCheck && this.data.previousTestRunCompareCheck.benchmarkBaselineTestRunOK === false) || (this.data.fixedBaselineTestRunCompareCheck && this.data.fixedBaselineTestRunCompareCheck.benchmarkBaselineTestRunOK === false) ){
    //
    //
    //         let dashboardLabelSlug = slugify(this.data.dashboardLabel);
    //         let selector = `#dashboard-accordion-${dashboardLabelSlug}-${this.data.dashboardUid}-${this.data.panelId}-${this.data.benchmarkId}.panel-collapse.collapse`
    //
    //         $(selector).collapse('show');
    //
    //     }
    // }, 500)
  },
);

Template.testRunCompareResultsPreviousTestRunAccordion.helpers({
  themeSnapshotPanelUrl(url) {
    const user = Meteor.user();

    if (user && url)
      return url.replace(/theme=(dark|light)/, `theme=${user.profile.theme}`);
  },
  metricHeaderCollapsed() {
    return Template.instance().metricHeaderCollapsed.get();
  },
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
  isGenericCheck() {
    const user = Meteor.user();

    if (user)
      return (
        this.genericCheckId !== undefined &&
        !(
          Roles.userHasRole(user._id, 'admin') ||
          Roles.userHasRole(user._id, 'super-admin')
        )
      );
  },
  resultsOK(panel) {
    return !(
      (panel.requirementsCheck &&
        panel.requirementsCheck.meetsRequirement === false) ||
      (panel.previousTestRunCompareCheck &&
        panel.previousTestRunCompareCheck.benchmarkBaselineTestRunOK ===
          false) ||
      (panel.fixedBaselineTestRunCompareCheck &&
        panel.fixedBaselineTestRunCompareCheck.benchmarkBaselineTestRunOK ===
          false)
    );
  },
  panelHasError(panel) {
    return !!(
      (panel.requirementsCheck && panel.requirementsCheck.status === 'ERROR') ||
      (panel.previousTestRunCompareCheck &&
        panel.previousTestRunCompareCheck.status === 'ERROR') ||
      (panel.fixedBaselineTestRunCompareCheck &&
        panel.fixedBaselineTestRunCompareCheck.status === 'ERROR')
    );
  },
});

Template.testRunCompareResultsPreviousTestRunAccordion.events({
  'shown.bs.collapse .metric-collapse'(event, template) {
    template.metricHeaderCollapsed.set(false);
  },
  'hide.bs.collapse .metric-collapse'(event, template) {
    template.metricHeaderCollapsed.set(true);
  },

  'click #view-benchmark-modal'(event, template) {
    event.preventDefault();

    const graphModalParams = {
      panelId:
        template.$(event.target).attr('panel-id') ?
          template.$(event.target).attr('panel-id')
        : template.$(event.target).children('.fa-eye').attr('panel-id'),
      dashboardUid:
        template.$(event.target).attr('dashboard-uid') ?
          template.$(event.target).attr('dashboard-uid')
        : template.$(event.target).children('.fa-eye').attr('dashboard-uid'),
      dashboardLabel:
        template.$(event.target).attr('dashboard-label') ?
          template.$(event.target).attr('dashboard-label')
        : template.$(event.target).children('.fa-eye').attr('dashboard-label'),
      grafana:
        template.$(event.target).attr('grafana') ?
          template.$(event.target).attr('grafana')
        : template.$(event.target).children('.fa-eye').attr('grafana'),
      snapshotUrl:
        template.$(event.target).attr('snapshot-url') ?
          template.$(event.target).attr('snapshot-url')
        : template.$(event.target).children('.fa-eye').attr('snapshot-url'),
      baselineTestRunId:
        template.$(event.target).attr('baseline-testrun-id') ?
          template.$(event.target).attr('baseline-testrun-id')
        : template
            .$(event.target)
            .children('.fa-eye')
            .attr('baseline-testrun-id'),
      snapshotPanelUrl:
        template.$(event.target).attr('snapshot-panel-url') ?
          template.$(event.target).attr('snapshot-panel-url')
        : template
            .$(event.target)
            .children('.fa-eye')
            .attr('snapshot-panel-url'),
      baselineSnapshotPanelUrl:
        template.$(event.target).attr('baseline-snapshot-panel-url') ?
          template.$(event.target).attr('baseline-snapshot-panel-url')
        : template
            .$(event.target)
            .children('.fa-eye')
            .attr('baseline-snapshot-panel-url'),
    };

    Modal.show('benchmarkGraphModal', graphModalParams);
  },
  'click #edit-benchmark': function () {
    const benchmark = Benchmarks.findOne({
      _id: this.benchmarkId,
    });

    const afAtts = {};

    afAtts['type'] = 'method-update';
    afAtts['meteormethod'] = 'updateBenchmark';
    afAtts['id'] = 'editBenchmarks';
    afAtts['schema'] = 'BenchmarkSchema';
    afAtts['collection'] = 'Benchmarks';
    afAtts['buttonContent'] = 'Update';
    afAtts['backdrop'] = 'static';

    AutoForm.addHooks(
      afAtts['id'],
      {
        onSuccess: function () {
          // noinspection JSCheckFunctionSignatures
          Modal.hide('afModalWindow');
        },
      },
      false,
    );

    Modal.show('afModalWindow', {
      title: 'Update service level indicator',
      dialogClass: '',
      afAtts: afAtts,
      operation: 'update',
      collection: 'Benchmarks',
      doc: benchmark,
      backdrop: afAtts['backdrop'],
    });
  },
  'click #filter-series': function () {
    event.preventDefault();
    event.stopImmediatePropagation();
    const benchmark = Benchmarks.findOne({
      _id: this.benchmarkId,
    });

    if (benchmark) {
      Modal.show('filterSeriesModal', benchmark);
    }
  },
});

Template.testRunCompareResultsPreviousTestRunDetails.onRendered(
  function testRunCheckResultDetailsOnRendered() {
    $('.no-map-scroll').click(function () {
      $('.click-map').removeClass('click-map');
    });
  },
);

Template.testRunCompareResultsPreviousTestRunDetails.helpers({
  selectedMetricName() {
    return this.panel.previousTestRunCompareCheck.targets[0].target;
  },
  hasSnapshotPanelUrl() {
    return (
      this.panel.snapshotKey !== undefined &&
      this.panel.snapshotPanelUrl !== undefined
    );
  },
  themeSnapshotPanelUrl(url) {
    const user = Meteor.user();

    if (user && url)
      return url.replace(/theme=(dark|light)/, `theme=${user.profile.theme}`);
  },
  testRunPanelHasRequirements() {
    return this.panel.requirementsCheck !== undefined;
  },
  notTable() {
    return (
      this.panel.panelType !== 'table' && this.panel.panelType !== 'table-old'
    );
  },
  testRunPanelHasComparisonPreviousTestRunResults() {
    return this.panel.previousTestRunCompareCheck !== undefined;
  },
  testRunPanelHasComparisonBaselineTestRunResults() {
    return this.panel.fixedBaselineTestRunCompareCheck !== undefined;
  },
  baselineTestRunLink() {
    const baselineTestRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      this.panel.fixedBaselineTestRunCompareCheck.baselineTestRunId,
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
        `<a href="${testRunUrl}" target="_blank">${baselineTestRun.testRunId}, ${baselineTestRun.applicationRelease}</a>`,
      );
    }
  },
  testRunExpired() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      return testRun.expired === true;
    }
  },
});
