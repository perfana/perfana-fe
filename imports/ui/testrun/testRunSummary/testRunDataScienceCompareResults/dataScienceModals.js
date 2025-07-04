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

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import './dataScienceModals.html';
import { ReactiveVar } from 'meteor/reactive-var';

import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';

Template.classification.onCreated(function classificationOnCreated() {
  // this.statistic = new ReactiveVar(this.data.statistic);
  this.useRegExp = new ReactiveVar(this.data.metricClassification.regex);
  this.metricName = new ReactiveVar(
    this.data.metricClassification.metricName !== null ?
      this.data.metricClassification.metricName
    : this.data.metricClassification.metricName,
  );
  this.settingsFor = new ReactiveVar(
    this.data.metricClassification.metricName ? 'metric' : 'panel',
  );
  this.metricClassification = new ReactiveVar(this.data.metricClassification);
});

Template.classification.helpers({
  classifications() {
    return [
      { value: 'RED_rate', text: 'RED | Rate' },
      { value: 'RED_errors', text: 'RED | Errors' },
      { value: 'RED_duration', text: 'RED | Duration' },
      { value: 'USE_usage', text: 'USE | Usage' },
      { value: 'USE_saturation', text: 'USE | Saturation' },
      { value: 'USE_errors', text: 'USE | Errors' },
      { value: 'UNKNOWN', text: 'No classification' },
    ];
  },
  isCheckedSettingsForOption(value) {
    const defaultValue =
      (
        Template.instance().metricClassification.get() &&
        Template.instance().metricClassification.get().metricName
      ) ?
        'metric'
      : 'panel';
    return value === defaultValue ? 'checked' : '';
  },
  settingsForOptions() {
    return [
      { value: 'panel', text: 'all metrics in this panel' },
      { value: 'metric', text: 'specified metric' },
    ];
  },
  // statistics() {
  //     return [
  //         {value: 'median', text: 'median'},
  //         {value: 'mean', text: 'mean'},
  //         {value: 'min', text: 'minimum'},
  //         {value: 'max', text: 'maximum'},
  //     ];
  // },
  //
  // isSelectedStatistic(value) {
  //     const defaultValue = Template.instance().statistic.get()  ?  Template.instance().statistic.get() : 'median';
  //     return value === defaultValue ? 'selected' : '';
  // },
  // isSelectedSettingsForOption(value) {
  //     const defaultValue = Template.instance().metricClassification.get() && Template.instance().metricClassification.get().metricName ? 'metric' : 'panel';
  //     return value === defaultValue ? 'selected' : '';
  // },
  isSelectedClassifation(value) {
    const defaultValue =
      (
        Template.instance().metricClassification.get() &&
        Template.instance().metricClassification.get().metricClassification
      ) ?
        Template.instance().metricClassification.get().metricClassification
      : 'UNKNOWN';
    return value === defaultValue ? 'selected' : '';
  },
  isChecked() {
    const defaultChecked = !!(
      Template.instance().metricClassification.get() &&
      Template.instance().metricClassification.get().higherIsBetter === true
    );
    return defaultChecked ? 'checked' : '';
  },
  metricName() {
    return Template.instance().metricName.get();
  },
  useRegExp() {
    return Template.instance().useRegExp.get();
  },
  matchPattern() {
    return Template.instance().matchPattern.get();
  },
  useMetricName() {
    return Template.instance().settingsFor.get() === 'metric';
  },
  statistic: function () {
    return Template.instance().statistic.get();
  },
});

Template.classification.events({
  'mouseenter i#statistics-info'(event) {
    event.preventDefault();

    tippy('[data-tippy-content]', {
      theme: 'light-border',
    });
  },
  'click button#save-classification'(event, template) {
    event.preventDefault();

    const classification =
      $('#dropdown-option-classification').val() ?
        $('#dropdown-option-classification').val()
      : template.data.dsCompareConfig.metricClassification;
    const higherIsBetter =
      $('#checkbox-option') ?
        $('#checkbox-option').is(':checked')
      : template.data.dsCompareConfig.higherIsBetter; //TODO
    const metricName = template.metricName.get();
    const settingsFor = template.settingsFor.get();
    const useRegExp = template.useRegExp.get();
    // let checkConfig = {
    //         statistic: $('#dropdown-statistics').val(),
    // };

    delete this.metricClassification._id;

    if (settingsFor === 'metric') {
      this.metricClassification.metricName = metricName;
      if (useRegExp) {
        this.metricClassification.regex = true;
      }
    } else {
      delete this.metricClassification.metricName;
      delete this.metricClassification.regex;
    }

    // in case of "unclassification", set higherIsBetter to null
    if (classification === 'UNKNOWN') {
      this.metricClassification.higherIsBetter = null;
    } else {
      this.metricClassification.higherIsBetter = higherIsBetter;
    }
    this.metricClassification.metricClassification = classification;

    Meteor.call(
      'updateMetricClassification',
      this.metricClassification,
      FlowRouter.current().params.testRunId,
      (err, result) => {
        if (result.error) {
          window.toastr.clear();
          window.toastr['error'](JSON.stringify(result.error), 'Error');
        } else {
          window.toastr.clear();
          window.toastr['success']('Done!', 'Updated classification!');
        }
        // noinspection JSCheckFunctionSignatures
        Modal.hide('classification');
      },
    );
  },
  // 'change #dropdown-option-settings'(event, template) {
  //     event.preventDefault();
  //     let settingsFor = $(event.target).val();
  //     template.settingsFor.set(settingsFor);
  //
  // },
  'change [name=settingsForOption]'(event, template) {
    event.preventDefault();
    const settingsFor = event.currentTarget.value; // Get the value of the checked radio button
    template.settingsFor.set(settingsFor);
  },

  'change #use-regular-expression'(event, template) {
    if (template.useRegExp.get() === false) {
      template.useRegExp.set(true);
    } else {
      template.useRegExp.set(false);
    }
  },
  'keyup #metric-name, change #metric-name'(event, template) {
    const metricName = event.target.value;
    template.metricName.set(metricName);
  },
});

Template.updateThreshold.onCreated(function updateThresholdOnCreated() {
  this.dsCompareConfig = new ReactiveVar(this.data.dsCompareConfig);
  this.useRegExp = new ReactiveVar(this.data.dsCompareConfig.regex);
  this.metricName = new ReactiveVar(
    this.data.dsCompareConfig.metricName && true ?
      this.data.dsCompareConfig.metricName
    : this.data.dsCompareResult.metricName,
  );
  this.settingsFor = new ReactiveVar(
    this.data.dsCompareConfig.metricName ? 'metric' : 'panel',
  );
});

Template.updateThreshold.helpers({
  thresholdName() {
    return this.thresholdName;
  },
  thresholdValue() {
    if (this.thresholdName.toString() === 'Percent') {
      return this.thresholdValue === null ? '' : `${this.thresholdValue * 100}`;
    } else {
      return this.thresholdValue === null ? '' : this.thresholdValue;
    }
  },
  useMetricName() {
    return Template.instance().settingsFor.get() === 'metric';
  },
  metricName() {
    return Template.instance().metricName.get();
  },
  useRegExp() {
    return Template.instance().useRegExp.get();
  },
  isCheckedSettingsForOption(value) {
    const defaultValue =
      (
        Template.instance().dsCompareConfig.get() &&
        Template.instance().dsCompareConfig.get().metricName
      ) ?
        'metric'
      : 'panel';
    return value === defaultValue ? 'checked' : '';
  },
  settingsForOptions() {
    return [
      { value: 'panel', text: 'all metrics in this panel' },
      { value: 'metric', text: 'specified metric' },
    ];
  },
});

Template.updateThreshold.events({
  'click button#save-threshold'(event, template) {
    event.preventDefault();
    let source = 'panel';
    const metricName = template.metricName.get();
    const settingsFor = template.settingsFor.get();
    const useRegExp = template.useRegExp.get();
    const threshold = template.data.threshold;
    const thresholdName = template.data.thresholdName;

    const dsCompareConfig = {
      application: FlowRouter.current().queryParams.systemUnderTest,
      testEnvironment: FlowRouter.current().queryParams.testEnvironment,
      testType: FlowRouter.current().queryParams.workload,
      dashboardUid: this.dsCompareConfig.dashboardUid,
      dashboardLabel: this.dsCompareConfig.dashboardLabel,
      applicationDashboardId: this.dsCompareConfig.applicationDashboardId,
      panelId: this.dsCompareConfig.panelId,
      panelTitle: this.dsCompareConfig.panelTitle,
    };

    if (settingsFor === 'metric') {
      dsCompareConfig.metricName = metricName;
      source = 'metric';
      if (useRegExp) {
        dsCompareConfig.regex = true;
      }
    }

    dsCompareConfig[`${threshold}Threshold`] = {
      value:
        thresholdName === 'Percent' ?
          parseFloat($('#threshold-value').val()) / 100
        : parseFloat($('#threshold-value').val()),
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
  'change [name=settingsForOption]'(event, template) {
    event.preventDefault();
    const settingsFor = event.currentTarget.value; // Get the value of the checked radio button
    template.settingsFor.set(settingsFor);
  },
  'change #use-regular-expression'(event, template) {
    if (template.useRegExp.get() === false) {
      template.useRegExp.set(true);
    } else {
      template.useRegExp.set(false);
    }
  },
  'keyup #metric-name, change #metric-name'(event, template) {
    const metricName = event.target.value;
    template.metricName.set(metricName);
  },
});
