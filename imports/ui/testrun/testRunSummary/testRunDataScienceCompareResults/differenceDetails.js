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

// noinspection HtmlUnknownAttribute

import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Meteor } from 'meteor/meteor';
import tippy from 'tippy.js';
import { getUnit } from '/imports/helpers/units';
import _ from 'lodash';
import { log } from '/both/logger';

Template.differenceDetails.onCreated(function differenceDetailsOnCreated() {
  this.isClassified = new ReactiveVar(false);
  this.dsCompareConfig = new ReactiveVar();

  this.autorun(() => {
    const metric = Template.currentData().metric;
    if (metric.category !== 'UNKNOWN') {
      this.isClassified.set(true);
    }
    this.dsCompareConfig.set(metric.dsCompareConfig);
  });
});

Template.differenceDetails.helpers({
  statistic() {
    return this.dsCompareStatistics.statistic;
  },
  details() {
    const keys = ['median', 'mean', 'min', 'max'];

    const labels = {
      median: 'Median',
      mean: 'Mean',
      min: 'Minimum',
      max: 'Maximum',
    };

    if (
      this.dsCompareStatistics &&
      this.dsCompareStatistics.dsCompareStatistics
    ) {
      return keys.map((key) => {
        if (
          Object.prototype.hasOwnProperty.call(
            this.dsCompareStatistics.dsCompareStatistics,
            key,
          )
        ) {
          return {
            panel: this.dsCompareStatistics.panel,
            usedInAdapt: key === this.dsCompareStatistics.statistic.name,
            metricLabel: labels[key],
            higherIsBetter: this.metric.higherIsBetter,
            values: this.dsCompareStatistics.dsCompareStatistics[key],
          };
        }
      });
    }
  },
  conclusion() {
    let labelColor;
    switch (this.metric.conclusion.label) {
      case 'improvement':
        labelColor = 'label-success';
        break;
      case 'partial regression':
        labelColor = 'label-warning';
        break;
      case 'partial improvement':
        labelColor = 'label-warning';
        break;
      case 'regression':
        labelColor = 'label-danger';
        break;
      default:
        labelColor = 'label-default';
    }
    return new Spacebars.SafeString(
      `<span class="label ${labelColor} difference-scores">${this.metric.conclusion.label}</span>`,
    );
  },
  testValue() {
    return createValueSpan(
      this.dsCompareStatistics.dsCompareStatistics[
        this.dsCompareStatistics.statistic
      ].test,
      this.dsCompareStatistics.panel,
    );
  },
  diffValue() {
    return new Spacebars.SafeString(
      createDiffSpan(
        this.dsCompareStatistics.dsCompareStatistics[
          this.dsCompareStatistics.statistic
        ].diff,
        this.metric.higherIsBetter,
        this.dsCompareStatistics.dsCompareStatistics.pctDiff,
        'control group',
      ),
    );
  },
  dsCompareResultId() {
    return this.metric._id._str;
  },
  metricIsClassified() {
    return this.metric.category !== 'UNKNOWN';
  },
  scores() {
    const checks = this.metric.checks;
    const thresholds = this.metric.thresholds;
    const dsCompareConfig = Template.instance().dsCompareConfig.get();

    // Define keys and labels
    const keys = ['pct', 'iqr', 'abs'];
    if (this.metric.conclusion.ignore === true) {
      keys.push('ignore');
    }
    const labels = {
      pct: 'Percent',
      iqr: 'Interquartile Range',
      abs: 'Absolute',
      ignore: 'Ignore',
    };
    const descriptions = {
      pct: `The percentage difference between the test run and control group ${this.metric.statistic.name} value`,
      iqr: `How much the ${this.metric.statistic.name} value of the test run differs from the ${this.metric.statistic.name} value of control group, divided by the IQR (Interquartile Range, 25th-75th percentile range)`,
      abs: `The absolute difference between the test run and control group ${this.metric.statistic.name} value`,
    };

    // Create an array with each element being an object that merges the matching keys from "checks" and "thresholds"
    const resultArray = keys.map((key) => {
      return {
        name: key,
        dsCompareResultId: this.metric._id,
        description: descriptions[key],
        thresholdName: labels[key],
        dsCompareConfig: dsCompareConfig,
        dsCompareConfigProperty:
          key === 'ignore' ?
            dsCompareConfig.ignore
          : dsCompareConfig[`${key}Threshold`],
        higherIsBetter: this.metric.higherIsBetter,
        statistic: this.metric.statistic,
        ...checks[key],
        ...thresholds[key],
      };
    });

    if (resultArray.length > 0) return resultArray;
  },
  isClassified() {
    return Template.instance().isClassified.get();
  },
  fields() {
    return [
      {
        key: 'thresholdName',
        label: 'Threshold',
        cellClass: 'col-md-6 difference-scores',
        sortable: false,
        fn: (value, object) => {
          return new Spacebars.SafeString(
            `<div class="difference-scores">${value} <i class="fa fa-info-circle difference-scores" data-tippy-content="${object.description}"></div>`,
          );
        },
      },
      {
        key: 'dsCompareConfigProperty.value',
        label: 'Threshold value',
        cellClass: 'col-md-2 difference-scores',
        fn: (value, object) => {
          if (value === null) {
            return 'Not set';
          } else {
            if (object.thresholdName === 'Percent') {
              return `${value * 100}%`;
            } else {
              return value;
            }
          }
        },
        sortable: false,
      },
      {
        key: 'dsCompareConfigProperty.source',
        label: '',
        cellClass: 'col-md-2 difference-scores',
        fn: (value) => {
          const valueColorMap = new Map([
            ['default', 'source-default'],
            ['metric', 'source-metric'],
            ['panel', 'source-panel'],
          ]);
          const color = valueColorMap.get(value) || '';
          return new Spacebars.SafeString(
            `<span class="difference-scores label label-default ${color}">${value}</span>`,
          );
        },
        sortable: false,
      },
      {
        key: 'observedDiff',
        label: 'Observed difference',
        cellClass: 'col-md-2 difference-scores',
        fn: (value, object) => {
          return new Spacebars.SafeString(
            createDifferenceDetailsSpan(
              value,
              object,
              object.thresholdName === 'Percent',
            ),
          );
        },
        sortable: false,
      },
      {
        key: 'valid',
        label: 'Result',
        cellClass: 'col-md-2 difference-scores',
        fn: (value, object) => {
          return new Spacebars.SafeString(getResultSpan(object));
        },
        sortable: false,
      },
      // { key: 'valid', label: 'Valid', cellClass: 'col-md-2'},
      {
        key: 'name',
        label: '',
        cellClass: 'col-md-2 difference-scores',
        isVisible: Template.instance().isClassified,
        fn: (value, object) => {
          return new Spacebars.SafeString(
            getIcon(
              value,
              object.thresholdName,
              object.dsCompareConfigProperty.value,
              object.dsCompareResultId._str,
              object,
            ),
          );
        },
        sortable: false,
      },
    ];
  },
  detailsFields() {
    return [
      {
        key: 'metricLabel',
        label: 'Metric',
        cellClass: 'col-md-2 difference-scores',
        sortable: false,
        fn: (value, object) => {
          const label =
            object.usedInAdapt === true ?
              `${value} <i class="fa fa-info-circle difference-scores" data-tippy-content="Metric used in threshold analysis" >\``
            : value;
          return new Spacebars.SafeString(label);
        },
      },
      {
        key: 'values.test',
        label: 'Test',
        cellClass: 'col-md-2 difference-scores',
        sortable: false,
        fn: (value, object) => {
          return new Spacebars.SafeString(createValueSpan(value, object.panel));
        },
      },
      {
        key: 'values.control',
        label: 'Control group',
        cellClass: 'col-md-2 difference-scores',
        sortable: false,
        fn: (value, object) => {
          return new Spacebars.SafeString(createValueSpan(value, object.panel));
        },
      },
      {
        key: 'values.diff',
        label: 'Observed difference',
        cellClass: 'col-md-2 difference-scores',
        fn: (value, object) => {
          return new Spacebars.SafeString(
            createDiffSpan(
              value,
              object.higherIsBetter,
              object.values.pctDiff,
              'control group',
              object.panel,
            ),
          );
        },
        sortable: false,
      },
    ];
  },
  settings() {
    return {
      rowsPerPage: 10,
      showFilter: false,
      showNavigation: 'false',
      showNavigationRowsPerPage: 'false',
    };
  },
});

Template.differenceDetails.events({
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
      allowHTML: true,
    });
  },
  // 'click #classify'(event) {
  //     event.preventDefault();
  //     let dsCompareResultId = event.currentTarget.getAttribute('dsCompareResultId');
  //     Meteor.call('getDsCompareConfigById', dsCompareResultId, (err, response) => {
  //         if(response.error){
  //             log.error(JSON.stringify(metricClassification.error));
  //         } else{
  //
  //             Modal.show('classification', {dsCompareConfig: response.data.dsCompareConfig, dsCompareResult: response.data.dsCompareResult, filter: false});
  //         }
  //     });
  // },

  'click #change'(event) {
    event.preventDefault();
    const dsCompareResultId = event.target.getAttribute('dsCompareResultId');
    const threshold = event.target.getAttribute('threshold');
    const thresholdName = event.target.getAttribute('thresholdName');
    const thresholdValue = event.target.getAttribute('thresholdValue');
    Meteor.call(
      'getDsCompareConfigById',
      dsCompareResultId,
      (err, response) => {
        if (response.error) {
          log.error(JSON.stringify(response.error));
        } else {
          const params = {
            dsCompareResult: response.data.dsCompareResult,
            dsCompareConfig: response.data.dsCompareConfig,
            threshold: threshold,
            thresholdName: thresholdName,
            thresholdValue: thresholdValue,
          };
          Modal.show('updateThreshold', params);
        }
      },
    );
  },
  'click #remove-ignore'(event) {
    event.preventDefault();
    const source = 'default';
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
    }
    if (metricName !== null) {
      dsCompareConfig.metricName = metricName;
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
      },
    );
  },
});

const createDifferenceDetailsSpan = (
  observedDifference,
  object,
  isPercentage,
) => {
  if (object.valid === false) {
    return `<span class="label label-default difference-scores">Skipped</span>`;
  } else {
    const resultColor =
      object.isDifference === null ?
        'delta-blue'
      : getResultColor(
          observedDifference,
          object.higherIsBetter,
          object.isDifference,
        );
    const plusMinus = observedDifference > 0 ? '+' : '';
    if (isPercentage === true) {
      return `<span class="${resultColor} difference-scores">${plusMinus} ${formatNumber(observedDifference) * 100}%</span>`;
    } else {
      return `<span class="${resultColor} difference-scores">${plusMinus} ${formatNumber(observedDifference)} </span>`;
    }
  }
};

export const getResultSpan = (check) => {
  let HTML = `<i class="fa fa-minus reactive-table-icon difference-scores delta-blue"  aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Threshold not set"></i>`;

  if (check.valid === false && check.config !== null) {
    let reasonsNotValid = '';
    if (check.invalidReasons) {
      check.invalidReasons.forEach((reason, index) => {
        if (index !== 0) {
          reasonsNotValid += ' | ' + reason.replace(/"/g, '');
        } else {
          reasonsNotValid += reason.replace(/"/g, '');
        }
      });
    }
    HTML = `<i class="fa fa-warning reactive-table-icon difference-scores" style="color: darkorange;" aria-hidden="true" data-toggle="tooltip" data-placement="top" data-tippy-content="${reasonsNotValid}"></i>`;
  } else if (check.isDifference === true && check.config !== null) {
    if (check.higherIsBetter === false) {
      if (check.observedDiff > 0) {
        HTML =
          '<i class="fa fa-exclamation-circle reactive-table-icon difference-scores" style="color: red;" aria-hidden="true"></i>';
      } else {
        HTML =
          '<i class="fa fa-check reactive-table-icon difference-scores" style="color: green;" aria-hidden="true"></i>';
      }
    } else {
      if (check.observedDiff < 0) {
        HTML =
          '<i class="fa fa-exclamation-circle reactive-table-icon difference-scores" style="color: red;" aria-hidden="true"></i>';
      } else {
        HTML =
          '<i class="fa fa-check reactive-table-icon difference-scores" style="color: green;" aria-hidden="true"></i>';
      }
    }
  } else if (check.config !== null) {
    HTML =
      '<i class="fa fa-check reactive-table-icon difference-scores" style="color: green;" aria-hidden="true"></i>';
  }

  return HTML;
};

export const getIcon = (
  threshold,
  thresholdName,
  thresholdValue,
  dsCompareResultId,
  object,
) => {
  if (threshold === 'ignore') {
    return `<i class="fa fa-times-circle difference-scores" id="remove-ignore" dsCompareResultId="${dsCompareResultId}" metricName="${object.dsCompareConfig.metricName}" panelTitle="${object.dsCompareConfig.panelTitle}" panelId=${object.dsCompareConfig.panelId} dashboardUid=${object.dsCompareConfig.dashboardUid} dashboardLabel="${object.dsCompareConfig.dashboardLabel}"  applicationDashboardId=${object.dsCompareConfig.applicationDashboardId} data-tippy-content="Remove ignore">`;
  } else {
    return `<i class="fa fa-pencil difference-scores" id="change" dsCompareResultId="${dsCompareResultId}" threshold="${threshold}" thresholdName="${thresholdName}" thresholdValue="${thresholdValue}" data-tippy-content="Update threshold">`;
  }
};

const createValueSpan = (value, panel) => {
  if (value === null) {
    return `<span class="label label-default difference-scores">No value</span>`;
  } else {
    const panelYAxesFormat =
      (
        panel.fieldConfig &&
        panel.fieldConfig.defaults &&
        panel.fieldConfig.defaults.unit
      ) ?
        panel.fieldConfig.defaults.unit
      : '';
    const rawValue = parseFloat(value);
    const parsedValue =
      panelYAxesFormat === 'percentunit' ?
        Math.round(rawValue * 10000) / 100
      : Math.round(rawValue * 100) / 100 || rawValue;

    const unit = getUnit(panelYAxesFormat);

    if (panelYAxesFormat !== '') {
      return `<div class="difference-scores">${formatNumber(parsedValue)} ${unit.format}</div>`;
    } else {
      return `<div class="difference-scores">${formatNumber(parsedValue)}</div>`;
    }
  }
};

const createDiffSpan = (value, higherIsBetter, pctDiff, baseline, panel) => {
  if (value === null) {
    return `<span class="label label-default difference-scores">Not in ${baseline}</span>`;
  } else {
    const resultColor = getResultColor(value, higherIsBetter);
    const plusMinus = value > 0 ? '+' : '';
    const diffPercentage = (pctDiff * 100).toFixed(0);
    const panelYAxesFormat =
      (
        panel.fieldConfig &&
        panel.fieldConfig.defaults &&
        panel.fieldConfig.defaults.unit
      ) ?
        panel.fieldConfig.defaults.unit
      : '';

    const rawValue = parseFloat(value);
    const parsedValue =
      panelYAxesFormat === 'percentunit' ?
        Math.round(rawValue * 10000) / 100
      : Math.round(rawValue * 100) / 100 || rawValue;

    const unit = getUnit(panelYAxesFormat);

    if (panelYAxesFormat !== '') {
      return `<span class="${resultColor} difference-scores">${plusMinus} ${formatNumber(parsedValue)}  ${unit.format} (${diffPercentage}%) </span>`;
    } else {
      return `<span class="${resultColor} difference-scores">${plusMinus} ${formatNumber(parsedValue)} (${diffPercentage}%) </span>`;
    }
  }
};

export const getResultColor = (direction, higherIsBetter, isDifference) => {
  if (higherIsBetter !== undefined) {
    if (
      (direction > 0 && higherIsBetter) ||
      (direction < 0 && !higherIsBetter)
    ) {
      return 'delta-green';
    } else if (
      (direction <= 0 && higherIsBetter) ||
      (direction >= 0 && !higherIsBetter)
    ) {
      if (isDifference) {
        return 'delta-red';
      } else {
        return 'delta-orange';
      }
    } else {
      return 'delta-blue';
    }
  } else {
    return 'delta-blue';
  }
};

export const formatNumber = (value) => {
  if (value === 0) {
    return 0;
  }
  if (Math.abs(value) < 0.01) {
    return parseFloat(value.toFixed(5)).toString();
  }
  const roundedToTwoDecimals = _.round(value, 2);
  if (roundedToTwoDecimals === 0) {
    return value.toFixed(5).toString();
  } else if (Math.floor(roundedToTwoDecimals) === roundedToTwoDecimals) {
    return value.toFixed(0);
  } else {
    return value.toFixed(2).toString();
  }
};
