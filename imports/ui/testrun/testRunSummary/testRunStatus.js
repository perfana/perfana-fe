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
import { Template } from 'meteor/templating';
import { formatDate, getTestRun } from '../../../helpers/utils';

import { Benchmarks } from '../../../collections/benchmarks';
import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';

import './testRunStatus.html';
import { log } from '/both/logger';
import _ from 'lodash';

Template.testRunStatus.onCreated(function () {
  const query = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
    ],
  };

  const applicationDashboardQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
    ],
  };

  Meteor.subscribe('testRuns', 'testRunStatus', 50, query);
  Meteor.subscribe('benchmarks', query);
  Meteor.subscribe('applicationDashboards', applicationDashboardQuery);

  this.compareResultsStatus = new ReactiveVar();
  this.checkResultsStatus = new ReactiveVar();
  this.snapshotsStatus = new ReactiveVar();
  this.adaptStatus = new ReactiveVar();

  this.autorun(() => {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      Meteor.call('getTestRunCompareResultsStatus', testRun, (err, status) => {
        if (status.error) {
          log.error(JSON.stringify(status.error));
        } else {
          this.compareResultsStatus.set(status.data);
        }
      });

      Meteor.call('getTestRunCheckResultsStatus', testRun, (err, status) => {
        if (status.error) {
          log.error(JSON.stringify(status.error));
        } else {
          this.checkResultsStatus.set(status.data);
        }
      });

      Meteor.call('getTestRunSnapshotsStatus', testRun, (err, status) => {
        if (status.error) {
          log.error(JSON.stringify(status.error));
        } else {
          this.snapshotsStatus.set(status.data);
        }
      });

      Meteor.call('getTestRunAdaptStatus', testRun, (err, status) => {
        if (status.error) {
          log.error(JSON.stringify(status.error));
        } else {
          this.adaptStatus.set(status.data);
        }
      });
    }
  });
});

Template.testRunStatus.helpers({
  snapshotsStatus() {
    return Template.instance().snapshotsStatus.get();
  },
  formattedExpires() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      if (!testRun.expires || testRun.expires === 0) {
        return 'Never';
      } else {
        return formatDate(
          new Date(testRun.end).setSeconds(
            new Date(testRun.end).getSeconds() + parseInt(testRun.expires),
          ),
        );
      }
    }
  },
  hasChecks() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const benchmarks = Benchmarks.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
        ],
      });

      if (benchmarks) {
        return (
          benchmarks.fetch().filter((benchmark) => {
            return _.has(benchmark.panel, 'requirement');
          }).length > 0
        );
      }
    }
  },
  hasComparisons() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const benchmarks = Benchmarks.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
        ],
      });

      if (benchmarks) {
        return (
          benchmarks.fetch().filter((benchmark) => {
            return _.has(benchmark.panel, 'benchmark');
          }).length > 0
        );
      }
    }
  },
  hasAdapt() {
    return true; //TODO implement adapt check logic
  },
  adaptStatus() {
    return Template.instance().adaptStatus.get();
  },
  checksStatus() {
    return Template.instance().checkResultsStatus.get();
  },
  comparisonStatus() {
    return Template.instance().compareResultsStatus.get();
  },
});

Template.testRunStatus.events({
  'click .go-to-sut-settings'(event) {
    event.preventDefault();
    const queryParams = {
      systemUnderTest: FlowRouter.current().queryParams.systemUnderTest,
      workload: FlowRouter.current().queryParams.workload,
      testEnvironment: FlowRouter.current().queryParams.testEnvironment,
    };

    FlowRouter.go('systemUnderTest', null, queryParams);
  },
});
