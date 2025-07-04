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
import { check } from 'meteor/check';
import { TestRuns } from '/imports/collections/testruns';
import { ReportRequirements } from '/imports/collections/reportRequirements';
import _ from 'lodash';

if (Meteor.isServer) {
  Meteor.publish('reportRequirements', () => ReportRequirements.find());
}

Meteor.methods({
  applyReportRequirements: (testRun) => {
    check(testRun, Object);
    const wrap = Meteor.makeAsync(applyReportRequirementsFn);

    return wrap(testRun);
  },
  deleteReportRequirement: (application, testEnvironment, testType, index) => {
    check(application, String);
    check(testEnvironment, String);
    check(testType, String);
    check(index, Number);

    ReportRequirements.remove({
      $and: [
        { application: application },
        { testEnvironment: testEnvironment },
        { testType: testType },
        { index: index },
      ],
    });

    /* update indexes */

    const updateReportRequirements = ReportRequirements.find(
      {
        $and: [
          { application: application },
          { testEnvironment: testEnvironment },
          { testType: testType },
          { index: { $gt: index } },
        ],
      },
      { sort: { index: 1 } },
    ).fetch();

    _.each(updateReportRequirements, (panel) => {
      ReportRequirements.update(
        {
          $and: [
            { application: panel.application },
            { testEnvironment: panel.testEnvironment },
            { testType: panel.testType },
            { index: panel.index },
          ],
        },
        {
          $set: {
            index: panel.index - 1,
          },
        },
      );
    });
  },

  updateApplicationRequirementsByIndex: (
    oldIndex,
    newIndex,
    application,
    testEnvironment,
    testType,
  ) => {
    check(oldIndex, Number);
    check(newIndex, Number);
    check(application, String);
    check(testEnvironment, String);
    check(testType, String);

    ReportRequirements.update(
      {
        $and: [
          { application: application },
          { testEnvironment: testEnvironment },
          { testType: testType },
          { index: oldIndex },
        ],
      },
      {
        $set: {
          index: newIndex,
        },
      },
    );
  },
  getRequirementTexts: () => {
    const distinct = Meteor.makeAsync(
      ReportRequirements.rawCollection().distinct,
      ReportRequirements.rawCollection(),
    );
    const requirementTextOptions = distinct('requirementText', {});

    return requirementTextOptions.map((r) => ({
      label: r,
      value: r,
    }));
  },
});

const applyReportRequirementsFn = (testRun, callback) => {
  const reportRequirements = ReportRequirements.find(
    {
      $and: [
        { application: testRun.application },
        { testEnvironment: testRun.testEnvironment },
        { testType: testRun.testType },
      ],
    },
    { sort: { index: 1 } },
  ).fetch();

  const updatedTestRunReportRequirements = [];

  if (testRun.reportRequirements && testRun.reportRequirements.length > 0) {
    _.each(reportRequirements, (reportRequirement, index) => {
      let reportHasRequirement = false;

      _.each(testRun.reportRequirements, (testRunRequirement) => {
        if (
          reportRequirement.requirementText ===
          testRunRequirement.requirementText
        ) {
          testRunRequirement.index = index;
          updatedTestRunReportRequirements.push(testRunRequirement);
          reportHasRequirement = true;
        }
      });

      if (reportHasRequirement === false) {
        const reportRequirementObject = {
          requirementText: reportRequirement.requirementText,
          requirementResult: reportRequirement.requirementResult,
          index: reportRequirement.index,
        };

        updatedTestRunReportRequirements.push(reportRequirementObject);
      }
    });
  } else {
    _.each(reportRequirements, (reportRequirement) => {
      const reportRequirementObject = {
        requirementText: reportRequirement.requirementText,
        requirementResult: reportRequirement.requirementResult,
        index: reportRequirement.index,
      };

      updatedTestRunReportRequirements.push(reportRequirementObject);
    });
  }

  TestRuns.update(
    {
      _id: testRun._id,
    },
    {
      $set: {
        reportRequirements: updatedTestRunReportRequirements,
      },
    },
  );

  callback(null, testRun);
};
