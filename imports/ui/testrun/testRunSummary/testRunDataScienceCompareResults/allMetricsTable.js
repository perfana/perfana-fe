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
import { Template } from 'meteor/templating';
import { Meteor } from 'meteor/meteor';
import { dynamicSortNested, sortAdaptConclusion } from '/imports/helpers/utils';
import {
  getArrowClass,
  getSettingsMenu,
} from './testRunDataScienceCompareResults';
import { ReactiveVar } from 'meteor/reactive-var';
import { tippy } from 'tippy.js';
import 'tippy.js/dist/tippy.css'; // optional for styling
import 'tippy.js/themes/light-border.css'; // optional for styling
import './allMetricsTable.html';
import './classificationFilter.js';
import './conclusionFilter.js';
import './ignoredFilter.js';
import { formatNumber, getResultColor } from './differenceDetails';
import './visualizeTrackedDifferences';
import { getUnit } from '/imports/helpers/units';
import { log } from '/both/logger';
import _ from 'lodash';

Template.allMetricsTable.onCreated(function allMetricsTableOnCreated() {
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
  this.filteredMetrics = new ReactiveVar();
  this.conclusionFilterValue = new ReactiveVar();
  this.conclusions = new ReactiveVar();
  this.classificationFilterValue = new ReactiveVar();
  this.classifications = new ReactiveVar();
  this.ignoredFilterValue = new ReactiveVar();
  this.ignored = new ReactiveVar();
  this.activeHref = new ReactiveVar(`#overview`);

  this.autorun(() => {
    const metrics = Template.currentData().metrics;
    this.conclusions.set(
      _.uniq(metrics.map((metric) => metric.conclusion.label)),
    );
    this.classifications.set(_.uniq(metrics.map((metric) => metric.category)));
    let filteredMetrics = metrics;
    let ignored;
    if (Template.instance().ignoredFilterValue.get()) {
      ignored = Template.instance().ignoredFilterValue.get() === 'true';
      this.ignored.set(ignored);
      filteredMetrics = filteredMetrics.filter(
        (metric) => metric.conclusion.ignore === ignored,
      );
    }
    if (
      Template.instance().classificationFilterValue.get() &&
      Template.instance().conclusionFilterValue.get()
    ) {
      filteredMetrics = filteredMetrics.filter((metric) => {
        return (
          metric.category ===
            Template.instance().classificationFilterValue.get() &&
          metric.conclusion.label ===
            Template.instance().conclusionFilterValue.get()
        );
      });
      this.classifications.set(
        _.uniq(metrics.map((metric) => metric.category)),
      );
      this.conclusions.set(
        _.uniq(metrics.map((metric) => metric.conclusion.label)),
      );
    } else {
      if (Template.instance().classificationFilterValue.get()) {
        filteredMetrics = filteredMetrics.filter(
          (metric) =>
            metric.category ===
            Template.instance().classificationFilterValue.get(),
        );
        if (!Template.instance().conclusionFilterValue.get()) {
          this.classifications.set(
            _.uniq(metrics.map((metric) => metric.category)),
          );
          this.conclusions.set(
            _.uniq(filteredMetrics.map((metric) => metric.conclusion.label)),
          );
        } else {
          this.classifications.set(
            _.uniq(filteredMetrics.map((metric) => metric.category)),
          );
          this.conclusions.set(
            _.uniq(metrics.map((metric) => metric.conclusion.label)),
          );
        }
      }
      if (Template.instance().conclusionFilterValue.get()) {
        filteredMetrics = filteredMetrics.filter(
          (metric) =>
            metric.conclusion.label ===
            Template.instance().conclusionFilterValue.get(),
        );
        if (!Template.instance().classificationFilterValue.get()) {
          this.conclusions.set(
            _.uniq(metrics.map((metric) => metric.conclusion.label)),
          );
          this.classifications.set(
            _.uniq(filteredMetrics.map((metric) => metric.category)),
          );
        } else {
          this.conclusions.set(
            _.uniq(filteredMetrics.map((metric) => metric.conclusion.label)),
          );
          this.classifications.set(
            _.uniq(metrics.map((metric) => metric.category)),
          );
        }
      }
    }
    this.metrics.set(
      filteredMetrics.sort(sortAdaptConclusion('conclusion.label')),
    );

    // this.selectedMetricName.set(filteredMetrics.length > 0 ? `${filteredMetrics.sort(dynamicSortNested('-score.overall'))[0].applicationDashboardId}${filteredMetrics.sort(dynamicSortNested('-score.overall'))[0].panelId}${filteredMetrics.sort(dynamicSortNested('-score.overall'))[0].metricName}`: '');
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
});

Template.allMetricsTable.helpers({
  testRunId() {
    return FlowRouter.current().params.testRunId;
  },
  arrowClass() {
    return getArrowClass(this.metric);
  },
  comparisonType() {
    return this.comparisonType;
  },
  metric() {
    return Template.instance().metric.get();
  },
  classifications() {
    return Template.instance().classifications.get();
    // let metrics = Template.instance().metrics.get();
    // let filteredMetrics = metrics;
    // if(Template.instance().conclusionFilterValue.get() && !Template.instance().classificationFilterValue.get()){
    //     filteredMetrics = metrics.filter((metric) => metric.conclusion.label === Template.instance().conclusionFilterValue.get());
    // }
    // return _.uniq(filteredMetrics.map((metric) => metric.category));
  },
  ignored() {
    return Template.instance().ignored.get();
  },
  conclusions() {
    return Template.instance().conclusions.get();
    // let metrics = Template.instance().metrics.get();
    // let filteredMetrics = metrics;
    // if(Template.instance().classificationFilterValue.get() && !Template.instance().conclusionFilterValue.get()){
    //     filteredMetrics = metrics.filter((metric) => metric.category === Template.instance().classificationFilterValue.get());
    // }
    // return _.uniq(filteredMetrics.map((metric) => metric.conclusion.label));
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
  conclusionFilterFields() {
    return ['conclusion.label'];
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
        label: 'Dashboard' /*label: Template.dashboardFilter,*/,
      },
      { key: 'panelTitle', label: 'Panel' /*label: Template.panelFilter,*/ },
      { key: 'metricName', label: 'Metric' /*label: Template.metricFilter,*/ },
      { key: 'category', label: 'Classification' },
      { key: 'conclusion.label', label: 'Conclusion' },
      {
        key: 'statistic.test',
        label: 'Test',
        fn: (value, object) => {
          return new Spacebars.SafeString(createValueSpan(value, object.unit));
        },
      },
      {
        key: 'statistic.control',
        label: 'Control group',
        fn: (value, object) => {
          return new Spacebars.SafeString(createValueSpan(value, object.unit));
        },
      },
      {
        key: 'statistic.diff',
        label: '% diff',
        fn: (value, object) => {
          return new Spacebars.SafeString(
            createDiffSpan(
              value,
              object.higherIsBetter,
              object.statistic.pctDiff,
              'control group',
              object.unit,
            ),
          );
        },
      },
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
      // filters: [`${this.comparisonType}-${this.metricType}`]
      filters: [
        'metricNameFilter',
        'panelFilter',
        'dashboardFilter',
        'conclusionFilter',
        'classificationFilter',
      ],
      noDataTmpl: Template.noAdaptMetrics,
    };
  },
  tabActive(href) {
    return Template.instance().activeHref.get() === href;
  },
});

Template.allMetricsTable.events({
  'click .nav-tabs.adapt-details  a'(event, template) {
    event.preventDefault();
    template.activeHref.set(event.currentTarget.getAttribute('href'));
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

    switch (event.target.id) {
      case 'remove-ignore':
        dsComparisonMetricId = event.target.getAttribute(
          'dsComparisonMetricId',
        );
        const ignoreScope = event.target.getAttribute('ignore-scope');
        const ignoreRule = event.target.getAttribute('ignore-rule');
        const ignoreMetricName =
          event.target.getAttribute('ignore-metric-name');

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

const createValueSpan = (value, unitText) => {
  if (value === null) {
    return `<span class="label label-default difference-scores">No value</span>`;
  } else {
    const panelYAxesFormat = unitText ? unitText : '';

    const rawValue = parseFloat(value);
    const parsedValue =
      panelYAxesFormat === 'percentunit' ?
        Math.round((rawValue * 10000) / 100)
      : Math.round(rawValue * 100) / 100 || rawValue;

    const unit = getUnit(panelYAxesFormat);
    if (unitText) {
      return `<div class="difference-scores">${formatNumber(parsedValue)} ${unit.format}</div>`;
    } else {
      return `<div class="difference-scores">${formatNumber(parsedValue)}</div>`;
    }
  }
};

export const createDiffSpan = (
  value,
  higherIsBetter,
  pctDiff,
  baseline,
  unitText,
) => {
  if (value === null) {
    return `<span class="label label-default difference-scores">Not in ${baseline}</span>`;
  } else {
    const resultColor = getResultColor(value, higherIsBetter);
    const plusMinus =
      value > 0 ? '+'
      : value > 0 ? '-'
      : '';
    const diffPercentage = (pctDiff * 100).toFixed(0);
    const panelYAxesFormat = unitText ? unitText : '';

    const rawValue = parseFloat(value);
    const parsedValue =
      panelYAxesFormat === 'percentunit' ?
        Math.round((rawValue * 10000) / 100)
      : Math.round(rawValue * 100) / 100 || rawValue;

    const unit = getUnit(panelYAxesFormat);

    if (panelYAxesFormat !== '') {
      return `<span class="${resultColor} difference-scores">${plusMinus} ${formatNumber(parsedValue)}  ${unit.format} (${diffPercentage}%) </span>`;
    } else {
      return `<span class="${resultColor} difference-scores">${plusMinus} ${formatNumber(parsedValue)} (${diffPercentage}%) </span>`;
    }
  }
};
