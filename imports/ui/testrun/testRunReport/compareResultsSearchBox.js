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

import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Meteor } from 'meteor/meteor';
import { $ } from 'meteor/jquery';

import './compareResultsSearchBox.html';
import { CompareResults } from '../../../collections/compareResults';
import { TestRuns } from '../../../collections/testruns';
import _ from 'lodash';

Template.compareResultsSearchBox.onRendered(function () {
  // Enable select2
  $('.select2-dropdown#compare-result')
    .select2({
      placeholder: 'Select comparison result',
      allowClear: true,
    })
    .on('change', function () {
      Session.set(
        'selectedCompareResultBaselineTestRunId',
        $('.select2-dropdown#compare-result').val(),
      );
      Session.set(
        'selectedCompareResultLabel',
        $('.select2-dropdown#compare-result option:selected').text(),
      );
    });
});

Template.compareResultsSearchBox.onCreated(function () {
  const query = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
      { testRunId: FlowRouter.current().params.testRunId },
      { status: 'COMPLETE' },
    ],
  };

  Meteor.subscribe('compareResults', query);

  Meteor.setTimeout(() => {
    $('.select2-dropdown#compare-result option:eq(0)')
      .prop('selected', true)
      .trigger('change');
  }, 500);
});

Template.compareResultsSearchBox.helpers({
  compareResults() {
    const compareResults = CompareResults.find({
      $and: [
        { application: this.testRun.application },
        { testEnvironment: this.testRun.testEnvironment },
        { testType: this.testRun.testType },
        { testRunId: this.testRun.testRunId },
        { status: 'COMPLETE' },
      ],
    }).fetch();

    if (compareResults) {
      const distinctCompareResults = [];

      compareResults.forEach((compareResult) => {
        if (
          distinctCompareResults
            .map((distinctCompareResult) => {
              return distinctCompareResult.label;
            })
            .indexOf(compareResult.label) === -1
        ) {
          distinctCompareResults.push(compareResult);
        } else {
          if (
            compareResult.benchmarkBaselineTestRunOK &&
            compareResult.benchmarkBaselineTestRunOK === false
          ) {
            distinctCompareResults[
              distinctCompareResults
                .map((distinctCompareResult) => {
                  return distinctCompareResult.label;
                })
                .indexOf(compareResult.label)
            ] = compareResult;
          }
        }
      });

      /* extend with test run data */

      const distinctCompareResultsWithTestRuns = [];

      distinctCompareResults.forEach((distinctCompareResult) => {
        const testRun = TestRuns.findOne({
          $and: [
            { application: distinctCompareResult.application },
            { testRunId: distinctCompareResult.baselineTestRunId },
            { testType: distinctCompareResult.testType },
            { testEnvironment: distinctCompareResult.testEnvironment },
          ],
        });

        distinctCompareResultsWithTestRuns.push(
          _.extend(distinctCompareResult, {
            applicationRelease: testRun.applicationRelease,
            annotations: testRun.annotations,
          }),
        );
      });

      if (this.testRun.reportComparisons) {
        return distinctCompareResultsWithTestRuns.filter(
          (distinctCompareResultsWithTestRun) => {
            return (
              this.testRun.reportComparisons
                .map((reportComparison) => {
                  return reportComparison.compareResultLabel;
                })
                .indexOf(distinctCompareResultsWithTestRun.label) === -1
            );
          },
        );
      } else {
        return distinctCompareResultsWithTestRuns;
      }
    }
  },
});

Template.compareResultsSearchBox.events({});
