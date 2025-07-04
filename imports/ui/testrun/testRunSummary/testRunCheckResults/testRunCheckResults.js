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
import { log } from '/both/logger';
import './testRunCheckResults.html';
import './testRunRequirementsDetails';
import { CheckResults } from '/imports/collections/checkResults';
import { ApplicationDashboards } from '/imports/collections/applicationDashboards';
import { Applications } from '/imports/collections/applications';
import { TestRuns } from '/imports/collections/testruns';
import { Session } from 'meteor/session';
import { ReactiveVar } from 'meteor/reactive-var';

import {
  dynamicSortMultiple,
  getTestRun,
  slugify,
} from '/imports/helpers/utils';
import { Benchmarks } from '/imports/collections/benchmarks';
import { Snapshots } from '/imports/collections/snapshots';
import { DsMetrics } from '/imports/collections/dsMetrics';
import Plotly from 'plotly.js-dist';
import { light } from '/imports/helpers/plotly_light_template';
import { dark } from '/imports/helpers/plotly_dark_template';
import _ from 'lodash';

Template.testRunCheckResults.onCreated(function testRunCheckResultsOnCreated() {
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

      const applicationDashboardQuery = {
        $and: [
          { application: Session.get('application') },
          { testEnvironment: Session.get('testEnvironment') },
        ],
      };

      const benchmarksQuery = {
        $and: [
          { application: Session.get('application') },
          { testEnvironment: Session.get('testEnvironment') },
          { testType: Session.get('testType') },
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

      Meteor.subscribe('checkResults', query, 'testRunCheckResults');
      Meteor.subscribe('benchmarks', benchmarksQuery);
      Meteor.subscribe('applicationDashboards', applicationDashboardQuery);
      Meteor.subscribe('compareResults', query);
      Meteor.subscribe('snapshots', snapshotQuery, 'testRunCheckResults');
      Meteor.subscribe(
        'testRuns',
        'testRunCheckResults',
        50,
        query,
        Session.get('team'),
      );
    }

    Meteor.subscribe('configuration');
    Meteor.subscribe('applications');

    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const checkResults = CheckResults.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
          { testRunId: testRun.testRunId },
          { 'requirement.operator': { $exists: true } },
          {
            $or: [{ status: 'COMPLETE' }, { status: 'ERROR' }],
          },
        ],
      }).fetch();

      const panels = [];

      checkResults.forEach((checkResult) => {
        // let dataRetention = getDataRetention(checkResult);
        // let showSnapShot = new Date().getTime() - new Date(testRun.end).getTime() > (dataRetention * 1000);
        const applicationDashboard = ApplicationDashboards.findOne({
          application: checkResult.application,
          testEnvironment: checkResult.testEnvironment,
          dashboardLabel: checkResult.dashboardLabel,
        });

        if (applicationDashboard) {
          const panel = {};
          panel.applicationDashboardId = applicationDashboard._id;
          panel.application = checkResult.application;
          panel.testEnvironment = checkResult.testEnvironment;
          panel.testType = checkResult.testType;
          panel.testRunId = checkResult.testRunId;
          panel.grafana = checkResult.grafana;
          panel.dashboardLabel = checkResult.dashboardLabel;
          panel.dashboardUid = checkResult.dashboardUid;
          panel.panelTitle = checkResult.panelTitle;
          panel.panelId = checkResult.panelId;
          panel.panelType = checkResult.panelType;
          panel.panelYAxesFormat = checkResult.panelYAxesFormat;
          panel.genericCheckId =
            checkResult.genericCheckId ? checkResult.genericCheckId : undefined;
          panel.validateWithDefaultIfNoData =
            checkResult.validateWithDefaultIfNoData;
          panel.validateWithDefaultIfNoDataValue =
            checkResult.validateWithDefaultIfNoDataValue;
          panel.targets = checkResult.targets;
          panel.benchmarkId = checkResult.benchmarkId;
          // panel.snapshotId = checkResult.snapshotId;
          // panel.snapshotPanelUrl = showSnapShot ? checkResult.snapshotPanelUrl : renderGrafanaPanelSoloUrl(testRun, checkResult.dashboardLabel, checkResult.grafana, checkResult.dashboardUid, checkResult.panelId )
          // panel.snapshotPanelUrl = checkResult.snapshotPanelUrl;
          // panel.snapshotKey = checkResult.snapshotKey;
          panel.excludeRampUpTime = checkResult.excludeRampUpTime;
          panel.rampUp = checkResult.rampUp;
          panel.averageAll = checkResult.averageAll;
          panel.evaluateType = checkResult.evaluateType;
          panel.matchPattern = checkResult.matchPattern;
          panel.meetsRequirement = checkResult.meetsRequirement;
          panel.requirement = checkResult.requirement;
          panel.benchmark = checkResult.benchmark;
          panel.requirementsCheck = {};
          panel.requirementsCheck.meetsRequirement =
            checkResult.meetsRequirement;
          panel.requirementsCheck.panelAverage =
            checkResult.panelAverage ? checkResult.panelAverage : undefined;
          panel.requirementsCheck.status = checkResult.status;
          panel.requirementsCheck.message = checkResult.message;
          panel.requirementsCheck.targets = checkResult.targets;

          if (panel.requirementsCheck.meetsRequirement === false) {
            this.hasFailedChecks.set(true);
            this.showFailedChecksOnly.set(true);
          }
          panels.push(panel);
        }
      });

      this.panels.set(panels);
    }
  });
});

Template.testRunCheckResults.helpers({
  checkResultsFilter() {
    return Template.instance().checkResultsFilter.get();
  },
  hasFailedChecks() {
    return Template.instance().hasFailedChecks.get();
  },
  showFailedChecksOnly() {
    return Template.instance().showFailedChecksOnly.get();
  },
  showPassedChecksDetails() {
    return Template.instance().showPassedChecksDetails.get();
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
  showFilter() {
    return (
      Template.instance().panels.get() &&
      Template.instance().panels.get().length > 0 &&
      (Template.instance().showPassedChecksDetails.get() ||
        Template.instance().hasFailedChecks.get())
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
          { 'panel.requirement.operator': { $exists: true } },
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
            panel.requirementsCheck &&
            panel.requirementsCheck.meetsRequirement !== undefined &&
            panel.requirementsCheck.meetsRequirement === false
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

Template.testRunCheckResults.events({
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
});

Template.testRunCheckResultsAccordion.onCreated(
  function testRunCheckResultsAccordion() {
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

Template.testRunCheckResultsAccordion.onRendered(
  function testRunCheckResultsOnRendered() {
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

Template.testRunCheckResultsAccordion.helpers({
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

Template.testRunCheckResultsAccordion.events({
  'shown.bs.collapse .metric-collapse'(event, template) {
    template.metricHeaderCollapsed.set(false);
  },
  'hide.bs.collapse .metric-collapse'(event, template) {
    template.metricHeaderCollapsed.set(true);
  },
  'click div .view-benchmark-modal'(event, template) {
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

Template.testRunCheckResultsDetails.onRendered(
  function testRunCheckResultDetailsOnRendered() {
    // $('.prevent-iframe-scroll')
    //     //you can add your own selector
    //     .click(function(){
    //         //apply function when click on iframe
    //         $(this).find('iframe').addClass('clicked')})
    //     //apply class clicked
    //     .mouseleave(function(){
    //         //apply when mouse leave the iframe
    //         $(this).find('iframe').removeClass('clicked')}); //remove class clicked
    // });

    $('.no-map-scroll').click(function () {
      $('.click-map').removeClass('click-map');
    });
  },
);

Template.testRunCheckResultsDetails.helpers({
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
  previousTestRunLink() {
    const previousTestRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      this.panel.previousTestRunCompareCheck.baselineTestRunId,
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
        `<a href="${testRunUrl}" target="_blank">${previousTestRun.testRunId}, ${previousTestRun.applicationRelease}</a>`,
      );
    }
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

Template.visualizePanelMetrics.onRendered(
  function visualizeDifferenceOnRendered() {
    this.autorun(() => {
      const metricName = Template.currentData().metricName;
      const applicationDashboardId = this.data.applicationDashboardId;
      let requirementValue = this.data.requirementValue;
      const panelYAxesFormat =
        this.data.panelYAxesFormat ? this.data.panelYAxesFormat : '';
      const panelId = parseInt(this.data.panelId);
      const validateWithDefaultIfNoDataValue =
        this.data.validateWithDefaultIfNoDataValue;
      const targets = this.data.targets;
      const showTitle = this.data.showTitle;

      // check if the target has artificial
      const hasArtificalTarget =
        targets
          .filter((item) => {
            return item.target === metricName;
          })
          .filter((item) => {
            return item.isArtificial;
          }).length > 0;

      // set the requirement value
      requirementValue =
        panelYAxesFormat === 'percentunit' ?
          requirementValue * 100
        : requirementValue;

      // this.autorun(() => {
      const testRun = getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        FlowRouter.current().params.testRunId,
      );

      if (testRun) {
        const testRunIds = [testRun.testRunId];
        if (
          Meteor.subscribe(
            'dsMetrics',
            testRunIds,
            [panelId],
            applicationDashboardId,
          ).ready()
        ) {
          const dsMetricsPanel = DsMetrics.findOne({
            $and: [
              { testRunId: testRun.testRunId },
              { panelId: panelId },
              { applicationDashboardId: applicationDashboardId },
            ],
          });

          if (
            dsMetricsPanel &&
            dsMetricsPanel.data &&
            dsMetricsPanel.data.length > 0 &&
            !hasArtificalTarget
          ) {
            const dsMetrics = dsMetricsPanel.data.filter((metric) => {
              return metric.metricName === metricName;
            });

            if (dsMetrics.length > 0) {
              createPlotlyGraph(
                dsMetrics,
                metricName,
                applicationDashboardId,
                panelId,
                showTitle,
                testRun,
                requirementValue,
                panelYAxesFormat,
              );
            } else {
              createPlotlyGraph(
                [],
                metricName,
                applicationDashboardId,
                panelId,
                showTitle,
                testRun,
                requirementValue,
                panelYAxesFormat,
              );
            }
          } else {
            if (hasArtificalTarget) {
              createPlotlyGraph(
                [],
                metricName,
                applicationDashboardId,
                panelId,
                showTitle,
                testRun,
                requirementValue,
                panelYAxesFormat,
                validateWithDefaultIfNoDataValue,
              );
            } else {
              createPlotlyGraph(
                [],
                metricName,
                applicationDashboardId,
                panelId,
                showTitle,
                testRun,
                requirementValue,
                panelYAxesFormat,
              );
            }
          }
        }
      }
      // })
    });
  },
);

const createPlotlyGraph = (
  dsMetrics,
  metricName,
  applicationDashboardId,
  panelId,
  showTitle,
  testRun,
  requirementValue,
  panelYAxesFormat,
  validateWithDefaultIfNoDataValue,
) => {
  const x = [];
  const y = [];
  let maxDataPoint;
  let minDataPoint;

  dsMetrics.forEach((dataPoint) => {
    if (dataPoint.value !== undefined && dataPoint.value !== null) {
      // Track the maximum and minimum data point value
      if (maxDataPoint === undefined || dataPoint.value > maxDataPoint) {
        maxDataPoint = dataPoint.value;
      }
      if (minDataPoint === undefined || dataPoint.value < minDataPoint) {
        minDataPoint = dataPoint.value;
      }

      x.push(new Date(dataPoint.time));
      y.push(dataPoint.value);
    }
  });

  if (validateWithDefaultIfNoDataValue !== undefined) {
    x.push(new Date(testRun.start));
    y.push(validateWithDefaultIfNoDataValue);
    x.push(new Date(testRun.end));
    y.push(validateWithDefaultIfNoDataValue);
  }

  // If unit is 'percentunit' convert to percentage
  if (panelYAxesFormat === 'percentunit') {
    y.forEach((item, index) => {
      y[index] = item * 100;
    });
  }

  // If unit is 'seconds' and all data points are under 1, convert to 'ms'
  if (panelYAxesFormat === 's' && maxDataPoint < 1) {
    y.forEach((item, index) => {
      y[index] = item * 1000;
    });
    requirementValue = requirementValue * 1000;
    panelYAxesFormat = 'ms';
  }
  // If unit is 'ms' and all data points are over 1000, convert to 'sec'
  else if (panelYAxesFormat === 'ms' && minDataPoint > 1000) {
    y.forEach((item, index) => {
      y[index] = item / 1000;
    });
    requirementValue = requirementValue / 1000;
    panelYAxesFormat = 's';
  }

  let textColor;
  let rectColor;
  let theme;
  const user = Meteor.user();

  if (user && user.profile.theme) {
    textColor = user.profile.theme === 'dark' ? '#fff' : '#000';
    rectColor = user.profile.theme === 'dark' ? '#3D3E3FFF' : '#dde4ed';
    theme = user.profile.theme === 'dark' ? dark : light;
  }

  const lastRampUpTimestamp = new Date(
    new Date(testRun.start).getTime() + testRun.rampUp * 1000,
  );

  let trace1;

  if (x.length === 1) {
    trace1 = {
      x: [''],
      y: [y[0]],
      type: 'bar',
      hovertemplate: `%{y} ${panelYAxesFormat === 'percentunit' ? '%' : panelYAxesFormat}<extra></extra>`,
      marker: {
        color: ['rgb(77,89,231)'],
      },
      showlegend: false,
    };

    // let requirementBarTrace = {
    //     x: ['', ' '],
    //     y: [requirementValue, requirementValue],
    //     mode: 'lines',
    //     name: 'SLO',
    //     line: {
    //         color: 'rgb(255, 0, 0)',
    //         width: 2,
    //     },
    // };

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

    const data = [trace1];

    const sluggifiedMetricName = slugify(metricName);

    Plotly.newPlot(
      `line-chart-check-result-${applicationDashboardId}-${panelId}-${sluggifiedMetricName}`,
      data,
      layout,
      { displayModeBar: false },
    );
  } else {
    if (validateWithDefaultIfNoDataValue !== undefined) {
      trace1 = {
        name: 'Default value',
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
      trace1 = {
        x: x,
        y: y,
        type: 'scatter',
        mode: 'lines+markers',
        showlegend: false,
        hovertemplate: `%{y} ${panelYAxesFormat === 'percentunit' ? '%' : panelYAxesFormat}<extra></extra>`,
        connectgaps: true,
      };
    }
    const requirementTrace = {
      x: [testRun.start, testRun.end],
      y: [requirementValue, requirementValue],
      type: 'scatter',
      mode: 'lines',
      name: 'SLO',
      lines: {
        color: 'rgb(255, 0, 0)', // red color
      },
    };

    const layout = {
      template: theme,
      // plot_bgcolor: bgColor,  // Black background color for the plot
      // paper_bgcolor: bgColor,  // Black background color for the paper
      font: {
        color: textColor, // White font color
      },
      legend: {
        orientation: 'h',
        yanchor: 'bottom',
        y: 1.02,
        xanchor: 'left',
        x: 0,
      },
      xaxis: {
        range: [testRun.start, testRun.end],
        showgrid: true, // grid lines are shown
        showline: true, // zero line is shown
        visible: true,
        // gridcolor: gridcolor
      },
      yaxis: {
        // range: [0, maxYValue * 1.1],
        rangemode: 'tozero',
        title: panelYAxesFormat === 'percentunit' ? '%' : panelYAxesFormat,
        // showgrid: true, // grid lines are shown
        showline: true, // zero line is shown
        // gridcolor: gridcolor
        // visible: true,  // y-axis labels and ticks are shown
      },
      title:
        x.length === 0 ? 'No data available'
        : showTitle ? `${metricName}`
        : '',
      hovermode: 'x',
      shapes: [
        {
          type: 'rect',
          x0: testRun.start,
          y0: 0,
          x1: lastRampUpTimestamp,
          y1: 1,
          yref: 'paper',
          line: { width: 0 },
          fillcolor: rectColor,
          layer: 'below',
        },
      ],
    };

    const data = [trace1, requirementTrace];

    const sluggifiedMetricName = slugify(metricName);

    Plotly.newPlot(
      `line-chart-check-result-${applicationDashboardId}-${panelId}-${sluggifiedMetricName}`,
      data,
      layout,
      { displayModeBar: false },
    );
  }
};
