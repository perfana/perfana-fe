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

export const CheckResults = new Mongo.Collection('checkResults');

const CheckResultsSchema = new SimpleSchema({
  application: {
    type: String,
    index: 1,
    label: 'System under test',
  },

  testEnvironment: {
    type: String,
    index: 1,
  },
  testType: {
    type: String,
    index: 1,
    label: 'Workload',
  },
  testRunId: {
    type: String,
    index: true,
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
  benchmarkId: {
    type: String,
  },
  snapshotId: {
    type: String,
  },
  snapshotKey: {
    type: String,
    optional: true,
  },
  status: {
    type: String,
  },
  message: {
    type: String,
    optional: true,
  },
  averageAll: {
    type: Boolean,
  },
  evaluateType: {
    type: String,
  },
  excludeRampUpTime: {
    type: Boolean,
  },
  rampUp: {
    type: Number,
    optional: true,
  },
  matchPattern: {
    type: String,
    optional: true,
  },
  requirement: {
    type: Object,
    optional: true,
  },
  'requirement.operator': {
    type: String,
    optional: true,
  },
  'requirement.value': {
    type: Number,
    decimal: true,
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
  snapshotPanelUrl: {
    type: String,
  },
  // results

  panelAverage: {
    type: Number,
    decimal: true,
    optional: true,
  },
  meetsRequirement: {
    type: Boolean,
    index: 1,
    optional: true,
  },

  // targets
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
  'targets.$.meetsRequirement': {
    type: Boolean,
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
});

CheckResults.attachSchema(CheckResultsSchema);

if (Meteor.isClient) {
  // Meteor.subscribe('reportPanels');
  window.CheckResults = CheckResults;
  window.CheckResultsSchema = CheckResultsSchema;
}
