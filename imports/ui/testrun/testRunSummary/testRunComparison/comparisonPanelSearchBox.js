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

import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Meteor } from 'meteor/meteor';
import { $ } from 'meteor/jquery';
import { compareResultsLocal } from '/client/main';
import { GrafanaDashboards } from '/imports/collections/grafanaDashboards';
import { ApplicationDashboards } from '/imports/collections/applicationDashboards';
import { TestRuns } from '/imports/collections/testruns';

import './comparisonPanelSearchBox.html';
import { getUnit } from '/imports/helpers/units';
import { supportedPanelTypes } from '/both/grafanaConfig';

Template.comparisonPanelSearchBox.onRendered(function () {
  const self = this.data;
  const selector = `.select2-dropdown#comparison-panel-${self.applicationDashboardId}`;

  // Enable select2
  $(selector)
    .select2({
      placeholder: 'Select panels',
      allowClear: true,
      multiple: true,
    })
    .on('change', function () {
      const testRunId = FlowRouter.current().params.testRunId;
      const application = FlowRouter.current().queryParams.systemUnderTest;
      const testEnvironment = FlowRouter.current().queryParams.testEnvironment;
      const testType = FlowRouter.current().queryParams.workload;

      const applicationDashboard = ApplicationDashboards.findOne({
        _id: self.applicationDashboardId,
      });

      if (applicationDashboard) {
        const baselineTestRun = TestRuns.findOne({
          _id: self.baseline,
        });

        if (baselineTestRun) {
          /* remove first */
          compareResultsLocal.remove({
            $and: [
              { grafana: applicationDashboard.grafana },
              { dashboardUid: applicationDashboard.dashboardUid },
              { dashboardLabel: applicationDashboard.dashboardLabel },
            ],
          });

          const selector = `.select2-dropdown#comparison-panel-${self.applicationDashboardId}`;
          $(selector)
            .select2('data')
            .forEach((data) => {
              if (
                Template.instance() &&
                Template.instance().overrideSettings &&
                Template.instance().overrideSettings.get() === true
              ) {
                const benchmark =
                  Template.instance().evaluateResults.get() === false ?
                    undefined
                  : {
                      operator: Template.instance().benchmarkOperator.get(),
                      value: Template.instance().benchmarkValue.get(),
                    };

                compareResultsLocal.insert({
                  application: application,
                  testEnvironment: testEnvironment,
                  testType: testType,
                  testRunId: testRunId,
                  baselineTestRunId: baselineTestRun.testRunId,
                  grafana: applicationDashboard.grafana,
                  dashboardUid: applicationDashboard.dashboardUid,
                  dashboardLabel: applicationDashboard.dashboardLabel,
                  panelTitle: data.text,
                  panelId: data.id.split('|')[0],
                  panelType: data.id.split('|')[1],
                  panelYAxesFormat: data.id.split('|')[2],
                  status: 'NEW',
                  averageAll: Template.instance().averageAll.get(),
                  evaluateType: Template.instance().evaluateType.get(),
                  matchPattern: Template.instance().matchPattern.get(),
                  excludeRampUpTime:
                    Template.instance().excludeRampUpTime.get(),
                  benchmark: benchmark,
                });
              } else {
                compareResultsLocal.insert({
                  application: application,
                  testEnvironment: testEnvironment,
                  testType: testType,
                  testRunId: testRunId,
                  baselineTestRunId: baselineTestRun.testRunId,
                  grafana: applicationDashboard.grafana,
                  dashboardUid: applicationDashboard.dashboardUid,
                  dashboardLabel: applicationDashboard.dashboardLabel,
                  panelTitle: data.text,
                  panelId: data.id.split('|')[0],
                  panelType: data.id.split('|')[1],
                  panelYAxesFormat: data.id.split('|')[2],
                  status: 'NEW',
                });
              }
            });
        }
      }
    });

  $(selector).on('select2:unselecting', function (evt) {
    if (!evt.params.args.originalEvent) return;
    evt.params.args.originalEvent.stopPropagation();
  });

  Meteor.setTimeout(() => {
    const selector = `.select2-dropdown#comparison-panel-${self.applicationDashboardId} > option`;

    $(selector).prop('selected', true).trigger('change');
  }, 200);
});

Template.comparisonPanelSearchBox.onCreated(function () {
  this.overrideSettings = new ReactiveVar(false);
  this.excludeRampUpTime = new ReactiveVar(true);
  this.averageAll = new ReactiveVar(false);
  this.evaluateResults = new ReactiveVar(false);
  this.evaluateType = new ReactiveVar('avg');
  this.matchPattern = new ReactiveVar();
  this.benchmarkOperator = new ReactiveVar('pst');
  this.benchmarkValue = new ReactiveVar();

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
  Meteor.subscribe('snapshots', snapshotQuery, 'comparisonPanelSearchBox');

  const grafanaDashboardsQuery = {
    $and: [{ usedBySUT: Session.get('application') }],
  };

  Meteor.subscribe('grafanaDashboards', grafanaDashboardsQuery);

  Session.set('panelsSelected', false);
});

Template.comparisonPanelSearchBox.helpers({
  panels() {
    const applicationDashboard = ApplicationDashboards.findOne({
      _id: this.applicationDashboardId,
    });

    if (applicationDashboard) {
      const grafanaDashboard = GrafanaDashboards.findOne({
        $and: [
          { grafana: applicationDashboard.grafana },
          { uid: applicationDashboard.dashboardUid },
        ],
      });

      if (grafanaDashboard)
        return grafanaDashboard.panels.filter((panel) => {
          // return panel.type === 'graph' || panel.type === 'timeseries' || panel.type === 'table' || panel.type === 'table-old';
          return supportedPanelTypes.indexOf(panel.type) !== -1;
        });
    }
  },
  dashboardLabel() {
    const applicationDashboard = ApplicationDashboards.findOne({
      _id: this.applicationDashboardId,
    });

    if (applicationDashboard) {
      return applicationDashboard.dashboardLabel;
    }
  },
  panelsSelected() {
    return Session.equals('panelsSelected', true);
  },
  overrideSettings() {
    return Template.instance().overrideSettings.get();
  },
  excludeRampUpTime() {
    return Template.instance().excludeRampUpTime.get();
  },
  averageAll() {
    return Template.instance().averageAll.get();
  },
  evaluateResults() {
    return Template.instance().evaluateResults.get();
  },
  evaluateType() {
    return Template.instance().evaluateType.get();
  },
  matchPattern() {
    return Template.instance().matchPattern.get();
  },
  benchmarkOperator() {
    return Template.instance().benchmarkOperator.get();
  },
  benchmarkValue() {
    return Template.instance().benchmarkValue.get();
  },
  getUnit(format) {
    const unit = getUnit(format);
    if (
      unit.name &&
      unit.name !== 'short' &&
      unit.name !== '' &&
      unit.name !== null
    ) {
      return ` | ${unit.name}`;
    }
  },
});

Template.comparisonPanelSearchBox.events({
  'change .overrideSettings'() {
    if (Template.instance().overrideSettings.get() === false) {
      Template.instance().overrideSettings.set(true);
    } else {
      Template.instance().overrideSettings.set(true);
    }
  },
  'change .excludeRampUpTime'() {
    if (Template.instance().excludeRampUpTime.get() === false) {
      Template.instance().excludeRampUpTime.set(true);
    } else {
      Template.instance().excludeRampUpTime.set(true);
    }
    const selector = `.select2-dropdown#comparison-panel-${this.applicationDashboardId} > option:selected`;
    $(selector).trigger('change');
  },
  'change .averageAll'() {
    if (Template.instance().averageAll.get() === false) {
      Template.instance().averageAll.set(true);
    } else {
      Template.instance().averageAll.set(true);
    }
    const selector = `.select2-dropdown#comparison-panel-${this.applicationDashboardId} > option:selected`;
    $(selector).trigger('change');
  },
  'change .evaluateResults'() {
    if (Template.instance().evaluateResults.get() === false) {
      Template.instance().evaluateResults.set(true);
    } else {
      Template.instance().evaluateResults.set(true);
    }
    const selector = `.select2-dropdown#comparison-panel-${this.applicationDashboardId} > option:selected`;
    $(selector).trigger('change');
  },
  'change .evaluateType'(event) {
    Template.instance().evaluateType.set(event.target.value);
    const selector = `.select2-dropdown#comparison-panel-${this.applicationDashboardId} > option:selected`;
    $(selector).trigger('change');
  },
  'change .matchPattern'(event) {
    Template.instance().matchPattern.set(event.target.value);
    const selector = `.select2-dropdown#comparison-panel-${this.applicationDashboardId} > option:selected`;
    $(selector).trigger('change');
  },
  'change .benchmarkOperator'(event) {
    Template.instance().benchmarkOperator.set(event.target.value);
    const selector = `.select2-dropdown#comparison-panel-${this.applicationDashboardId} > option:selected`;
    $(selector).trigger('change');
  },
  'change .benchmarkValue'(event) {
    Template.instance().benchmarkValue.set(event.target.value);
    const selector = `.select2-dropdown#comparison-panel-${this.applicationDashboardId} > option:selected`;
    $(selector).trigger('change');
  },
});
