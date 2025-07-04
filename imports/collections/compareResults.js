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

export const CompareResults = new Mongo.Collection('compareResults');

const CompareResultsSchema = new SimpleSchema({
  application: {
    type: String,
    index: 1,
    label: 'System under test',
    optional: true,
  },
  testType: {
    label: 'Workload',
    type: String,
    index: 1,
    optional: true,
  },
  testEnvironment: {
    type: String,
    index: 1,
    optional: true,
  },
  testRunId: {
    index: 1,
    type: String,
  },
  grafana: {
    type: String,
  },
  dashboardLabel: {
    type: String,
  },
  dashboardUid: {
    type: String,
  },

  baselineTestRunId: {
    type: String,
  },

  benchmarkId: {
    type: String,
    optional: true,
  },

  panelTitle: {
    type: String,
  },
  panelId: {
    type: Number,
  },
  panelType: {
    type: String,
  },
  panelDescription: {
    type: String,
    optional: true,
  },
  panelYAxesFormat: {
    type: String,
    optional: true,
  },
  genericCheckId: {
    type: String,
    optional: true,
    autoform: {
      type: 'hidden',
    },
  },
  status: {
    type: String,
  },
  message: {
    type: String,
    optional: true,
  },
  label: {
    type: String,
  },

  averageAll: {
    type: Boolean,
    optional: true,
  },
  evaluateType: {
    type: String,
    optional: true,
  },
  matchPattern: {
    type: String,
    optional: true,
  },
  excludeRampUpTime: {
    type: Boolean,
  },
  rampUp: {
    type: Number,
    optional: true,
  },
  benchmark: {
    type: Object,
    optional: true,
  },

  'benchmark.operator': {
    type: String,
    optional: true,
  },
  'benchmark.value': {
    type: Number,
    decimal: true,
    optional: true,
  },
  'benchmark.absoluteFailureThreshold': {
    type: Number,
    decimal: true,
    optional: true,
  },

  /* results */

  /* In case of averageAll = true */
  panelAverage: {
    type: Number,
    decimal: true,
    optional: true,
  },
  benchmarkBaselineTestRunPanelAverage: {
    type: Number,
    decimal: true,
    optional: true,
  },
  benchmarkBaselineTestRunPanelAverageDelta: {
    type: Number,
    decimal: true,
    optional: true,
  },
  benchmarkBaselineTestRunPanelAverageDeltaPct: {
    type: Number,
    decimal: true,
    optional: true,
  },
  benchmarkBaselineTestRunOK: {
    type: Boolean,
    index: 1,
    optional: true,
  },

  /* Panel targets */

  targets: {
    type: [Object],
    optional: true,
  },

  'targets.$.value': {
    type: Number,
    decimal: true,
    optional: true,
  },
  'targets.$.target': {
    type: String,
    optional: true,
  },

  'targets.$.benchmarkBaselineTestRunValue': {
    type: Number,
    optional: true,
    decimal: true,
  },
  'targets.$.benchmarkBaselineTestRunOK': {
    type: Boolean,
    optional: true,
  },
  'targets.$.benchmarkBaselineTestRunDelta': {
    type: Number,
    decimal: true,
    optional: true,
  },
  'targets.$.benchmarkBaselineTestRunDeltaPct': {
    type: Number,
    decimal: true,
    optional: true,
  },

  validateWithDefaultIfNoData: {
    type: Boolean,
    optional: true,
    autoform: {
      defaultValue: false,
    },
  },
  validateWithDefaultIfNoDataValue: {
    type: Number,
    optional: true,
  },
  adHoc: {
    type: Boolean,
    optional: true,
    autoform: {
      defaultValue: false,
    },
  },
});

CompareResults.attachSchema(CompareResultsSchema);

if (Meteor.isClient) {
  window.CompareResults = CompareResults;
  window.CompareResultsSchema = CompareResultsSchema;
}
