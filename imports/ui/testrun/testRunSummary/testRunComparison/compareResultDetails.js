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
// noinspection HtmlUnknownAttribute

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';
import {
  dynamicSort,
  getTestRun,
  renderGrafanaUrl,
  replaceDynamicVariableValues,
  slugify,
} from '/imports/helpers/utils';

import './compareResultDetails.html';
import { log } from '/both/logger';
import { Applications } from '/imports/collections/applications';
import { Benchmarks } from '/imports/collections/benchmarks';
import { TestRuns } from '/imports/collections/testruns';
import { Grafanas } from '/imports/collections/grafanas';
import { GrafanaDashboards } from '/imports/collections/grafanaDashboards';
import { ApplicationDashboards } from '/imports/collections/applicationDashboards';
import { CompareResults } from '/imports/collections/compareResults';
import { Snapshots } from '/imports/collections/snapshots';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';
import { getUnit } from '/imports/helpers/units';
import { ReactiveVar } from 'meteor/reactive-var';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import _ from 'lodash';

Template.compareResultDetails.onCreated(function applicationOnCreated() {
  this.userHasPermissionForApplication = new ReactiveVar(false);

  const compareResultsQuery = {
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

  Meteor.subscribe('grafanas');
  Meteor.subscribe('compareResults', compareResultsQuery);
  Meteor.subscribe('applicationDashboards', applicationDashboardQuery);

  const grafanaDashboardsQuery = {
    $and: [{ usedBySUT: Session.get('application') }],
  };

  Meteor.subscribe('grafanaDashboards', grafanaDashboardsQuery);

  Meteor.subscribe('configuration');

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
});

Template.compareResultDetails.helpers({
  inReport() {
    return (
      this.baselineTestRunId !== undefined &&
      this.compareResultLabel !== undefined
    );
  },
  compareResultDashboards() {
    const query = {
      $and: [
        {
          application:
            Session.get('application') ?
              Session.get('application')
            : FlowRouter.current().params.systemUnderTest,
        },
        {
          testEnvironment:
            Session.get('testEnvironment') ?
              Session.get('testEnvironment')
            : FlowRouter.current().params.testEnvironment,
        },
        {
          testType:
            Session.get('testType') ?
              Session.get('testType')
            : FlowRouter.current().params.workload,
        },
        { testRunId: FlowRouter.current().params.testRunId },
        {
          baselineTestRunId:
            Session.get('baselineTestRunId') ?
              Session.get('baselineTestRunId')
            : this.baselineTestRunId,
        },
        {
          label:
            Session.get('compareResultLabel') ?
              Session.get('compareResultLabel')
            : this.compareResultLabel,
        },
      ],
    };

    // return CompareResults.find(query);
    const compareResults = CompareResults.find(query);

    if (compareResults) {
      const compareResultDashboards = [];

      compareResults.forEach((compareResult) => {
        // let dataRetention = getDataRetention(compareResult);
        // let showSnapShot = new Date().getTime() - new Date(testRun.end).getTime() > (dataRetention * 1000);

        // if(!showSnapShot){
        //     compareResult.snapshotPanelUrl = renderGrafanaPanelSoloUrl(testRun, compareResult.dashboardLabel, compareResult.grafana, compareResult.dashboardUid, compareResult.panelId )
        //     const baselineTestrun  = getTestRun(FlowRouter.current().queryParams.systemUnderTest, compareResult.baselineTestRunId);
        //     compareResult.baselineSnapshotPanelUrl = renderGrafanaPanelSoloUrl(baselineTestrun, compareResult.dashboardLabel, compareResult.grafana, compareResult.dashboardUid, compareResult.panelId );
        // }

        if (
          compareResultDashboards
            .map((compareResultDashboard) => {
              return compareResultDashboard.dashboardLabel;
            })
            .indexOf(compareResult.dashboardLabel) === -1
        ) {
          const panels = [];
          panels.push(compareResult);

          compareResultDashboards.push({
            dashboardLabel: compareResult.dashboardLabel,
            grafana: compareResult.grafana,
            dashboardUid: compareResult.dashboardUid,
            baselineTestRunId: compareResult.baselineTestRunId,
            panels: panels,
          });
        } else {
          const compareResultDashboardIndex = compareResultDashboards
            .map(
              (compareResultDashboard) => compareResultDashboard.dashboardLabel,
            )
            .indexOf(compareResult.dashboardLabel);
          compareResultDashboards[compareResultDashboardIndex].panels.push(
            compareResult,
          );
        }
      });

      return compareResultDashboards;
    }
  },

  testRun() {
    // return getTestRun(FlowRouter.current().queryParams.systemUnderTest, FlowRouter.current().params.testRunId);
    return Session.get('testRun');
  },
  selectedCompareResultLabel() {
    // return getTestRun(FlowRouter.current().queryParams.systemUnderTest, FlowRouter.current().params.testRunId);
    return Session.get('compareResultLabel') ?
        Session.get('compareResultLabel')
      : this.compareResultLabel;
  },
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
});

Template.compareResultDetails.events({
  'click i#delete-comparison-result-from-report'(event) {
    event.preventDefault();

    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      Meteor.call(
        'deleteTestRunReportComparison',
        testRun,
        this.compareResultLabel,
        (err, result) => {
          if (result.error) {
            window.toastr.clear();
            window.toastr['error'](JSON.stringify(result.error), 'Error');
          } else {
            // noinspection JSCheckFunctionSignatures
            Modal.hide('testRunReportComparisonsModal');
          }
        },
      );
    }
  },
});

Template.comparisonPanelContent.onCreated(function applicationOnCreated() {
  this.compareMetricHeaderCollapsed = new ReactiveVar(false);
  this.templateDictionary = new ReactiveDict();
  this.showFilter = new ReactiveVar(false);
  this.selectedMetricName = new ReactiveVar(
    this.data.targets.length > 0 ?
      this.data.comparisonType === 'compared-to-previous-test-run' ?
        this.data.panel.previousTestRunCompareCheck.targets.sort(
          dynamicSort('-benchmarkBaselineTestRunOK'),
        )[this.data.panel.previousTestRunCompareCheck.targets.length - 1].target
      : this.data.panel.fixedBaselineTestRunCompareCheck.targets.sort(
          dynamicSort('-benchmarkBaselineTestRunOK'),
        )[this.data.panel.fixedBaselineTestRunCompareCheck.targets.length - 1]
          .target
    : '',
  );

  const benchmarksQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
    ],
  };

  this.showFilter.set(this.data.targets.length > 10);

  Meteor.subscribe('benchmarks', benchmarksQuery);

  if (this.data.panel) {
    this.templateDictionary.set('averageAll', this.data.panel.averageAll);
  }
});

Template.comparisonPanelContent.helpers({
  showFilter() {
    return Template.instance().showFilter.get();
  },
  metricNameFilter() {
    return slugify(
      `${this.comparisonType}-${this.panel.dashboardLabel}-${this.panel.panelTitle}`,
    );
  },
  statusError() {
    return this.status === 'ERROR';
  },
  userHasPermission() {
    const benchmark = Benchmarks.findOne({ _id: this.panel.benchmarkId });
    if (benchmark) {
      const role = benchmark.application;
      const user = Meteor.user();

      return (
        user &&
        (Roles.userHasRole(user._id, role) ||
          Roles.userHasRole(user._id, 'admin') ||
          Roles.userHasRole(user._id, 'super-admin'))
      );
    }
  },
  benchmark() {
    return Benchmarks.findOne({ _id: this.panel.benchmarkId });
  },

  hasBenchmarkAbsoluteFailureThreshold() {
    const benchmark = Benchmarks.findOne({ _id: this.panel.benchmarkId });
    if (benchmark)
      return benchmark.panel.benchmark.absoluteFailureThreshold !== undefined;
  },

  matchPattern() {
    return (
      this.panel.matchPattern !== undefined && this.panel.matchPattern !== ''
    );
  },
  relativeDeviation() {
    return (
      this.benchmark &&
      (this.benchmark.operator === 'pst-pct' ||
        this.benchmark.operator === 'ngt-pct')
    );
  },

  panelAverageAll() {
    const benchmark = Benchmarks.findOne({ _id: this.panel.benchmarkId });
    if (benchmark && benchmark.panel)
      return benchmark.panel.averageAll === true;
  },

  baseline() {
    const testRun = Session.get('testRun');

    if (testRun) {
      switch (FlowRouter.current().params.benchmarkType) {
        case 'compared-to-previous-test-run':
          return testRun.benchmarks.previousTestRun;

        case 'compared-to-baseline-test-run':
          return testRun.benchmarks.baselineTestRun;

        case 'compared-to-selected-baseline':
          return testRun.benchmarks.baselineTestRun;
      }
    }
  },
  panelTargets() {
    if (this.panel) {
      return this.targets.map((target) => {
        // Check if target has any of the benchmark properties
        const hasBenchmarkProperties =
          _.has(target, 'benchmarkPreviousTestRunValue') ||
          _.has(target, 'benchmarkPreviousTestRunOK') ||
          _.has(target, 'benchmarkBaselineTestRunValue') ||
          _.has(target, 'benchmarkBaselineTestRunOK');

        if (hasBenchmarkProperties) {
          // Add dashboardLabel and panelTitle properties to target
          return Object.assign({}, target, {
            dashboardLabel: this.panel.dashboardLabel,
            panelTitle: this.panel.panelTitle.split('-').slice(1).join('-'),
            applicationDashboardIdPanelIdMetricName: `${this.panel.applicationDashboardId}${this.panel.panelId}${target.target}`,
          });
        }
        return target; // Return target as is if it lacks benchmark properties
      });
    }
  },
  panelAverageArray() {
    let summary;
    if (this.comparisonType === 'compared-to-previous-test-run') {
      summary = this.panel.previousTestRunCompareCheck;
    } else if (this.comparisonType === 'compared-to-baseline-test-run') {
      summary = this.panel.fixedBaselineTestRunCompareCheck;
    }
    const targets = Array.isArray(this.panel.targets) ? this.panel.targets : [];
    // Map summary to target-like keys
    let summaryRow = null;
    if (summary) {
      summaryRow = {
        target: 'Series average',
        rawBaselineValue: summary.benchmarkBaselineTestRunPanelAverage,
        rawCurrentValue: summary.panelAverage,
        rawDelta: summary.benchmarkBaselineTestRunPanelAverageDelta,
        rawDeltaPct: summary.benchmarkBaselineTestRunPanelAverageDeltaPct,
        benchmarkBaselineTestRunOK: summary.benchmarkBaselineTestRunOK,
        isSummary: true,
      };
    }
    // Add a marker to targets for rowClass if needed
    const mappedTargets = targets.map((t) => ({
      ...t,
      isSummary: false,
      benchmarkBaselineTestRunOK: null,
    }));
    return [...(summaryRow ? [summaryRow] : []), ...mappedTargets];
  },

  panelAveragefields() {
    return [
      {
        key: 'target',
        label: 'Series',
        sortable: false,
        fn: (value, object) => {
          return object.isSummary ?
              new Spacebars.SafeString('<span>Series average</span>')
            : value;
        },
      },
      {
        key: 'rawBaselineValue',
        sortByValue: true,
        label: () => {
          return new Spacebars.SafeString(
            `<div><div style="margin-bottom: 5px;"><span class="label label-default">Baseline</span></div><div>Value</div></div>`,
          );
        },
        fn: (value) => {
          const rawValue = parseFloat(value);
          const parsedValue =
            (
              this.panel.panelYAxesFormat &&
              this.panel.panelYAxesFormat === 'percentunit'
            ) ?
              Math.round(rawValue * 10000) / 100
            : Math.round(rawValue * 100) / 100 || rawValue;

          if (
            this.panel.panelYAxesFormat &&
            this.panel.evaluateType !== 'fit'
          ) {
            const unit = getUnit(this.panel.panelYAxesFormat);
            return `${parsedValue} ${unit.format}`;
          } else {
            return `${parsedValue}`;
          }
        },
      },
      {
        key: 'rawCurrentValue',
        sortByValue: true,
        label: 'Value',
        fn: (value) => {
          const rawValue = parseFloat(value);
          const parsedValue =
            (
              this.panel.panelYAxesFormat &&
              this.panel.panelYAxesFormat === 'percentunit'
            ) ?
              Math.round(rawValue * 10000) / 100
            : Math.round(rawValue * 100) / 100 || rawValue;
          if (
            this.panel.panelYAxesFormat &&
            this.panel.evaluateType !== 'fit'
          ) {
            const unit = getUnit(this.panel.panelYAxesFormat);
            return `${parsedValue} ${unit.format}`;
          } else {
            return `${parsedValue}`;
          }
        },
      },
      {
        key: 'rawDelta',
        sortByValue: true,
        label: 'Delta',
        fn: (value) => {
          return (
              this.panel.panelYAxesFormat &&
                this.panel.panelYAxesFormat === 'percentunit'
            ) ?
              Math.round(value * 10000) / 100
            : Math.round(parseFloat(value) * 100) / 100;
        },
      },
      {
        key: 'rawDeltaPct',
        sortByValue: true,
        label: 'Delta %',
        fn: (value) => {
          return Math.round(parseFloat(value) * 100) / 100 + '%';
        },
      },
      {
        key: 'benchmarkBaselineTestRunOK',
        label: 'Result',
        sortOrder: 0,
        sortDirection: 'descending',
        fn: (value, object) => {
          return new Spacebars.SafeString(
            benchmarkResult(this.comparisonType, object),
          );
        },
      },
    ];
  },
  fields() {
    return [
      { key: 'target', label: 'Series' },
      // {key: 'benchmarkBaselineTestRunValue', cellClass: 'align-right-column', headerClass: 'align-right-column',
      {
        key: 'rawBaselineValue',
        sortByValue: true,
        cellClass: 'align-right-column',
        headerClass: 'align-right-column',
        label: () => {
          return new Spacebars.SafeString(
            `<div><div style="margin-bottom: 5px;"><span class="label label-default">Baseline</span></div><div>Value</div></div>`,
          );
        },
        fn: (value) => {
          const rawValue = parseFloat(value);
          const parsedValue =
            (
              this.panel.panelYAxesFormat &&
              this.panel.panelYAxesFormat === 'percentunit'
            ) ?
              Math.round(rawValue * 10000) / 100
            : Math.round(rawValue * 100) / 100 || rawValue;

          if (
            this.panel.panelYAxesFormat &&
            this.panel.evaluateType !== 'fit'
          ) {
            const unit = getUnit(this.panel.panelYAxesFormat);
            return `${parsedValue} ${unit.format}`;
          } else {
            return `${parsedValue}`;
          }
        },
      },
      // {key: 'value', cellClass: 'align-right-column', headerClass: 'align-right-column',
      {
        key: 'rawCurrentValue',
        sortByValue: true,
        cellClass: 'align-right-column',
        headerClass: 'align-right-column',
        fn: (value) => {
          const rawValue = parseFloat(value);
          const parsedValue =
            (
              this.panel.panelYAxesFormat &&
              this.panel.panelYAxesFormat === 'percentunit'
            ) ?
              Math.round(rawValue * 10000) / 100
            : Math.round(rawValue * 100) / 100 || rawValue;
          if (
            this.panel.panelYAxesFormat &&
            this.panel.evaluateType !== 'fit'
          ) {
            const unit = getUnit(this.panel.panelYAxesFormat);
            return `${parsedValue} ${unit.format}`;
          } else {
            return `${parsedValue}`;
          }
        },
        label: 'Value',
      },

      {
        key: 'rawDelta',
        sortByValue: true,
        label: '',
        headerClass: 'align-center-column',
        fn: (value) => {
          return new Spacebars.SafeString(deltaArrow(value));
        },
        cellClass: (value, object) => {
          return (
            getColor(value, this.benchmark, object.benchmarkBaselineTestRunOK) +
            ' align-center-column'
          );
        },
      },
      {
        // key: 'benchmarkBaselineTestRunDelta', label: 'Delta', headerClass: 'align-center-column',
        key: 'rawDelta',
        sortByValue: true,
        label: 'Delta',
        headerClass: 'align-right-column',
        fn: (value) => {
          return (
              this.panel.panelYAxesFormat &&
                this.panel.panelYAxesFormat === 'percentunit'
            ) ?
              Math.round(value * 10000) / 100
            : Math.round(parseFloat(value) * 100) / 100;
        },
        cellClass: () => {
          return 'align-right-column';
        },
      },
      {
        key: 'rawDeltaPct',
        sortByValue: true,
        label: 'Delta %',
        headerClass: 'align-right-column',
        fn: (value) => {
          return Math.round(parseFloat(value) * 100) / 100 + '%';
        },
        cellClass: () => {
          return 'align-right-column';
        },
      },

      {
        key: 'benchmarkBaselineTestRunOK',
        label: 'Result',
        cellClass: 'align-center-column',
        headerClass: 'align-center-column',
        fn: (value, object) => {
          return new Spacebars.SafeString(
            benchmarkResult(this.comparisonType, object),
          );
        } /*, sortOrder: 0, sortDirection: 'descending'*/,
      },
      {
        key: 'benchmarkBaselineTestRunOK',
        label: '',
        hidden: true,
        sortOrder: 0,
        sortDirection: 'descending',
        fn: (value, object) => {
          const result = object.benchmarkBaselineTestRunOK;
          let sortIndex;
          switch (result) {
            case true:
              sortIndex = 1;
              break;
            case false:
              sortIndex = 2;
              break;
            default:
              sortIndex = 0;
          }

          return sortIndex;
        },
      },
      {
        key: '_id',
        sortable: false,
        label: '',
        fn: (value, object) => {
          return new Spacebars.SafeString(
            `<i class="fa fa-bar-chart-o" id="open-trends" trend-metric-id="${object.applicationDashboardIdPanelIdMetricName}" trend-metric="${object.dashboardLabel} ${object.panelTitle} ${object.target}" data-tippy-content="View trend"></i>`,
          );
        },
      },
      // {key: '_id', label: '',
      //     fn:  (value, object, key) =>  {
      //         return new Spacebars.SafeString(createVisualisationLink(object, this.panel));
      //     }
      // },
    ];
  },
  // filters(){
  //     return ['baselineValueFilter'];
  // },
  settings() {
    return {
      rowsPerPage: 10,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      filters: [
        slugify(
          `${this.comparisonType}-${this.panel.dashboardLabel}-${this.panel.panelTitle}`,
        ),
      ],
    };
  },
  selectedMetricName() {
    return Template.instance().selectedMetricName.get();
  },
  rowClass() {
    if (Template.instance().selectedMetricName.get()) {
      return function (item) {
        if (item.target === this.templateData.selectedMetricName) {
          return 'profile-selected';
        }
      };
    }
  },
  dashboardUrl() {
    const grafanaLabel = this.grafana;
    const dashboardUid = this.dashboardUid;
    const dashboardLabel = this.dashboardLabel;

    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    const applicationDashboards = ApplicationDashboards.find({
      $and: [
        { application: FlowRouter.current().queryParams.systemUnderTest },
        { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
      ],
    }).fetch();

    /* Filter dashboard */
    if (applicationDashboards) {
      const filteredDashboard = applicationDashboards.filter(
        (dashboard) =>
          dashboard.grafana === grafanaLabel &&
          dashboard.dashboardUid === dashboardUid &&
          dashboard.dashboardLabel === dashboardLabel,
      );

      const grafana = Grafanas.findOne({ label: filteredDashboard[0].grafana });

      const grafanaDashboard = GrafanaDashboards.findOne({
        $and: [
          { grafana: grafanaLabel },
          { name: filteredDashboard[0].dashboardName },
        ],
      });

      return renderGrafanaUrl(
        testRun,
        filteredDashboard[0],
        grafana,
        grafanaDashboard,
        true,
      );
    }
  },
  compareMetricHeaderCollapsed() {
    return Template.instance().compareMetricHeaderCollapsed.get();
  },
});

Template.comparisonPanelContent.events({
  'mouseenter .reactive-table tbody tr td i'(event) {
    event.preventDefault();

    tippy('[data-tippy-content]', {
      theme: 'light-border',
    });
  },
  'click .reactive-table tbody tr'(event) {
    event.preventDefault();

    switch (event.target.id) {
      case 'open-trends':
        const encodedTrendMetric = encodeURIComponent(
          $(event.target).attr('trend-metric'),
        );
        const encodedTrendMetricId = encodeURIComponent(
          $(event.target).attr('trend-metric-id'),
        );

        const queryParams = {
          systemUnderTest: FlowRouter.current().queryParams.systemUnderTest,
          testEnvironment: FlowRouter.current().queryParams.testEnvironment,
          workload: FlowRouter.current().queryParams.workload,
          tab: 'trends',
          trendMetric: encodedTrendMetric,
          trendMetricId: encodedTrendMetricId,
        };

        const baseUrl = Meteor.absoluteUrl().slice(0, -1);
        const url = baseUrl + FlowRouter.path('testRuns', null, queryParams);

        window.open(url, '_blank');

        break;
      default:
        Template.instance().selectedMetricName.set(this.target);

        break;
      // case 'metric-compare-modal':
      //
      //     let visualizeCompareModalParams = {
      //         applicationDashboardId: template.$(event.target).attr('applicationDashboardId'),
      //         panelId: template.$(event.target).attr('panelId'),
      //         dashboardLabel: $(event.target).attr('dashboardLabel'),
      //         metricName: $(event.target).attr('metricName'),
      //         showTitle: $(event.target).attr('showTitle'),
      //         comparisonType: $(event.target).attr('comparisonType') ? $(event.target).attr('comparisonType') : 'compared-to-previous-test-run',
      //     }
      //
      //     Modal.show('visualizeCompareModal', visualizeCompareModalParams);
      //     break;
    }
  },
  'shown.bs.collapse .metric-collapse'(event) {
    event.stopPropagation();
    Template.instance().compareMetricHeaderCollapsed.set(false);
  },
  'hide.bs.collapse .metric-collapse'(event) {
    event.stopPropagation();
    Template.instance().compareMetricHeaderCollapsed.set(true);
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
    };

    Modal.show('benchmarkGraphModal', graphModalParams);
  },
});

Template.benchmarkGraphModal.onCreated(() => {
  const applicationDashboardQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
    ],
  };

  Meteor.subscribe('applicationDashboards', applicationDashboardQuery);
});

Template.benchmarkGraphModal.helpers({
  testRunUrl() {
    const grafanaLabel = this.grafana;
    const dashboardUid = this.dashboardUid;
    const dashboardLabel = this.dashboardLabel;

    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    const applicationDashboards = ApplicationDashboards.find({
      $and: [
        { application: FlowRouter.current().queryParams.systemUnderTest },
        { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
      ],
    }).fetch();

    /* Filter dashboard */

    const filteredDashboard = applicationDashboards.filter(
      (dashboard) =>
        dashboard.grafana === grafanaLabel &&
        dashboard.dashboardUid === dashboardUid &&
        dashboard.dashboardLabel === dashboardLabel,
    );

    const grafana = Grafanas.findOne({ label: filteredDashboard[0].grafana });

    return renderGrafanaSnapshotPanelUrl(
      this.snapshotUrl,
      this.panelId,
      testRun,
      filteredDashboard[0],
      grafana,
    );
  },
  testRunId() {
    return FlowRouter.current().params.testRunId;
  },
  baselineTestRunId() {
    return this.baselineTestRunId;
  },
  baselineUrl() {
    const dashboardUid = this.dashboardUid;
    const dashboardLabel = this.dashboardLabel;

    const testRun = getBaselineTestRun(this.baselineTestRunId);

    const snapshot = Snapshots.findOne({
      $and: [
        { application: testRun.application },
        { testEnvironment: testRun.testEnvironment },
        { testType: testRun.testType },
        { testRunId: testRun.testRunId },
        { dashboardUid: dashboardUid },
        { dashboardLabel: dashboardLabel },
      ],
    });

    if (snapshot) {
      const applicationDashboard = ApplicationDashboards.findOne({
        $and: [
          { application: FlowRouter.current().queryParams.systemUnderTest },
          { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
          { dashboardUid: dashboardUid },
          { dashboardLabel: dashboardLabel },
        ],
      });

      if (applicationDashboard) {
        const grafana = Grafanas.findOne({ label: snapshot.grafana });

        if (grafana)
          return renderGrafanaSnapshotPanelUrl(
            snapshot.url,
            this.panelId,
            testRun,
            applicationDashboard,
            grafana,
          );
      }
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
  hasBaselineSnapshotPanelUrl() {
    return this.baselineSnapshotPanelUrl !== undefined;
  },
  hasSnapshotPanelUrl() {
    return this.snapshotPanelUrl !== undefined;
  },
});

Template.benchmarkGraphs.onCreated(() => {
  const snapshotQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
      { testRunId: FlowRouter.current().params.testRunId },
    ],
  };
  const query = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
    ],
  };

  Meteor.subscribe('applicationDashboards', query);
  Meteor.subscribe('snapshots', snapshotQuery, 'compareResultDetails');
  Meteor.subscribe('configuration');
});

Template.benchmarkGraphs.helpers({
  hasBaselineSnapshotPanelUrl() {
    return this.baselineSnapshotPanelUrl !== undefined;
  },
  hasSnapshotPanelUrl() {
    return this.snapshotPanelUrl !== undefined;
  },
  testRunUrl() {
    const grafanaLabel = this.grafana;
    const dashboardUid = this.dashboardUid;
    const dashboardLabel = this.dashboardLabel;

    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    const applicationDashboards = ApplicationDashboards.find({
      $and: [
        { application: FlowRouter.current().queryParams.systemUnderTest },
        { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
      ],
    }).fetch();

    /* Filter dashboard */

    const filteredDashboard = applicationDashboards.filter(
      (dashboard) =>
        dashboard.grafana === grafanaLabel &&
        dashboard.dashboardUid === dashboardUid &&
        dashboard.dashboardLabel === dashboardLabel,
    );

    const grafana = Grafanas.findOne({ label: filteredDashboard[0].grafana });

    return renderGrafanaSnapshotPanelUrl(
      this.snapshotUrl,
      this.panelId,
      testRun,
      filteredDashboard[0],
      grafana,
    );

    // let dataRetention = getDataRetention(filteredDashboard[0]);

    // let showSnapShot = new Date().getTime() - new Date(testRun.end).getTime() > (dataRetention * 1000);

    // if (showSnapShot) {
    //
    //     let grafana = Grafanas.findOne({label: filteredDashboard[0].grafana });
    //
    //     return renderGrafanaSnapshotPanelUrl (this.snapshotUrl, this.panelId, testRun, filteredDashboard[0], grafana);
    //
    // } else {
    //
    //     return renderGrafanaPanelSoloUrl(testRun, filteredDashboard[0].dashboardLabel, filteredDashboard[0].grafana, filteredDashboard[0].dashboardUid, this.panelId );
    // }
  },
  testRunId() {
    return FlowRouter.current().params.testRunId;
  },
  baselineTestRunId() {
    return this.baselineTestRunId;
  },
  baselineUrl() {
    const dashboardUid = this.dashboardUid;
    const dashboardLabel = this.dashboardLabel;

    const testRun = getBaselineTestRun(this.baselineTestRunId);

    const applicationDashboard = ApplicationDashboards.findOne({
      $and: [
        { application: FlowRouter.current().queryParams.systemUnderTest },
        { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
        { dashboardUid: dashboardUid },
        { dashboardLabel: dashboardLabel },
      ],
    });

    if (applicationDashboard) {
      // let dataRetention = getDataRetention(applicationDashboard);
      // let showSnapShot = new Date().getTime() - new Date(testRun.end).getTime() > (dataRetention * 1000);

      const snapshot = Snapshots.findOne({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
          { testRunId: testRun.testRunId },
          { dashboardUid: dashboardUid },
          { dashboardLabel: dashboardLabel },
        ],
      });

      if (snapshot) {
        const grafana = Grafanas.findOne({ label: snapshot.grafana });

        if (grafana)
          return renderGrafanaSnapshotPanelUrl(
            snapshot.url,
            this.panelId,
            testRun,
            applicationDashboard,
            grafana,
          );
      }

      // if (showSnapShot) {
      //
      //     const snapshot = Snapshots.findOne({
      //         $and: [
      //             {application: testRun.application},
      //             {testEnvironment: testRun.testEnvironment},
      //             {testType: testRun.testType},
      //             {testRunId: testRun.testRunId},
      //             {dashboardUid: dashboardUid},
      //             {dashboardLabel: dashboardLabel},
      //         ]
      //     })
      //
      //     if (snapshot) {
      //
      //         let grafana = Grafanas.findOne({label: snapshot.grafana});
      //
      //         if (grafana) return renderGrafanaSnapshotPanelUrl(snapshot.url, this.panelId, testRun, applicationDashboard, grafana);
      //
      //     }
      //
      // } else {
      //
      //     return renderGrafanaPanelSoloUrl(testRun, applicationDashboard.dashboardLabel, applicationDashboard.grafana, applicationDashboard.dashboardUid, this.panelId);
      // }
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
  themeUrl(url) {
    const user = Meteor.user();

    if (user && url)
      return url.replace(/theme=(dark|light)/, `theme=${user.profile.theme}`);
  },
});

const renderGrafanaSnapshotPanelUrl = (
  snapshotUrl,
  panelId,
  testRun,
  dashboard,
  grafana,
) => {
  let result;
  const start = new Date(testRun.start).getTime();
  const end = new Date(testRun.end).getTime();

  if (testRun && dashboard) {
    let variables = `&var-system_under_test=${testRun.application}&var-test_environment=${testRun.testEnvironment}`;
    if (dashboard.variables) {
      if (testRun.variables && testRun.variables.length > 0)
        dashboard = replaceDynamicVariableValues(dashboard, testRun);

      for (const v in dashboard.variables) {
        for (const l in dashboard.variables[v].values) {
          if (dashboard.variables[v])
            variables +=
              '&var-' +
              dashboard.variables[v].name +
              '=' +
              dashboard.variables[v].values[l];
        }
      }
    }

    const theme =
      Meteor.user().profile.theme ? Meteor.user().profile.theme : 'light';

    result = `${snapshotUrl}?orgId=${grafana.orgId}&panelId=${panelId}&viewPanel=${panelId}&fullscreen&from=${start}&to=${end}${variables}&theme=${theme}&kiosk`;
  }

  return result;
};

const getBaselineTestRun = (testRunId) => {
  return TestRuns.findOne({
    $and: [
      { application: FlowRouter.current().queryParams.systemUnderTest },
      { testRunId: testRunId },
    ],
  });
};

export const benchmarkResult = (comparisonType, object) => {
  const result = object.benchmarkBaselineTestRunOK;

  let HTML;

  switch (result) {
    case true:
      HTML =
        '<i class="fa fa-check" style="color: green;" aria-hidden="true"></i>';
      break;
    case false:
      HTML =
        '<i class="fa fa-exclamation-circle" style="color: red;" aria-hidden="true"></i>';
      break;
    default:
      HTML =
        '<i class="fa fa-minus" style="color: lightgrey;" aria-hidden="true"></i>';
  }

  if (
    object.isCurrentArtificial === true ||
    object.isBaselineArtificial === true
  ) {
    HTML += `<i class="fa fa-info-circle reactive-table-icon" style="margin-left: 10px;" aria-hidden="true"  data-tippy-content="No data for test run or baseline, using default value from Service Level Indicator configuration"></i>`;
  }

  return new Spacebars.SafeString(HTML);
};
export const deltaArrow = (delta) => {
  let HTML;

  if (delta > 0) {
    HTML = '<i class="fa fa-arrow-up"  aria-hidden="true"></i>';
  } else if (delta < 0) {
    HTML = '<i class="fa fa-arrow-down"  aria-hidden="true"></i>';
  } else {
    HTML = '<i class="fa fa-arrow-right"  aria-hidden="true"></i>';
  }

  return HTML;
};

Template.testRunComparisonPanelContent.onCreated(
  function applicationOnCreated() {
    this.compareMetricHeaderCollapsed = new ReactiveVar(true);
    this.templateDictionary = new ReactiveDict();
    this.showFilter = new ReactiveVar(false);
    this.selectedMetricName = new ReactiveVar(
      this.data.targets && this.data.targets.length > 0 ?
        this.data.targets.sort(dynamicSort('-benchmarkBaselineTestRunOK'))[
          this.data.targets.length - 1
        ].target
      : '',
    );

    Template.instance().showFilter.set(this.data.targets.length > 10);

    const snapshotQuery = {
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
    Meteor.subscribe('applicationDashboards', applicationDashboardQuery);
    Meteor.subscribe('snapshots', snapshotQuery, 'compareResultDetails2');
    Meteor.subscribe('benchmarks', benchmarksQuery);
    Meteor.subscribe('grafanas');

    if (this.data.panel) {
      this.templateDictionary.set('averageAll', this.data.panel.averageAll);
    }
  },
);

Template.testRunComparisonPanelContent.onRendered(
  function applicationOnrendered() {
    const user = Meteor.user();

    if (user) {
      if (this.data.snapshotPanelUrl)
        this.data.snapshotPanelUrl = this.data.snapshotPanelUrl.replace(
          /theme=(dark|light)/,
          `theme=${user.profile.theme}`,
        );
      if (this.data.baselineSnapshotPanelUrl)
        this.data.baselineSnapshotPanelUrl =
          this.data.baselineSnapshotPanelUrl.replace(
            /theme=(dark|light)/,
            `theme=${user.profile.theme}`,
          );
    }
  },
);

Template.testRunComparisonPanelContent.helpers({
  notTable() {
    return (
      this.panel.panelType !== 'table' && this.panel.panelType !== 'table-old'
    );
  },
  statusError() {
    return this.panel.status === 'ERROR';
  },
  includePanelTitle() {
    return this.includePanelTitle === true;
  },
  applicationDashboardId() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const applicationDashboard = ApplicationDashboards.findOne({
        $and: [
          { application: this.panel.application },
          { testEnvironment: this.panel.testEnvironment },
          { grafana: this.panel.grafana },
          { dashboardUid: this.panel.dashboardUid },
          { dashboardLabel: this.panel.dashboardLabel },
        ],
      });

      if (applicationDashboard) {
        return applicationDashboard._id;
      }
    }
  },

  userHasPermission() {
    const benchmark = Benchmarks.findOne({ _id: this.panel.benchmarkId });
    if (benchmark) {
      const role = benchmark.application;
      const user = Meteor.user();

      return (
        user &&
        (Roles.userHasRole(user._id, role) ||
          Roles.userHasRole(user._id, 'admin') ||
          Roles.userHasRole(user._id, 'super-admin'))
      );
    }
  },
  benchmark() {
    return Benchmarks.findOne({ _id: this.panel.benchmarkId });
  },

  matchPattern() {
    return (
      this.panel.matchPattern !== undefined && this.panel.matchPattern !== ''
    );
  },
  hasBenchmarkAbsoluteFailureThreshold() {
    return (
      this.panel.benchmark && this.panel.benchmark.absoluteFailureThreshold
    );
  },
  // matchPattern(){
  //
  //     const benchmark = Benchmarks.findOne({_id: this.panel.benchmarkId})
  //     if(benchmark) return benchmark.panel.matchPattern !== undefined;
  // },
  relativeDeviation() {
    return (
      this.panel.benchmark &&
      (this.panel.benchmark.operator === 'pst-pct' ||
        this.panel.benchmark.operator === 'ngt-pct')
    );
  },
  hasBenchmark() {
    return this.panel.benchmark !== undefined;
  },

  panelAverageAll() {
    return this.panel.averageAll === true;
  },

  showFilter() {
    return Template.instance().showFilter.get();
  },
  baseline() {
    const testRun = Session.get('testRun');

    if (testRun) {
      switch (FlowRouter.current().params.benchmarkType) {
        case 'compared-to-previous-test-run':
          return testRun.benchmarks.previousTestRun;

        case 'compared-to-baseline-test-run':
          return testRun.benchmarks.baselineTestRun;

        case 'compared-to-selected-baseline':
          return testRun.benchmarks.baselineTestRun;
      }
    }
  },
  panelTargets() {
    if (this.targets)
      return this.targets.filter(
        (target) =>
          _.has(target, 'benchmarkPreviousTestRunValue') ||
          _.has(target, 'benchmarkPreviousTestRunOK') ||
          _.has(target, 'benchmarkBaselineTestRunValue') ||
          _.has(target, 'benchmarkBaselineTestRunOK'),
      );
  },
  panelAverageArray() {
    let summary;
    if (this.comparisonType === 'compared-to-previous-test-run') {
      summary = this.panel.previousTestRunCompareCheck;
    } else if (this.comparisonType === 'compared-to-baseline-test-run') {
      summary = this.panel.fixedBaselineTestRunCompareCheck;
    }
    const targets = Array.isArray(this.panel.targets) ? this.panel.targets : [];
    // Map summary to target-like keys
    let summaryRow = null;
    if (summary) {
      summaryRow = {
        target: 'Series average',
        rawBaselineValue: summary.benchmarkBaselineTestRunPanelAverage,
        rawCurrentValue: summary.panelAverage,
        rawDelta: summary.benchmarkBaselineTestRunPanelAverageDelta,
        rawDeltaPct: summary.benchmarkBaselineTestRunPanelAverageDeltaPct,
        benchmarkBaselineTestRunOK: summary.benchmarkBaselineTestRunOK,
        isSummary: true,
      };
    }
    // Add a marker to targets for rowClass if needed
    const mappedTargets = targets.map((t) => ({
      ...t,
      isSummary: false,
      benchmarkBaselineTestRunOK: null,
    }));
    return [...(summaryRow ? [summaryRow] : []), ...mappedTargets];
  },

  panelAveragefields() {
    return [
      {
        key: 'target',
        label: 'Series',
        sortable: false,
        fn: (value, object) => {
          return object.isSummary ?
              new Spacebars.SafeString('<span>Series average</span>')
            : value;
        },
      },
      {
        key: 'rawBaselineValue',
        sortByValue: true,
        label: () => {
          return new Spacebars.SafeString(
            `<div><div style="margin-bottom: 5px;"><span class="label label-default">Baseline</span></div><div>Value</div></div>`,
          );
        },
        fn: (value) => {
          const rawValue = parseFloat(value);
          const parsedValue =
            (
              this.panel.panelYAxesFormat &&
              this.panel.panelYAxesFormat === 'percentunit'
            ) ?
              Math.round(rawValue * 10000) / 100
            : Math.round(rawValue * 100) / 100 || rawValue;

          if (
            this.panel.panelYAxesFormat &&
            this.panel.evaluateType !== 'fit'
          ) {
            const unit = getUnit(this.panel.panelYAxesFormat);
            return `${parsedValue} ${unit.format}`;
          } else {
            return `${parsedValue}`;
          }
        },
      },
      {
        key: 'rawCurrentValue',
        sortByValue: true,
        label: 'Value',
        fn: (value) => {
          const rawValue = parseFloat(value);
          const parsedValue =
            (
              this.panel.panelYAxesFormat &&
              this.panel.panelYAxesFormat === 'percentunit'
            ) ?
              Math.round(rawValue * 10000) / 100
            : Math.round(rawValue * 100) / 100 || rawValue;
          if (
            this.panel.panelYAxesFormat &&
            this.panel.evaluateType !== 'fit'
          ) {
            const unit = getUnit(this.panel.panelYAxesFormat);
            return `${parsedValue} ${unit.format}`;
          } else {
            return `${parsedValue}`;
          }
        },
      },
      {
        key: 'rawDelta',
        sortByValue: true,
        label: 'Delta',
        fn: (value) => {
          return (
              this.panel.panelYAxesFormat &&
                this.panel.panelYAxesFormat === 'percentunit'
            ) ?
              Math.round(value * 10000) / 100
            : Math.round(parseFloat(value) * 100) / 100;
        },
      },
      {
        key: 'rawDeltaPct',
        sortByValue: true,
        label: 'Delta %',
        fn: (value) => {
          return Math.round(parseFloat(value) * 100) / 100 + '%';
        },
      },
      {
        key: 'benchmarkBaselineTestRunOK',
        label: 'Result',
        sortOrder: 0,
        sortDirection: 'descending',
        fn: (value, object) => {
          return new Spacebars.SafeString(
            benchmarkResult(this.comparisonType, object),
          );
        },
      },
    ];
  },
  fields() {
    return [
      { key: 'target', label: 'Series' },
      // {key: 'benchmarkPreviousTestRunValue', label: 'Previous test run value'
      {
        key: 'rawBaselineValue',
        sortByValue: true,
        label: 'Previous test run value',
        hidden: () => {
          return (
            this.comparisonType === 'compared-to-baseline-test-run' ||
            this.comparisonType === 'compared-to-selected-baseline'
          );
        },
        fn: (value) => {
          const rawValue = parseFloat(value);
          const parsedValue =
            (
              this.panel.panelYAxesFormat &&
              this.panel.panelYAxesFormat === 'percentunit'
            ) ?
              Math.round(rawValue * 10000) / 100
            : Math.round(rawValue * 100) / 100 || rawValue;
          if (
            this.panel.panelYAxesFormat &&
            this.panel.evaluateType !== 'fit'
          ) {
            const unit = getUnit(this.panel.panelYAxesFormat);
            return `${parsedValue} ${unit.format}`;
          } else {
            return `${parsedValue}`;
          }
        },
      },

      {
        // key: 'benchmarkBaselineTestRunValue', cellClass: 'align-right-column', headerClass: 'align-right-column', label: (value, object, key) =>  {
        key: 'rawBaselineValue',
        sortByValue: true,
        cellClass: 'align-right-column',
        headerClass: 'align-right-column',
        label: () => {
          return new Spacebars.SafeString(
            `<div><div style="margin-bottom: 5px;"><span class="label label-default">Baseline</span></div><div>${this.baselineTestRunId}</div></div>`,
          );
        },
        fn: (value) => {
          const rawValue = parseFloat(value);
          const parsedValue =
            (
              this.panel.panelYAxesFormat &&
              this.panel.panelYAxesFormat === 'percentunit'
            ) ?
              Math.round(rawValue * 10000) / 100
            : Math.round(rawValue * 100) / 100 || rawValue;
          if (
            this.panel.panelYAxesFormat &&
            this.panel.evaluateType !== 'fit'
          ) {
            const unit = getUnit(this.panel.panelYAxesFormat);
            return `${parsedValue} ${unit.format}`;
          } else {
            return `${parsedValue}`;
          }
        },
        hidden: () => {
          return this.comparisonType === 'compared-to-previous-test-run';
        },
      },
      // {key: 'value', cellClass: 'align-right-column', headerClass: 'align-right-column',
      {
        key: 'rawCurrentValue',
        sortByValue: true,
        cellClass: 'align-right-column',
        headerClass: 'align-right-column',
        fn: (value) => {
          const rawValue = parseFloat(value);
          const parsedValue =
            (
              this.panel.panelYAxesFormat &&
              this.panel.panelYAxesFormat === 'percentunit'
            ) ?
              Math.round(rawValue * 10000) / 100
            : Math.round(rawValue * 100) / 100 || rawValue;
          if (
            this.panel.panelYAxesFormat &&
            this.panel.evaluateType !== 'fit'
          ) {
            const unit = getUnit(this.panel.panelYAxesFormat);
            return `${parsedValue} ${unit.format}`;
          } else {
            return `${parsedValue}`;
          }
        },
        label: this.testRunId,
      },
      {
        key: 'rawDelta',
        sortByValue: true,
        label: '',
        fn: (value) => {
          return new Spacebars.SafeString(deltaArrow(value));
        },
        cellClass: (value, object) => {
          return (
            getColor(value, this.benchmark, object.benchmarkBaselineTestRunOK) +
            ' align-center-column'
          );
        },
      },
      {
        key: 'rawDelta',
        sortByValue: true,
        label: 'Delta',
        headerClass: 'align-right-column',
        fn: (value) => {
          return (
              this.panel.panelYAxesFormat &&
                this.panel.panelYAxesFormat === 'percentunit'
            ) ?
              Math.round(value * 10000) / 100
            : Math.round(parseFloat(value) * 100) / 100;
        },
        // hidden: () => {
        //     return this.comparisonType === 'compared-to-baseline-test-run' || this.comparisonType === 'compared-to-selected-baseline';
        // },
        cellClass: () => {
          return 'align-right-column';
        },
      },

      {
        key: 'rawDeltaPct',
        sortByValue: true,
        label: 'Delta %',
        headerClass: 'align-right-column',
        fn: (value) => {
          return Math.round(parseFloat(value) * 100) / 100 + '%';
        },
        // hidden: () => {
        //     return this.comparisonType === 'compared-to-baseline-test-run' || this.comparisonType === 'compared-to-selected-baseline';
        // },
        cellClass: () => {
          return 'align-right-column';
        },
      },
      // {
      //     // key: 'benchmarkBaselineTestRunDelta', label: 'Delta', headerClass: 'align-center-column',
      //     key: 'rawDelta', sortByValue: true, label: 'Delta', headerClass: 'align-right-column',
      //     fn: (value, object, key) =>  {
      //         return (this.panel.panelYAxesFormat && this.panel.panelYAxesFormat === 'percentunit') ? Math.round((value * 10000)) / 100   : parseFloat(Math.round((value * 100)) / 100);
      //     },
      //     hidden: () => {
      //         return this.comparisonType === 'compared-to-previous-test-run';
      //     },
      //     cellClass:  (value, object) => {
      //         return 'align-right-column';
      //     }
      // },
      // {
      //     key: 'benchmarkBaselineTestRunDeltaPct', sortByValue: true, label: 'Delta %', headerClass: 'align-right-column',
      //     fn: (value, object, key) =>  {
      //         return parseFloat(Math.round((value * 100)) / 100) + '%';
      //     },
      //     hidden: () => {
      //         return this.comparisonType === 'compared-to-previous-test-run';
      //     },
      //     cellClass:  (value, object) => {
      //         return 'align-right-column';
      //     }
      // },

      // {key: 'benchmarkPreviousTestRunOK', label: 'Result', fn: (value, object, key) =>  {
      //         return new Spacebars.SafeString(benchmarkResult(this.comparisonType, object));
      //     },
      //     hidden: () => {
      //         return this.comparisonType === 'compared-to-baseline-test-run' || this.comparisonType === 'compared-to-selected-baseline';
      //     },sortOrder: 0, sortDirection: 'descending'
      // },
      {
        key: 'benchmarkBaselineTestRunOK',
        label: 'Result',
        cellClass: 'align-center-column',
        headerClass: 'align-center-column',
        fn: (value, object) => {
          return new Spacebars.SafeString(
            benchmarkResult(this.comparisonType, object),
          );
        },
        hidden: () => {
          return !this.panel.benchmark;
        } /*, sortOrder: 0, sortDirection: 'descending'*/,
      },
      {
        key: 'benchmarkBaselineTestRunOK',
        label: '',
        hidden: true,
        sortOrder: 0,
        sortDirection: 'descending',
        fn: (value, object) => {
          const result = object.benchmarkBaselineTestRunOK;
          let sortIndex;
          switch (result) {
            case true:
              sortIndex = 1;
              break;
            case false:
              sortIndex = 2;
              break;
            default:
              sortIndex = 0;
          }

          return sortIndex;
        },
      },
      // {key: '_id', label: '',
      //     fn:  (value, object, key) =>  {
      //         return new Spacebars.SafeString(createVisualisationLink(object, this.panel));
      //     }
      // },
      // { key: '_id', sortable: false,
      //     label: () =>  {
      //         return new Spacebars.SafeString(`<div  panel-id="{{panel.panelId}}" dashboard-label={{dashboardLabel}} dashboard-uid="{{dashboardUid}}" grafana="{{grafana}}" snapshot-url="{{snapshotUrl}}" baseline-testrun-id="{{ baselineTestRunId }}"  class="fa fa-columns  view-benchmark-modal col-md-1" data-toggle="tooltip" data-placement="top" title="Compare graphs"></div>`);
      //     },
      //     fn: (value, object, key) =>  {
      //         return new Spacebars.SafeString(`<div></div>`);
      //     }
      // },
    ];
  },
  // filters(){
  //     return ['baselineValueFilter'];
  // },
  metricNameFilter() {
    return slugify(
      `${this.comparisonType}-${this.panel.dashboardLabel}-${this.panel.panelTitle}`,
    );
  },
  settings() {
    return {
      rowsPerPage: 10,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      filters: [
        slugify(
          `${this.comparisonType}-${this.panel.dashboardLabel}-${this.panel.panelTitle}`,
        ),
      ],
    };
  },
  selectedMetricName() {
    return Template.instance().selectedMetricName.get();
  },
  rowClass() {
    if (Template.instance().selectedMetricName.get()) {
      return function (item) {
        if (item.target === this.templateData.selectedMetricName) {
          return 'profile-selected';
        }
      };
    }
  },
  dashboardUrl() {
    const grafanaLabel = this.grafana;
    const dashboardUid = this.dashboardUid;
    const dashboardLabel = this.dashboardLabel;

    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    const applicationDashboards = ApplicationDashboards.find({
      $and: [
        { application: FlowRouter.current().queryParams.systemUnderTest },
        { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
      ],
    }).fetch();

    /* Filter dashboard */
    if (applicationDashboards) {
      const filteredDashboard = applicationDashboards.filter(
        (dashboard) =>
          dashboard.grafana === grafanaLabel &&
          dashboard.dashboardUid === dashboardUid &&
          dashboard.dashboardLabel === dashboardLabel,
      );

      const grafana = Grafanas.findOne({ label: filteredDashboard[0].grafana });

      const grafanaDashboard = GrafanaDashboards.findOne({
        $and: [
          { grafana: grafanaLabel },
          { name: filteredDashboard[0].dashboardName },
        ],
      });

      return renderGrafanaUrl(
        testRun,
        filteredDashboard[0],
        grafana,
        grafanaDashboard,
        true,
      );
    }
  },
  compareMetricHeaderCollapsed() {
    return Template.instance().compareMetricHeaderCollapsed.get();
  },
});

Template.testRunComparisonPanelContent.events({
  'click .reactive-table tbody tr'(event) {
    event.preventDefault();

    switch (event.target.id) {
      default:
        Template.instance().selectedMetricName.set(this.target);

        break;
    }
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
      baselineTestRunId:
        template.$(event.target).attr('baseline-testrun-id') ?
          template.$(event.target).attr('baseline-testrun-id')
        : template
            .$(event.target)
            .children('.fa-eye')
            .attr('baseline-testrun-id'),
    };

    Modal.show('benchmarkGraphModal', graphModalParams);
  },
  'shown.bs.collapse .metric-collapse'() {
    Template.instance().compareMetricHeaderCollapsed.set(false);
  },
  'hide.bs.collapse .metric-collapse'() {
    Template.instance().compareMetricHeaderCollapsed.set(true);
  },
});

const getColor = (value, benchmark, benchmarkBaselineTestRunOK) => {
  if (benchmark) {
    if (benchmarkBaselineTestRunOK === false) {
      return 'delta-red';
    } else {
      if (benchmark.operator.substring(0, 3) === 'pst') {
        switch (true) {
          case value === 0.0:
            return 'delta-blue';
          case value < 0:
            return 'delta-green';
          case value > 0:
            return 'delta-orange';
        }
      } else {
        switch (true) {
          case value === 0.0:
            return 'delta-blue';
          case value > 0:
            return 'delta-green';
          case value < 0:
            return 'delta-orange';
        }
      }
    }
  } else {
    return '';
  }
};

Template.visualizeCompareModal.helpers({
  applicationDashboardId() {
    return this.applicationDashboardId;
  },
  panelId() {
    return this.panelId;
  },
  metricName() {
    return this.metricName;
  },
  dashboardLabel() {
    return this.dashboardLabel;
  },
  comparisonType() {
    return this.comparisonType;
  },
});

Template.testRunComparisonDashboard.onCreated(
  function testRunComparisonDashboardOnCreated() {
    this.dashboardHeaderCollapsed = new ReactiveVar(true);
  },
);

Template.testRunComparisonDashboard.helpers({
  dashboardHeaderCollapsed() {
    return Template.instance().dashboardHeaderCollapsed.get();
  },
});

Template.testRunComparisonDashboard.events({
  'shown.bs.collapse .dashboard-collapse'() {
    Template.instance().dashboardHeaderCollapsed.set(false);
  },
  'hide.bs.collapse .dashboard-collapse'() {
    Template.instance().dashboardHeaderCollapsed.set(true);
  },
});
