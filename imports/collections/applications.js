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

export const Applications = new Mongo.Collection('applications');

const ApplicationSchema = new SimpleSchema({
  team: {
    type: String,
    optional: true,
  },
  name: {
    type: String,
    label: 'Name',
    unique: true,
    index: true,
  },
  description: {
    type: String,
    label: 'Description',
  },
  tracingService: {
    type: String,
    optional: true,
  },
  pyroscopeApplication: {
    type: String,
    optional: true,
  },
  pyroscopeProfiler: {
    type: String,
    optional: true,
  },

  dynatraceEntities: {
    type: [Object],
    optional: true,
  },
  'dynatraceEntities.$.id': {
    type: String,
    optional: true,
  },
  'dynatraceEntities.$.label': {
    type: String,
    optional: true,
  },

  testEnvironments: {
    type: [Object],
  },

  'testEnvironments.$.name': {
    type: String,
    label: 'Name',
  },
  'testEnvironments.$.tracingService': {
    type: String,
    optional: true,
  },
  'testEnvironments.$.pyroscopeApplication': {
    type: String,
    optional: true,
  },

  'testEnvironments.$.pyroscopeProfiler': {
    type: String,
    optional: true,
  },

  'testEnvironments.$.dynatraceEntities': {
    type: [Object],
    optional: true,
  },
  'testEnvironments.$.dynatraceEntities.$.id': {
    type: String,
    optional: true,
  },
  'testEnvironments.$.dynatraceEntities.$.label': {
    type: String,
    optional: true,
  },
  'testEnvironments.$.testTypes': {
    type: [Object],
    optional: true,
  },
  'testEnvironments.$.testTypes.$.name': {
    type: String,
    label: 'Name',
    optional: true,
  },
  'testEnvironments.$.testTypes.$.differenceScoreThreshold': {
    type: Number,
    defaultValue: Meteor.settings.differenceScoreThreshold
      ? Meteor.settings.differenceScoreThreshold
      : 70,
    optional: true,
  },
  'testEnvironments.$.testTypes.$.enableAdapt': {
    type: Boolean,
    defaultValue: true,
    optional: true,
  },
  'testEnvironments.$.testTypes.$.runAdapt': {
    type: Boolean,
    defaultValue: true,
    optional: true,
  },
  'testEnvironments.$.testTypes.$.adaptMode': {
    type: String, // ENUM DEFAULT, BASELINE, DEBUG
    defaultValue: 'DEFAULT',
  },
  'testEnvironments.$.testTypes.$.baselineTestRun': {
    type: String,
    optional: true,
    label: 'Baseline test run',
    autoform: {
      type: 'universe-select',
      create: true,
      createOnBlur: true,
      options: [],
      optionsMethod: 'getBaselineTestRuns',
      optionsMethodParams: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace(
              /testEnvironments\.[0-9]+\.testTypes\.[0-9]+\.baselineTestRun/,
              'name',
            ),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace(
              /testEnvironments\.([0-9]+)\.testTypes\.[0-9]+\.baselineTestRun/,
              'testEnvironments.$1.name',
            ),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace(
              /testEnvironments\.([0-9]+)\.testTypes\.([0-9]+)\.baselineTestRun/,
              'testEnvironments.$1.testTypes.$2.name',
            ),
          )
        ) {
          return {
            application: AutoForm.getFieldValue(
              this.name.replace(
                /testEnvironments\.[0-9]+\.testTypes\.[0-9]+\.baselineTestRun/,
                'name',
              ),
            ),
            testEnvironment: AutoForm.getFieldValue(
              this.name.replace(
                /testEnvironments\.([0-9]+)\.testTypes\.[0-9]+\.baselineTestRun/,
                'testEnvironments.$1.name',
              ),
            ),
            testType: AutoForm.getFieldValue(
              this.name.replace(
                /testEnvironments\.([0-9]+)\.testTypes\.([0-9]+)\.baselineTestRun/,
                'testEnvironments.$1.testTypes.$2.name',
              ),
            ),
          };
        }
      },
    },
  },
  'testEnvironments.$.testTypes.$.tags': {
    type: [String],
    optional: true,
    label: 'tags',
  },
  'testEnvironments.$.testTypes.$.tracingService': {
    type: String,
    optional: true,
  },
  'testEnvironments.$.testTypes.$.pyroscopeApplication': {
    type: String,
    optional: true,
  },
  'testEnvironments.$.testTypes.$.pyroscopeProfiler': {
    type: String,
    optional: true,
  },

  'testEnvironments.$.testTypes.$.dynatraceEntities': {
    type: [Object],
    optional: true,
  },
  'testEnvironments.$.testTypes.$.dynatraceEntities.$.id': {
    type: String,
    optional: true,
  },
  'testEnvironments.$.testTypes.$.dynatraceEntities.$.label': {
    type: String,
    optional: true,
  },
  'testEnvironments.$.testTypes.$.autoCompareTestRuns': {
    type: Boolean,
    defaultValue: Meteor.settings.autoCompareTestRuns
      ? Meteor.settings.autoCompareTestRuns === true
      : false,
  },
  'testEnvironments.$.testTypes.$.autoCreateSnapshots': {
    type: Boolean,
    defaultValue: Meteor.settings.autoCreateSnapshots
      ? Meteor.settings.autoCreateSnapshots === true
      : false,
  },
});

Applications.attachSchema(ApplicationSchema);

if (Meteor.isClient) {
  window.Applications = Applications;
}
