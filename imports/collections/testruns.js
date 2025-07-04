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

export const TestRuns = new Mongo.Collection('testRuns');

const TestRunSchema = new SimpleSchema({
  application: {
    type: String,
    index: 1,
    label: 'System under test',
    optional: true,
  },
  testType: {
    label: 'Workload',
    index: 1,
    type: String,
    optional: true,
  },
  testEnvironment: {
    type: String,
    index: 1,
    optional: true,
  },
  start: {
    type: Date,
    autoform: {
      // afFieldInput: {
      //     type: "bootstrap-datetimepicker",
      //     dateTimePickerOptions: {
      //         format: 'DD-MM-YYYY  HH:mm',
      //         // locale: 'nl'
      //     },
      // }
      type: 'hidden',
    },
    optional: true,
  },
  end: {
    type: Date,
    index: 1,
    autoform: {
      // afFieldInput: {
      //     type: "bootstrap-datetimepicker",
      //     dateTimePickerOptions: {
      //         format: 'DD-MM-YYYY  HH:mm',
      //         // locale: 'nl'
      //     },
      // }
      type: 'hidden',
    },
    optional: true,
  },
  plannedDuration: {
    type: Number,
    optional: true,
  },

  duration: {
    type: Number,
    optional: true,
  },
  rampUp: {
    type: Number,
    optional: true,
  },
  testRunId: {
    type: String,
    index: 1,
    optional: true,
  },
  completed: {
    type: Boolean,
    optional: true,
  },
  CIBuildResultsUrl: {
    type: String,
    optional: true,
  },
  applicationRelease: {
    type: String,
    optional: true,
  },
  annotations: {
    type: String,
    optional: true,
  },
  tags: {
    type: [String],
    optional: true,
  },
  abort: {
    type: Boolean,
    optional: true,
  },
  abortMessage: {
    type: String,
    optional: true,
  },
  viewedBy: {
    type: [String],
    optional: true,
  },
  /* status */

  status: {
    type: Object,
    optional: true,
  },
  'status.creatingSnapshots': {
    type: String,
    optional: true,
  },
  'status.evaluatingChecks': {
    type: String,
    optional: true,
  },
  'status.evaluatingComparisons': {
    type: String,
    optional: true,
  },
  'status.evaluatingAdapt': {
    type: String,
    optional: true,
  },
  'status.lastUpdate': {
    type: Date,
    optional: true,
  },

  consolidatedResult: {
    type: Object,
    optional: true,
  },

  'consolidatedResult.overall': {
    type: Boolean,
    optional: true,
  },
  'consolidatedResult.meetsRequirement': {
    type: Boolean,
    optional: true,
  },
  'consolidatedResult.benchmarkPreviousTestRunOK': {
    type: Boolean,
    optional: true,
  },
  'consolidatedResult.benchmarkBaselineTestRunOK': {
    type: Boolean,
    optional: true,
  },
  'consolidatedResult.adaptTestRunOK': {
    type: Boolean,
    optional: true,
  },
  expires: {
    type: Number,
  },
  expired: {
    type: Boolean,
  },
  adapt: {
    type: Object,
    optional: true,
  },
  'adapt.mode': {
    type: String, // ENUM DEFAULT, BASELINE, DEBUG
  },
  'adapt.differencesAccepted': {
    type: String, // ENUM TBD, ACCEPTED, DENIED
  },
  valid: {
    type: Boolean,
    defaultValue: true,
  },

  reasonsNotValid: {
    type: [String],
    optional: true,
  },

  /* Dynamic variables */

  variables: {
    type: [Object],
    optional: true,
  },

  'variables.$.value': {
    type: String,
    optional: true,
  },
  'variables.$.placeholder': {
    type: String,
    optional: true,
  },
  /* Alerts */

  alerts: {
    type: [Object],
    optional: true,
  },
  'alerts.$.annotations': {
    type: [Object],
    optional: true,
  },
  'alerts.$.annotations.$.grafanaId': {
    type: String,
    optional: true,
  },
  'alerts.$.annotations.$.id': {
    type: Number,
    optional: true,
  },
  'alerts.$.timestamp': {
    type: Date,
    optional: true,
  },
  'alerts.$.level': {
    type: String,
    optional: true,
  },
  'alerts.$.previousLevel': {
    type: String,
    optional: true,
  },
  'alerts.$.message': {
    type: String,
    optional: true,
  },
  'alerts.$.url': {
    type: String,
    optional: true,
  },
  'alerts.$.tags': {
    type: [Object],
    optional: true,
  },
  'alerts.$.tags.$.key': {
    type: String,
    optional: true,
  },
  'alerts.$.tags.$.value': {
    type: String,
    optional: true,
  },
  'alerts.$.generatorUrl': {
    type: String,
    optional: true,
  },
  'alerts.$.dashboardUrl': {
    type: String,
    optional: true,
  },
  'alerts.$.panelUrl': {
    type: String,
    optional: true,
  },

  /* Events */

  events: {
    type: [Object],
    optional: true,
  },
  'events.$.timestamp': {
    type: Date,
    optional: true,
  },
  'events.$.title': {
    type: String,
    optional: true,
  },
  'events.$.description': {
    type: String,
    optional: true,
  },
  'events.$.tags': {
    type: [String],
    optional: true,
  },
  'events.$.annotations': {
    type: [Object],
    optional: true,
  },
  'events.$.annotations.$.grafanaId': {
    type: String,
    optional: true,
  },
  'events.$.annotations.$.id': {
    type: Number,
    optional: true,
  },

  /* Report */

  reportComparisons: {
    type: [Object],
    optional: true,
  },
  'reportComparisons.$.compareResultLabel': {
    type: String,
    optional: true,
  },
  'reportComparisons.$.baselineTestRunId': {
    type: String,
    optional: true,
  },
  'reportComparisons.$.annotation': {
    type: String,
    optional: true,
  },
  reportAnnotations: {
    type: [Object],
    optional: true,
  },
  'reportAnnotations.$.application': {
    type: String,
    optional: true,
  },
  'reportAnnotations.$.testType': {
    label: 'Workload',
    type: String,
    optional: true,
  },
  'reportAnnotations.$.testEnvironment': {
    type: String,
    optional: true,
  },
  'reportAnnotations.$.grafana': {
    type: String,
    optional: true,
  },
  'reportAnnotations.$.dashboardName': {
    type: String,
    optional: true,
  },
  'reportAnnotations.$.dashboardLabel': {
    type: String,
    optional: true,
  },
  'reportAnnotations.$.dashboardUid': {
    type: String,
    optional: true,
  },
  'reportAnnotations.$.index': {
    type: Number,
    optional: true,
  },
  'reportAnnotations.$.panel': {
    type: Object,
    optional: true,
  },

  'reportAnnotations.$.panel.title': {
    type: String,
    optional: true,
  },
  'reportAnnotations.$.panel.id': {
    type: Number,
    optional: true,
  },
  'reportAnnotations.$.panel.annotation': {
    type: String,
    optional: true,
  },

  /* Report requirements */

  reportRequirements: {
    type: [Object],
    optional: true,
  },

  'reportRequirements.$.index': {
    type: Number,
    optional: true,
    autoform: {
      type: 'hidden',
    },
  },

  'reportRequirements.$.requirementText': {
    type: String,
  },
  'reportRequirements.$.requirementResult': {
    optional: true,
    type: Boolean,
    autoform: {
      type: 'hidden',
      defaultValue: false,
    },
  },

  /* Deep links */

  deepLinks: {
    type: [Object],
    optional: true,
  },

  'deepLinks.$.name': {
    type: String,
    optional: true,
  },
  'deepLinks.$.type': {
    type: String,
    optional: true,
  },
  'deepLinks.$.pluginName': {
    type: String,
    optional: true,
  },
  'deepLinks.$.url': {
    type: String,
    optional: true,
  },
});

TestRuns.attachSchema(TestRunSchema);

if (Meteor.isClient) {
  window.TestRuns = TestRuns;
  window.TestRunSchema = TestRunSchema;
}
