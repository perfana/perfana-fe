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

import './selectPyroscopeBaseline.html';

Template.selectPyroscopeBaseline.onRendered(function () {
  const format = (item) => {
    const testRun = TestRuns.findOne({
      _id: item.id,
    });

    if (testRun) {
      return `<div title="ID: ${testRun.testRunId} | version: ${testRun.applicationRelease}">${item.text}</div>`;
    }
  };

  // Enable select2
  $('.select2-dropdown#pyroscope-baseline-test-run')
    .select2({
      placeholder: 'Select test run',
      allowClear: false,
      multiple: false,
      formatResult: format,
      formatSelection: format,
    })
    .on('change', function () {
      Session.set(
        'pyroscopeBaseline',
        $('.select2-dropdown#pyroscope-baseline-test-run').val(),
      );
    });

  Meteor.setTimeout(() => {
    $('#pyroscope-baseline-test-run option:eq(0)')
      .prop('selected', true)
      .trigger('change');
  }, 100);
});

Template.selectPyroscopeBaseline.onCreated(function () {
  const query = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
    ],
  };

  Meteor.subscribe('testRuns', 'selectPyroscopeBaseline', 50, query);

  Session.set('pyroscopeBaselineSelected', false);
});

Template.selectPyroscopeBaseline.helpers({
  testRuns() {
    const currentTestRun = TestRuns.findOne({
      $and: [
        { application: Session.get('application') },
        { testEnvironment: Session.get('testEnvironment') },
        { testType: Session.get('testType') },
        { testRunId: FlowRouter.current().params.testRunId },
      ],
    });

    if (currentTestRun) {
      return TestRuns.find(
        {
          $and: [
            { application: Session.get('application') },
            { testEnvironment: Session.get('testEnvironment') },
            { testType: Session.get('testType') },
            { completed: true },
          ],
        },
        { sort: { end: -1 } },
      )
        .fetch()
        .filter((testRun) => {
          return (
            testRun.testRunId !== currentTestRun.testRunId &&
            new Date(testRun.end) < new Date(currentTestRun.end)
          );
        });
    }
  },
  testRunButtonActive: function () {
    return Session.get('pyroscopeBaselineSelected') === false;
  },
  pyroscopeBaselineSelected: function () {
    return Session.get('pyroscopeBaselineSelected') === true;
  },
  selectedTestRun() {
    const testRun = TestRuns.findOne({
      _id: Session.get('pyroscopeBaseline'),
    });

    if (testRun) return testRun;
  },
  testRunHasAnnotations() {
    const testRun = TestRuns.findOne({
      _id: Session.get('pyroscopeBaseline'),
    });

    if (testRun && testRun.annotations) return testRun.annotations.length > 0;
  },
});

Template.selectPyroscopeBaseline.events({
  'click #select-baseline'() {
    Session.set('pyroscopeBaselineSelected', true);
    $('.select2-dropdown#pyroscope-baseline-test-run').prop('disabled', true);
  },
  'change #results-label'(event) {
    Session.set('label', event.target.value);
  },
});
