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

import { Template } from 'meteor/templating';
import { Meteor } from 'meteor/meteor';
import { dynamicSortNestedMultiple, getTestRun } from '/imports/helpers/utils';
import { ReactiveVar } from 'meteor/reactive-var';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import './trackedRegression.html';
import './testRunDataScienceCompareResults';
import { $ } from 'meteor/jquery';
import './classificationFilter.js';
import './conclusionFilter.js';
import './ignoredFilter.js';
import './visualizeTrackedDifferences';

Template.trackedRegression.onCreated(function trackedRegressionOnCreated() {
  this.selectedTrackedRegressionDoc = new ReactiveVar();
  this.dsCompareStatistics = new ReactiveVar();
  this.testRunId = new ReactiveVar();
  this.dsCompareResult = new ReactiveVar();
  this.dsCompareConfig = new ReactiveVar();
  this.metricClassification = new ReactiveVar();
  this.fetchedData = new ReactiveVar(false);
  this.selectedTrackedRegression = new ReactiveVar(
    this.data.trackedRegressions.length > 0 ?
      `${this.data.trackedRegressions[0].testRunId}${this.data.trackedRegressions[0].DsAdaptTrackedResults.applicationDashboardId}${this.data.trackedRegressions[0].DsAdaptTrackedResults.panelId}${this.data.trackedRegressions[0].DsAdaptTrackedResults.metricName}`
    : '',
  );
  this.selectedTrackedRegressionDoc = new ReactiveVar();

  this.autorun(() => {
    const selectedTrackedRegressionDoc = this.data.trackedRegressions.find(
      (trackedRegression) =>
        `${trackedRegression.testRunId}${trackedRegression.DsAdaptTrackedResults.applicationDashboardId}${trackedRegression.DsAdaptTrackedResults.panelId}${trackedRegression.DsAdaptTrackedResults.metricName}` ===
        this.selectedTrackedRegression.get(),
    );
    this.selectedTrackedRegressionDoc.set(selectedTrackedRegressionDoc);
  });
});

Template.trackedRegression.helpers({
  fetchedData() {
    return Template.instance().fetchedData.get();
  },
  comparisonType() {
    return 'compared-to-previous-test-run';
  },
  panelYAxesFormat() {
    if (Template.instance().dsCompareStatistics.get()) {
      return Template.instance().dsCompareStatistics.get().panel.fieldConfig
        .defaults.unit;
    }
  },
  metric() {
    // if(Template.instance().dsCompareResult.get() && Template.instance().metricClassification.get() && Template.instance().dsCompareConfig.get()) {
    //     let metric = Template.instance().dsCompareResult.get();
    //     metric.category = Template.instance().metricClassification.get().metricClassification;
    //     metric.higherIsBetter = Template.instance().metricClassification.get().higherIsBetter;
    //     metric.dsCompareConfig = Template.instance().dsCompareConfig.get();
    //     return metric;
    // }
    return Template.instance().selectedTrackedRegressionDoc.get();
  },
  dsCompareStatistics() {
    if (Template.instance().dsCompareStatistics.get()) {
      return Template.instance().dsCompareStatistics.get();
    }
  },
  selectedTrackedRegression() {
    return Template.instance().selectedTrackedRegression.get();
  },
  rowClass() {
    if (Template.instance().selectedTrackedRegression.get()) {
      return function (item) {
        // let rowClass = (item.ignore.ignore === true) ? 'ignored ' : '';
        let rowClass = '';

        if (
          `${item.testRunId}${item.DsAdaptTrackedResults.applicationDashboardId}${item.DsAdaptTrackedResults.panelId}${item.DsAdaptTrackedResults.metricName}` ===
          this.templateData.selectedTrackedRegression
        ) {
          rowClass += 'profile-selected';
        }
        return rowClass;
      };
    }
  },
  trackedRegressions() {
    return this.trackedRegressions.sort(
      dynamicSortNestedMultiple(
        'testRunId',
        'DsAdaptTrackedResults.applicationDashboardId',
        'DsAdaptTrackedResults.panelId',
        'DsAdaptTrackedResults.metricName',
      ),
    );
  },
  selectedTrackedRegressions() {
    return this.trackedRegressions.find(
      (trackedRegression) =>
        `${trackedRegression.testRunId}${trackedRegression.DsAdaptTrackedResults.applicationDashboardId}${trackedRegression.DsAdaptTrackedResults.panelId}${trackedRegression.DsAdaptTrackedResults.metricName}` ===
        Template.instance().selectedTrackedRegression.get(),
    );
  },
  testRunId() {
    if (Template.instance().selectedTrackedRegressionDoc)
      return Template.instance().selectedTrackedRegressionDoc.get().testRunId;
  },
  metricName() {
    if (Template.instance().selectedTrackedRegressionDoc)
      return Template.instance().selectedTrackedRegressionDoc.get()
        .DsAdaptTrackedResults.metricName;
  },
  dashboardLabel() {
    if (Template.instance().selectedTrackedRegressionDoc)
      return Template.instance().selectedTrackedRegressionDoc.get()
        .DsAdaptTrackedResults.dashboardLabel;
  },
  panelTitle() {
    if (Template.instance().selectedTrackedRegressionDoc)
      return Template.instance().selectedTrackedRegressionDoc.get()
        .DsAdaptTrackedResults.panelTitle;
  },
  panelId() {
    if (Template.instance().selectedTrackedRegressionDoc)
      return Template.instance().selectedTrackedRegressionDoc.get()
        .DsAdaptTrackedResults.panelId;
  },
  applicationDashboardId() {
    if (Template.instance().selectedTrackedRegressionDoc)
      return Template.instance().selectedTrackedRegressionDoc.get()
        .DsAdaptTrackedResults.applicationDashboardId;
  },

  fields() {
    return [
      { key: 'testRunId', label: 'Test run' },
      { key: 'applicationRelease', label: 'Version' },
      { key: 'annotations', label: 'Annotations' },
      { key: 'DsAdaptTrackedResults.dashboardLabel', label: 'Dashboard' },
      { key: 'DsAdaptTrackedResults.panelTitle', label: 'Panel' },
      { key: 'DsAdaptTrackedResults.metricName', label: 'Metric' },
      {
        key: 'testRunId',
        label: '',
        fn: function () {
          return new Spacebars.SafeString(
            `<i class="fa fa-lg fa-check alert-success" id="accept-regression" data-tippy-content="Click to accept regression as variability and keep test run is baseline"></i>`,
          );
        },
      },
      {
        key: 'testRunId',
        label: '',
        fn: function () {
          return new Spacebars.SafeString(
            `<i class="fa fa-lg fa-times alert-warning" id="deny-regression" data-tippy-content="Click to confirm regression and exclude test run from the baseline. You might need to adjust your SLO's"></i>`,
          );
        },
      },
    ];
  },
  settings() {
    return {
      rowsPerPage: 10,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
    };
  },
});

Template.trackedRegression.events({
  'mouseenter .reactive-table tbody tr td i'(event) {
    event.preventDefault();

    tippy('[data-tippy-content]', {
      theme: 'light-border',
    });
  },
  'click .reactive-table tbody tr'(event, template) {
    let testRun;

    switch (event.target.id) {
      case 'accept-regression':
        testRun = getTestRun(
          FlowRouter.current().queryParams.systemUnderTest,
          this.testRunId,
        );
        if (testRun) {
          Meteor.call(
            'resolveRegression',
            testRun,
            'ACCEPTED',
            true,
            (err, result) => {
              if (result.error) {
                window.toastr.clear();
                window.toastr['error'](JSON.stringify(result.error), 'Error');
              } else {
                window.toastr.clear();
                window.toastr['success'](
                  'Done!',
                  'Accepted regression as variability!',
                );
              }
            },
          );
        }
        break;

      case 'deny-regression':
        testRun = getTestRun(
          FlowRouter.current().queryParams.systemUnderTest,
          this.testRunId,
        );
        if (testRun) {
          Meteor.call(
            'resolveRegression',
            testRun,
            'DENIED',
            true,
            (err, result) => {
              if (result.error) {
                window.toastr.clear();
                window.toastr['error'](JSON.stringify(result.error), 'Error');
              } else {
                window.toastr.clear();
                window.toastr['success'](
                  'Done!',
                  'Removed test run from the baseline!',
                );
              }
            },
          );
        }
        break;
      default:
        template.selectedTrackedRegression.set(
          `${this.testRunId}${this.DsAdaptTrackedResults.applicationDashboardId}${this.DsAdaptTrackedResults.panelId}${this.DsAdaptTrackedResults.metricName}`,
        );
        break;
    }
  },
  'click #accept-tracked-diffrence'(event) {
    event.preventDefault();
    const testRunId = $(event.target).attr('test-run-id');

    Meteor.call(
      'updateDsTrackedDifferenceDetails',
      testRunId,
      'ACCEPTED',
      (error) => {
        if (error) {
          window.toastr.clear();
          window.toastr['error'](error, 'Error');
        } else {
          window.toastr.clear();
          window.toastr['success'](
            'Differences from test run included in baseline ',
            'Success',
          );
        }
      },
    );
  },
  'click #deny-tracked-diffrence'(event) {
    event.preventDefault();

    const testRunId = $(event.target).attr('test-run-id');

    Meteor.call(
      'updateDsTrackedDifferenceDetails',
      testRunId,
      'DENIED',
      (error) => {
        if (error) {
          window.toastr.clear();
          window.toastr['error'](error, 'Error');
        } else {
          window.toastr.clear();
          window.toastr['success'](
            'Differences from test run excluded from baseline ',
            'Success',
          );
        }
      },
    );
  },
});

Template.trackedRegressionDetailsModal.onCreated(
  function trackedRegressionDetailsModalOnCreated() {},
);

Template.trackedRegressionDetailsModal.helpers({
  comparisonType() {
    return 'compared-to-previous-test-run';
  },
  panelYAxesFormat() {
    return this.dsCompareStatistics.panel.fieldConfig.defaults.unit;
  },
  metric() {
    const metric = this.dsCompareResult;
    metric.category = this.metricClassification.metricClassification;
    metric.higherIsBetter = this.metricClassification.higherIsBetter;
    metric.dsCompareConfig = this.dsCompareConfig;
    return metric;
  },
  testRunId() {
    return this.testRunId;
  },
  dsCompareStatistics() {
    return this.dsCompareStatistics;
  },
});
