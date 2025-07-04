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

/* eslint-disable meteor/no-session */
export const ReportRequirements = new Mongo.Collection('reportRequirements');

const ReportRequirementsSchema = new SimpleSchema({
  application: {
    type: String,
    label: 'System under test',
    autoform: {
      defaultValue: function () {
        return Session.get('application') ? Session.get('application') : '';
      },
      readOnly: function () {
        return Session.get('application') !== null;
      },
    },
  },
  testType: {
    type: String,
    label: 'Workload',
    autoform: {
      defaultValue: function () {
        return Session.get('testType') ? Session.get('testType') : '';
      },
      readOnly: function () {
        return Session.get('testType') !== null;
      },
    },
  },
  testEnvironment: {
    type: String,
    autoform: {
      defaultValue: function () {
        return Session.get('testEnvironment')
          ? Session.get('testEnvironment')
          : '';
      },
      readOnly: function () {
        return Session.get('testEnvironment') !== null;
      },
    },
  },
  index: {
    type: Number,
    optional: true,
    autoform: {
      type: 'hidden',
    },
  },

  requirementText: {
    type: String,
    autoform: {
      type: 'universe-select',
      create: true,
      createOnBlur: true,
      options: [],
      optionsMethod: 'getRequirementTexts',
      uniPlaceholder: 'Type or select from list',
    },
  },
  requirementResult: {
    optional: true,
    type: Boolean,
    autoform: {
      type: 'hidden',
      defaultValue: false,
    },
  },
});

ReportRequirements.attachSchema(ReportRequirementsSchema);

if (Meteor.isClient) {
  Meteor.subscribe('reportRequirements');
  window.ReportRequirements = ReportRequirements;
  window.ReportRequirementsSchema = ReportRequirementsSchema;

  // noinspection JSCheckFunctionSignatures
  AutoForm.addHooks(['addReportRequirement'], {
    before: {
      insert: function (doc) {
        const reportRequirements = this.collection
          .find({
            $and: [
              { application: doc.application },
              { testEnvironment: doc.testEnvironment },
              { testType: doc.testType },
            ],
          })
          .fetch();

        doc.index = reportRequirements.length;

        return doc;
      },
    },
  }, false);

  // AutoForm.addHooks(['addReportRequirement', 'editReportRequirement'], {
  //   onSuccess: function (formType, result) {
  //     // TODO update existing reports?
  //   },
  // });
}
