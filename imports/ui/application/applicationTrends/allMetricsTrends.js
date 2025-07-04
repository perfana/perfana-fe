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

// noinspection JSJQueryEfficiency

import { Template } from 'meteor/templating';
import { Meteor } from 'meteor/meteor';
import { dynamicSortNestedMultiple } from '../../../helpers/utils';
import { log } from '/both/logger';
import { ReactiveVar } from 'meteor/reactive-var';
import { tippy } from 'tippy.js';
import 'tippy.js/dist/tippy.css'; // optional for styling
import 'tippy.js/themes/light-border.css'; // optional for styling
import './allMetricsTrends.html';
import './visualizeTrends';
import './selectAggregation';
import './selectPeriodFrom';
import { Applications } from '../../../collections/applications';
import _ from 'lodash';

Template.allMetricsTrends.onCreated(function allMetricsTrendsOnCreated() {
  this.showFilter = new ReactiveVar(false);
  this.metric = new ReactiveVar();
  this.metrics = new ReactiveVar();
  this.filteredMetrics = new ReactiveVar();
  this.classificationFilterValue = new ReactiveVar();
  this.classifications = new ReactiveVar();
  this.aggregation = new ReactiveVar('median');
  this.period = new ReactiveVar('2w');
  this.periodTimestamp = new ReactiveVar(
    convertPeriodToTimestamp(this.period.get()),
  );
  this.selectedMetricName = new ReactiveVar();

  this.autorun(() => {
    this.periodTimestamp.set(convertPeriodToTimestamp(this.period.get()));
    const classificationFilterValue = this.classificationFilterValue.get();
    let selectedMetricName = this.selectedMetricName.get();

    const trendsQuery = {
      application: FlowRouter.current().queryParams.systemUnderTest,
      testEnvironment: FlowRouter.current().queryParams.testEnvironment,
      testType: FlowRouter.current().queryParams.workload,
      end: {
        $gte: this.periodTimestamp.get(),
      },
    };

    Meteor.call('getDsMetricsTrends', trendsQuery, (err, dsMetrics) => {
      if (dsMetrics.error) {
        log.error(JSON.stringify(dsMetrics.error));
      } else {
        const metrics = dsMetrics.data;
        this.classifications.set(
          _.uniq(metrics.map((metric) => metric.metricClassification)),
        );
        const metric = metrics.find(
          (metric) =>
            `${metric.applicationDashboardId}${metric.panelId}${metric.metricName}` ===
            this.selectedMetricName.get(),
        );
        if (metric) {
          this.metric.set(metric);
        }

        if (classificationFilterValue) {
          const filteredMetrics = metrics.filter(
            (metric) =>
              metric.metricClassification === classificationFilterValue,
          );
          this.filteredMetrics.set(filteredMetrics);
        } else {
          this.filteredMetrics.set(metrics);
        }

        if (!this.selectedMetricName.get()) {
          selectedMetricName =
            this.filteredMetrics.get().length > 0 ?
              `${this.filteredMetrics.get().sort(dynamicSortNestedMultiple('dashboardLabel', 'panelTitle', 'metricName'))[0].applicationDashboardId}${this.filteredMetrics.get().sort(dynamicSortNestedMultiple('dashboardLabel', 'panelTitle', 'metricName'))[0].panelId}${this.filteredMetrics.get().sort(dynamicSortNestedMultiple('dashboardLabel', 'panelTitle', 'metricName'))[0].metricName}`
            : '';
          this.selectedMetricName.set(selectedMetricName);
        }

        // this.metrics.set(metrics.sort(dynamicSortNestedMultiple('dashboardLabel', 'panelTitle', 'metricName')));
        this.showFilter.set(metrics.length > 10);
      }
    });
  });
});

Template.allMetricsTrends.onRendered(function allMetricsTrendsOnRendered() {});

Template.allMetricsTrends.helpers({
  adaptEnabled() {
    const application = Applications.findOne({
      name: FlowRouter.current().queryParams.systemUnderTest,
    });

    let testEnvironmentIndex;
    let testTypeIndex;

    if (application) {
      testEnvironmentIndex = application.testEnvironments
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
      if (testEnvironmentIndex !== -1 && testTypeIndex !== -1) {
        return (
          application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].runAdapt === true
        );
      }
    }
  },
  testRunId() {
    return FlowRouter.current().params.testRunId;
  },
  comparisonType() {
    return this.comparisonType;
  },
  metric() {
    return Template.instance().metric && Template.instance().metric.get();
  },
  classifications() {
    return Template.instance().classifications.get();
  },
  aggregation() {
    return Template.instance().aggregation.get();
  },
  periodTimestamp() {
    return Template.instance().periodTimestamp.get();
  },
  metricFilterFields() {
    return ['metricName', 'panelTitle', 'dashboardLabel'];
  },
  panelFilterFields() {
    return ['panelTitle'];
  },
  dashboardFilterFields() {
    return ['dashboardLabel'];
  },
  classificationFilterFields() {
    return ['category'];
  },
  selectedMetricName() {
    return (
      Template.instance().selectedMetricName &&
      Template.instance().selectedMetricName.get()
    );
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
    return (
      Template.instance().filteredMetrics &&
      Template.instance().filteredMetrics.get() &&
      Template.instance()
        .filteredMetrics.get()
        .sort(
          dynamicSortNestedMultiple(
            'dashboardLabel',
            'panelTitle',
            'metricName',
          ),
        )
    );
  },

  fields() {
    return [
      { key: 'dashboardLabel', label: 'Dashboard' },
      { key: 'panelTitle', label: 'Panel' },
      { key: 'metricName', label: 'Metric' },
      { key: 'metricClassification', label: 'Classification' },
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
      filters: [
        'metricNameFilter',
        'panelFilter',
        'dashboardFilter',
        'classificationFilter',
      ],
      noDataTmpl: Template.noTrendMetrics,
    };
  },
});

Template.allMetricsTrends.events({
  // 'click #filter'(event) {
  //     event.preventDefault();
  //     let dsCompareResultId = event.currentTarget.getAttribute('dsCompareResultId');
  //     Meteor.call('getDsCompareConfigById', dsCompareResultId, (err, response) => {
  //         if(response.error){
  //             log.error(JSON.stringify(response.error));
  //         } else{
  //             Modal.show('classification', {dsCompareConfig: response.data.dsCompareConfig, dsCompareResult: response.data.dsCompareResult, filter: true});
  //         }
  //     });
  // },

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

    switch (event.target.id) {
      default:
        Template.instance().selectedMetricName.set(
          `${this.applicationDashboardId}${this.panelId}${this.metricName}`,
        );
        break;
    }
  },
});

Template.trendsMetricFilter.onRendered(function trendsMetricFilterOnRendered() {
  const parentInstance = this.view.parentView.templateInstance();

  this.autorun(() => {
    FlowRouter.watchPathChange();

    const trendMetricParam = FlowRouter.getQueryParam('trendMetric');
    const trendMetricIdParam = FlowRouter.getQueryParam('trendMetricId');

    if (trendMetricParam) {
      // URL decode the metric parameter
      // const decodedMetricParam = decodeURIComponent(trendMetricParam);
      // const decodedMetricIdParam = decodeURIComponent(trendMetricIdParam);
      Meteor.setTimeout(() => {
        $('#metricNameFilter input').val(trendMetricParam);
        $('#metricNameFilter input').trigger(
          jQuery.Event('keyup', { keycode: 13 }),
        );
        parentInstance.selectedMetricName.set(trendMetricIdParam);
      }, 100);
    }
  });
});

const convertPeriodToTimestamp = (period) => {
  if (period === 'all') {
    // Considering Unix Epoch time as oldest date.
    return new Date(0);
  }

  const time = new Date(); // Current time
  const value = parseInt(period.slice(0, -1)); // Numeric part of the period
  const type = period.slice(-1); // 'w', 'm', or 'y'

  switch (type) {
    case 'w':
      time.setDate(time.getDate() - 7 * value);
      break;
    case 'm':
      time.setMonth(time.getMonth() - value);
      break;
    case 'y':
      time.setFullYear(time.getFullYear() - value);
      break;
    default:
      log.error(
        'Invalid type. Please use "w" for weeks, "m" for months, or "y" for years',
      );
      return null;
  }

  return time;
};
