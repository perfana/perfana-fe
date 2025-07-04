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
import { TestRuns } from '/imports/collections/testruns';

import './comparisonTypeSearchBox.html';
import { Benchmarks } from '/imports/collections/benchmarks';
import { getTestRun } from '/imports/helpers/utils';
import { compareResultsLocal } from '/client/main';

Template.comparisonTypeSearchBox.onRendered(function () {
  // Enable select2

  $('.select2-dropdown#comparison-type')
    .select2({
      placeholder: 'Select comparison type',
      allowClear: false,
      multiple: false,
    })
    .on('change', function () {
      Session.set(
        'comparisonType',
        $('.select2-dropdown#comparison-type').val(),
      );
    });

  Meteor.setTimeout(() => {
    $('#comparison-type option:eq(0)').prop('selected', true).trigger('change');
  }, 100);
});

Template.comparisonTypeSearchBox.onCreated(function () {
  const benchmarksQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
    ],
  };

  Meteor.subscribe('benchmarks', benchmarksQuery);
  Session.set('comparisonTypeSelected', false);
});

Template.comparisonTypeSearchBox.helpers({
  comparisonTypeButtonActive: function () {
    return Session.get('comparisonTypeSelected') === false;
  },
  comparisonTypeSelected: function () {
    return Session.get('comparisonTypeSelected') === true;
  },
  customComparison() {
    return Session.equals('comparisonType', 'custom');
  },
});

Template.comparisonTypeSearchBox.events({
  'click #select-comparison-type'() {
    Session.set('comparisonTypeSelected', true);
    $('.select2-dropdown#comparison-type').prop('disabled', true);

    if (Session.equals('comparisonType', 'key-metrics')) {
      const testRun = getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        FlowRouter.current().params.testRunId,
      );

      const baselineTestRun = TestRuns.findOne({
        _id: Session.get('baseline'),
      });

      // create local compareResults documents for benchmarks

      if (testRun) {
        const benchmarks = Benchmarks.find({
          $and: [
            { application: testRun.application },
            { testEnvironment: testRun.testEnvironment },
            { testType: testRun.testType },
          ],
        });

        if (benchmarks) {
          benchmarks.forEach((benchmark) => {
            if (benchmark.panel.benchmark) {
              compareResultsLocal.insert({
                application: testRun.application,
                testEnvironment: testRun.testEnvironment,
                testType: testRun.testType,
                testRunId: testRun.testRunId,
                baselineTestRunId: baselineTestRun.testRunId,
                grafana: benchmark.grafana,
                dashboardUid: benchmark.dashboardUid,
                dashboardLabel: benchmark.dashboardLabel,
                panelTitle: benchmark.panel.title,
                panelId: benchmark.panel.id,
                panelType: benchmark.panel.type,
                benchmark:
                  (
                    benchmark.panel.benchmark &&
                    benchmark.panel.benchmark.operator &&
                    benchmark.panel.benchmark.value
                  ) ?
                    benchmark.panel.benchmark
                  : undefined,
                averageAll: benchmark.panel.averageAll,
                evaluateType: benchmark.panel.evaluateType,
                matchPattern: benchmark.panel.matchPattern,
                excludeRampUpTime: benchmark.panel.excludeRampUpTime === true,
                status: 'NEW',
              });
            }
          });
        }
      }
    }
  },
});
