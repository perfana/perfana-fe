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
import { log } from '/both/logger';
import './testRunSearchBox.html';
import { dynamicSort } from '/imports/helpers/utils';

Template.testRunSearchBox.onRendered(function () {
  const format = (item) => {
    const testRun = TestRuns.findOne({
      _id: item.id,
    });

    if (testRun) {
      return `<div title="ID: ${testRun.testRunId} | version: ${testRun.applicationRelease}">${item.text}</div>`;
    }
  };

  // Enable select2
  $('.select2-dropdown#baseline-test-run')
    .select2({
      placeholder: 'Select test run',
      allowClear: false,
      multiple: false,
      formatResult: format,
      formatSelection: format,
    })
    .on('change', function () {
      Session.set('baseline', $('.select2-dropdown#baseline-test-run').val());
      Session.set(
        'baselineTestRunId',
        $('.select2-dropdown#baseline-test-run option:selected').text(),
      );
    });

  Meteor.setTimeout(() => {
    $('#baseline-test-run option:eq(0)')
      .prop('selected', true)
      .trigger('change');
  }, 200);
});

Template.testRunSearchBox.onCreated(function () {
  this.testRuns = new ReactiveVar([]);

  const query =
    this.data && this.data.systemUnderTestSettings ?
      {
        $and: [
          { application: this.data.application },
          { testEnvironment: this.data.testEnvironment },
          { testType: this.data.testType },
          { completed: true },
          { expired: false },
          {
            $or: [{ valid: { $exists: false } }, { valid: true }],
          },
        ],
      }
    : {
        $and: [
          { application: Session.get('application') },
          { testEnvironment: Session.get('testEnvironment') },
          { testType: Session.get('testType') },
          { completed: true },
          { expired: false },
          {
            $or: [{ valid: { $exists: false } }, { valid: true }],
          },
        ],
      };

  Meteor.call('getTestRuns', query, (err, testRunsResponse) => {
    if (testRunsResponse.error) {
      log.error(JSON.stringify(testRunsResponse.error));
    } else {
      this.testRuns.set(testRunsResponse.data);
    }
  });

  Session.set('testRunSelected', false);
});

Template.testRunSearchBox.helpers({
  testRuns() {
    return (
      Template.instance().testRuns &&
      Template.instance()
        .testRuns.get()
        .filter((testRun) => {
          return testRun.testRunId !== FlowRouter.current().params.testRunId;
        })
        .sort(dynamicSort('-end'))
    );
    // let query = (this.systemUnderTestSettings) ?
    //     {
    //         $and: [
    //             {application: this.application},
    //             {testEnvironment: this.testEnvironment},
    //             {testType: this.testType},
    //             {completed: true},
    //             {expired: false},
    //         ]
    //     }
    //     :
    //     {
    //         $and: [
    //             {application: Session.get('application') },
    //             {testEnvironment: Session.get('testEnvironment') },
    //             {testType: Session.get('testType') },
    //             {completed: true},
    //             {expired: false},
    //
    //         ]
    //     };
    //
    // return TestRuns.find(query, {sort: {end: -1}}).fetch().filter((testRun) => {
    //
    //     return testRun.testRunId !== FlowRouter.current().params.testRunId;
    // });
    //
  },
  testRunButtonActive: function () {
    return (
      Session.get('testRunSelected') === false && !this.systemUnderTestSettings
    );
  },
  testRunSelected: function () {
    return Session.get('testRunSelected') === true;
  },
  selectedTestRun() {
    return (
      Template.instance().testRuns &&
      Template.instance()
        .testRuns.get()
        .filter((testRun) => {
          return testRun._id === Session.get('baseline');
        })[0]
    );
  },
  testRunHasAnnotations() {
    const testRun = TestRuns.findOne({
      _id: Session.get('baseline'),
    });

    if (testRun && testRun.annotations) return testRun.annotations.length > 0;
  },
});

Template.testRunSearchBox.events({
  'click #select-baseline'() {
    Session.set('testRunSelected', true);
    $('.select2-dropdown#baseline-test-run').prop('disabled', true);
  },
  'change #results-label'(event) {
    Session.set('label', event.target.value);
  },
});
