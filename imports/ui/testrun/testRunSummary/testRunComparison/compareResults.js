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
import { CompareResults } from '/imports/collections/compareResults';
import { ReactiveVar } from 'meteor/reactive-var';
import { TestRuns } from '/imports/collections/testruns';
import { benchmarkResult } from './compareResultDetails';
import { Session } from 'meteor/session';
import { compareResultsLocal } from '/client/main';
import { $ } from 'meteor/jquery';
import { Snapshots } from '/imports/collections/snapshots';
import { Applications } from '/imports/collections/applications';
import { log } from '/both/logger';
import './compareResults.html';
import './compareResults.less';
import { ApplicationDashboards } from '/imports/collections/applicationDashboards';
import {
  getFixedBaselineTestRun,
  getPreviousTestRun,
  getTestRun,
} from '/imports/helpers/utils';
import _ from 'lodash';

Template.compareResults.onCreated(function compareResultsOnCreated() {
  this.compareResultSelected = new ReactiveVar(false);
  this.selectedCompareResultLabel = new ReactiveVar();
  this.compareResults = new ReactiveVar();
  this.userHasPermissionForApplication = new ReactiveVar(false);

  Meteor.subscribe('applications');

  this.autorun(() => {
    FlowRouter.watchPathChange();

    if (
      Session.get('application') &&
      Session.get('testEnvironment') &&
      Session.get('testType') &&
      FlowRouter.current().params.testRunId
    ) {
      const snapshotQuery = {
        $and: [
          { application: Session.get('application') },
          { testEnvironment: Session.get('testEnvironment') },
          { testType: Session.get('testType') },
          { testRunId: FlowRouter.current().params.testRunId },
        ],
      };

      Meteor.subscribe('snapshots', snapshotQuery, 'compareResults');

      const query = {
        $and: [
          { application: Session.get('application') },
          { testEnvironment: Session.get('testEnvironment') },
          { testType: Session.get('testType') },
          { testRunId: FlowRouter.current().params.testRunId },
        ],
      };

      Meteor.subscribe('compareResults', query);
    }

    Meteor.subscribe('grafanas');

    if (Session.get('application') && Session.get('testEnvironment')) {
      const applicationDashboardQuery = {
        $and: [
          { application: Session.get('application') },
          { testEnvironment: Session.get('testEnvironment') },
        ],
      };

      Meteor.subscribe('applicationDashboards', applicationDashboardQuery);
    }

    const compareResultsQuery = {
      $and: [
        { application: Session.get('application') },
        { testEnvironment: Session.get('testEnvironment') },
        { testType: Session.get('testType') },
        { testRunId: FlowRouter.current().params.testRunId },
      ],
    };

    // return CompareResults.find(query);
    const compareResults = CompareResults.find(compareResultsQuery);
    this.compareResults.set(compareResults);

    const application = Applications.findOne({
      name: Session.get('application'),
    });

    if (application) {
      Meteor.call(
        'userHasPermissionForApplication',
        application.name,
        (err, result) => {
          if (err) {
            log.error(JSON.stringify(err));
          } else {
            if (result.error) {
              log.error(JSON.stringify(result.error));
            } else {
              this.userHasPermissionForApplication.set(result.data);
            }
          }
        },
      );
    }
  });
});

Template.compareResults.helpers({
  snapshotMissing() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const snapshot = Snapshots.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
          { testRunId: testRun.testRunId },
        ],
      });

      if (snapshot) {
        return snapshot.fetch().length === 0;
      }
    }
  },
  selectedCompareResultLabel() {
    return Template.instance().selectedCompareResultLabel.get();
  },
  compareResultSelected() {
    return Template.instance().compareResultSelected.get() === true;
  },

  compareResults() {
    // return CompareResults.find(query);
    const compareResults = Template.instance().compareResults.get();

    if (compareResults) {
      const distinctCompareResults = [];

      compareResults.fetch().forEach((compareResult) => {
        if (
          distinctCompareResults
            .map((distinctCompareResult) => {
              return distinctCompareResult.label;
            })
            .indexOf(compareResult.label) === -1
        ) {
          distinctCompareResults.push(compareResult);
        } else {
          if (
            compareResult.benchmarkBaselineTestRunOK &&
            compareResult.benchmarkBaselineTestRunOK === false
          ) {
            distinctCompareResults[
              distinctCompareResults
                .map((distinctCompareResult) => {
                  return distinctCompareResult.label;
                })
                .indexOf(compareResult.label)
            ] = compareResult;
          }
        }
      });

      /* extend with test run data */

      let distinctCompareResultsWithTestRuns = [];

      distinctCompareResults.forEach((distinctCompareResult) => {
        const baselineTestRun = TestRuns.findOne({
          $and: [
            { application: distinctCompareResult.application },
            { testRunId: distinctCompareResult.baselineTestRunId },
            { testType: distinctCompareResult.testType },
            { testEnvironment: distinctCompareResult.testEnvironment },
          ],
        });

        distinctCompareResultsWithTestRuns.push(
          _.extend(distinctCompareResult, {
            applicationRelease: baselineTestRun.applicationRelease,
            annotations: baselineTestRun.annotations,
          }),
        );
      });

      /* filter baseline === previous test run */

      const testRun = getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        FlowRouter.current().params.testRunId,
      );
      if (testRun) {
        const previousTestRunId = getPreviousTestRun(testRun, true);
        const baselineTestRunId = getFixedBaselineTestRun(testRun);

        if (previousTestRunId === baselineTestRunId) {
          distinctCompareResultsWithTestRuns =
            distinctCompareResultsWithTestRuns.filter((compareResult) => {
              return !compareResult.label.includes(
                'Compared to previous test run',
              );
            });
        }

        return distinctCompareResultsWithTestRuns;
      }
    }
  },
  fields() {
    return [
      {
        key: '_id',
        label: 'Description',
        cellClass: 'col-md-3',
        fn: (value, object) => {
          return object.label;
        },
      },
      { key: 'baselineTestRunId', label: 'Baseline', cellClass: 'col-md-2' },
      { key: 'applicationRelease', label: 'Version', cellClass: 'col-md-2' },
      { key: 'annotations', label: 'Annotations', cellClass: 'col-md-3' },
      {
        key: 'benchmarkBaselineTestRunOK',
        label: 'Result',
        fn: (value, object) => {
          return new Spacebars.SafeString(
            benchmarkResult('compared-to-baseline-test-run', object),
          );
        },
        hidden: () => {
          return !this.benchmarkBaselineTestRunOK;
        },
        cellClass: 'col-md-1' /*, sortOrder: 0, sortDirection: 'descending'*/,
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
      // {key: 'status', label: 'Status', cellClass: 'col-md-3'},
      // { key: '_id', label: '',
      //     isVisible: Template.instance().showIcons,
      //     fn: (value, object, key) =>  {
      //         return new Spacebars.SafeString(`<i id="edit-compareResult" class="fa fa-pencil" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Edit compareResult"></i>`);
      //     }
      // },

      {
        key: '_id',
        label: '',
        isVisible: Template.instance().userHasPermissionForApplication,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="delete-compareResult" class="fa fa-trash" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete compareResult"></i>`,
          );
        },
      },
    ];
  },
  settings() {
    return {
      rowsPerPage: 50,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      noDataTmpl: Template.noCompareResults,
    };
  },
  rowClass() {
    if (Template.instance().selectedCompareResultLabel.get()) {
      return function (item) {
        if (item.label === this.templateData.selectedCompareResultLabel) {
          return 'compare-result-selected';
        }
      };
    }
  },
});

Template.compareResults.events({
  'click .add-comparison'() {
    Modal.show('addComparisonModal');
  },

  'click .reactive-table.compare-results tbody tr'(event) {
    switch (event.target.id) {
      case 'delete-compareResult':
        swal({
          title: 'Delete compareResult',
          text: 'Are you sure?',
          icon: 'warning',
          buttons: ['Cancel', 'OK'],
          dangerMode: true,
        }).then((willDelete) => {
          //bound to the current `this`
          if (willDelete) {
            Meteor.call('deleteCompareResultForLabel', this);
            swal.close();
          } else {
            swal.close();
          }
        });

        break;

      default:
        Template.instance().compareResultSelected.set(true);
        Template.instance().selectedCompareResultLabel.set(this.label);
        Session.set('compareResultLabel', this.label);
        Session.set('baselineTestRunId', this.baselineTestRunId);
        break;
    }
  },
});

Template.addComparisonModal.onCreated(function addComparisonModalOnCreated() {
  Session.set('comparisonTypeSelected', false);
  Session.set('comparisonType', 'key-metrics');
  Session.set('panelsSelected', false);
  Session.set('settingsConfirmed', false);
  Session.set('testRunSelected', false);
  Session.set('applicationDashboardSelected', false);
  Session.set('settingsConfirmed', false);
  Session.set('baseline', undefined);
  Session.set('dashboards', []);
  compareResultsLocal.remove({});

  this.autorun(() => {
    const query = {
      $and: [
        { application: Session.get('application') },
        { testEnvironment: Session.get('testEnvironment') },
        { testType: Session.get('testType') },
        { testRunId: FlowRouter.current().params.testRunId },
      ],
    };

    Meteor.subscribe('compareResults', query);

    if (Session.get('baselineTestRunId')) {
      const testRunQuery = {
        $and: [
          { application: Session.get('application') },
          { testEnvironment: Session.get('testEnvironment') },
          { testType: Session.get('testType') },
          { testRunId: Session.get('baselineTestRunId') },
        ],
      };

      Meteor.subscribe('testRuns', 'compareResults', 50, testRunQuery);

      const snapshotQuery = {
        $and: [
          { application: Session.get('application') },
          { testEnvironment: Session.get('testEnvironment') },
          { testType: Session.get('testType') },
          { testRunId: Session.get('baselineTestRunId') },
        ],
      };

      Meteor.subscribe('snapshots', snapshotQuery, 'compareResults');
    }
  });
});

Template.addComparisonModal.helpers({
  testRunSelected() {
    return Session.equals('testRunSelected', true);
  },
  applicationDashboardSelected() {
    return Session.equals('applicationDashboardSelected', true);
  },
  settingsConfirmed() {
    return Session.equals('settingsConfirmed', true);
  },
  panelsSelected() {
    return Session.equals('panelsSelected', true);
  },
  baseline() {
    return Session.get('baseline');
  },
  selectedApplicationDashboards() {
    return Session.get('dashboards');
  },
  panelButtonActive: function () {
    return Session.equals('panelsSelected', false);
  },
  customComparison() {
    return Session.equals('comparisonType', 'custom');
  },
  comparisonTypeSelected() {
    return Session.equals('comparisonTypeSelected', true);
  },
  label() {
    const testRun = TestRuns.findOne({
      _id: Session.get('baseline'),
    });

    let dashboardLabels = '';

    const dashboardIds = Session.get('dashboards');

    dashboardIds.forEach((dashboardId, i) => {
      const applicationDashboard = ApplicationDashboards.findOne({
        _id: dashboardId,
      });

      if (i !== 0) {
        dashboardLabels += ', ';
      }
      dashboardLabels += applicationDashboard.dashboardLabel;
    });

    const description =
      Session.equals('comparisonType', 'custom') ? dashboardLabels : (
        'Service level indicators'
      );

    if (testRun) {
      const label = `Compared to test run ${testRun.testRunId} | version: ${testRun.applicationRelease} | ${description} `;
      Session.set('label', label);
      return label;
    }
  },
});

Template.addComparisonModal.events({
  'click #compare'() {
    const label = $('#results-label').val();

    /* Check if label already exists */

    const compareResultsWithLabel = CompareResults.find({
      $and: [
        { application: FlowRouter.current().queryParams.systemUnderTest },
        { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
        { testType: FlowRouter.current().queryParams.workload },
        { testRunId: FlowRouter.current().params.testRunId },
        { status: 'COMPLETE' },
        { label: label.trim() },
      ],
    }).fetch();

    if (compareResultsWithLabel.length > 0) {
      toastr.clear();
      toastr['error'](
        `Comparison label already exists, please modify`,
        'Error',
      );
      return;
    }

    /* Set label */

    Session.set('label', label);

    const compareResults = compareResultsLocal.find().fetch();

    Meteor.call('createCompareResults', compareResults, Session.all());
    $('#excludeRampUpTime').prop('disabled', false);
    $('#averageAll').prop('disabled', false);
    $('#evaluateResults').prop('disabled', false);
    $('#evaluateType').prop('disabled', false);
    $('#matchPattern').prop('disabled', false);
    $('#benchmarkOperator').prop('disabled', false);
    $('#benchmarkValue').prop('disabled', false);
    $('.select2-dropdown#comparison-panel').prop('disabled', false);
    $('.select2-dropdown#application-dashboard').prop('disabled', false);
    $('.select2-dropdown#baseline-test-run').prop('disabled', false);

    Session.set('comparisonTypeSelected', false);
    Session.set('comparisonType', 'key-metrics');
    Session.set('panelsSelected', false);
    Session.set('settingsConfirmed', false);
    Session.set('testRunSelected', false);
    Session.set('applicationDashboardSelected', false);
    Session.set('settingsConfirmed', false);
    Session.set('excludeRampUpTime', true);
    Session.set('averageAll', false);
    Session.set('evaluateResults', false);
    Session.set('evaluateType', 'avg');
    Session.set('matchPattern', undefined);
    Session.set('benchmarkOperator', 'pst');
    Session.set('benchmarkValue', undefined);
    Session.set('settingsConfirmed', false);
    Session.set('baseline', undefined);
    Session.set('dashboards', []);

    compareResultsLocal.remove({});

    // noinspection JSCheckFunctionSignatures
    Modal.hide('addComparisonModal');
  },
  'click #reset'() {
    $('#excludeRampUpTime').prop('disabled', false);
    $('#averageAll').prop('disabled', false);
    $('#evaluateResults').prop('disabled', false);
    $('#evaluateType').prop('disabled', false);
    $('#matchPattern').prop('disabled', false);
    $('#benchmarkOperator').prop('disabled', false);
    $('#benchmarkValue').prop('disabled', false);
    $('.select2-dropdown#comparison-panel').prop('disabled', false);
    $('.select2-dropdown#application-dashboard').prop('disabled', false);
    $('.select2-dropdown#baseline-test-run').prop('disabled', false);

    Session.set('comparisonTypeSelected', false);
    Session.set('comparisonType', 'key-metrics');
    Session.set('panelsSelected', false);
    Session.set('settingsConfirmed', false);
    Session.set('testRunSelected', false);
    Session.set('applicationDashboardSelected', false);
    Session.set('settingsConfirmed', false);
    Session.set('excludeRampUpTime', true);
    Session.set('averageAll', false);
    Session.set('evaluateResults', false);
    Session.set('evaluateType', 'avg');
    Session.set('matchPattern', undefined);
    Session.set('benchmarkOperator', 'pst');
    Session.set('benchmarkValue', undefined);
    Session.set('settingsConfirmed', false);
    Session.set('baseline', undefined);
    Session.set('dashboards', []);

    // noinspection JSCheckFunctionSignatures
    Modal.hide('addComparisonModal');

    Modal.show('addComparisonModal');
  },
  'click #select-panels'() {
    let allOk = true;
    const compareResults = compareResultsLocal.find().fetch();

    compareResults.every((compareResult) => {
      if (compareResult.benchmark) {
        if (!compareResult.benchmark.value) {
          toastr.clear();
          toastr['error'](
            `No comparison threshold set for dashboard ${compareResult.dashboardLabel}`,
            'Error',
          );
          allOk = false;
          return false;
        }
      }
    });

    if (!allOk) return;

    Session.set('panelsSelected', true);
    $('.select2-dropdown#comparison-panel').prop('disabled', true);
  },
  'change #comaprison-type': function (event) {
    switch (event.currentTarget.value) {
      case 'custom':
        Session.set('comparisonType', 'custom');
        break;
      case 'key-metrics':
        Session.set('comparisonType', 'key-metrics');
        break;
    }
  },
});

Template.noCompareResults.helpers({
  snapshotMissing() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const snapshot = Snapshots.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
          { testRunId: testRun.testRunId },
        ],
      });

      if (snapshot) {
        return snapshot.fetch().length === 0;
      }
    }
  },
});
