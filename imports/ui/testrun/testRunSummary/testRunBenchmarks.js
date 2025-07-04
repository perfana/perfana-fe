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
import { getTestRun } from '/imports/helpers/utils';

import { CheckResults } from '/imports/collections/checkResults';
import { CompareResults } from '/imports/collections/compareResults';
import { Applications } from '/imports/collections/applications';
import { TestRuns } from '/imports/collections/testruns';
import { Benchmarks } from '/imports/collections/benchmarks';

import './testRunBenchmarks.html';
import { ReactiveVar } from 'meteor/reactive-var';
import { log } from '/both/logger';
import { Session } from 'meteor/session';
import _ from 'lodash';

Template.benchmarks.onCreated(function benchmarksOnCreated() {
  const query = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
      { testRunId: FlowRouter.current().params.testRunId },
    ],
  };

  const benchmarksQuery = {
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

  Meteor.subscribe('grafanas');
  Meteor.subscribe('checkResults', query, 'testRunBenchmarks');
  Meteor.subscribe('compareResults', query);
  Meteor.subscribe('applicationDashboards', applicationDashboardQuery);
  Meteor.subscribe('benchmarks', benchmarksQuery);

  this.userHasPermissionForApplication = new ReactiveVar(false);
  this.testRun = new ReactiveVar();

  this.autorun(() => {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      this.testRun.set(testRun);
    }
  });

  Meteor.subscribe(
    'applications',
    {},
    {
      onReady: () => {
        const application = Applications.findOne({
          name: FlowRouter.current().queryParams.systemUnderTest,
        });

        if (application) {
          Meteor.call(
            'userHasPermissionForApplication',
            application.name,
            (err, result) => {
              if (result.error) {
                log.error(JSON.stringify(result.error));
              } else {
                this.userHasPermissionForApplication.set(result.data);
              }
            },
          );
        }
      },
    },
  );
});

Template.benchmarks.helpers({
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
  testRunHasBenchmarks() {
    const testRun = Template.instance().testRun.get();

    if (testRun) {
      const checkResults = CheckResults.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
          { testRunId: testRun.testRunId },
          {
            $or: [{ status: 'COMPLETE' }, { status: 'ERROR' }],
          },
        ],
      }).fetch();

      const compareResults = CompareResults.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
          { testRunId: testRun.testRunId },
          {
            $or: [{ status: 'COMPLETE' }, { status: 'ERROR' }],
          },
        ],
      }).fetch();

      return checkResults.length + compareResults.length > 0;
    }
  },
  testRunHasComparisonResults() {
    const testRun = Template.instance().testRun.get();

    if (testRun)
      return (
        testRun.benchmarks &&
        testRun.benchmarks.dashboards.length > 0 &&
        (_.has(testRun.benchmarks, 'benchmarkPreviousTestRunOK') ||
          _.has(testRun.benchmarks, 'benchmarkBaselineTestRunOK'))
      );
  },
  hasTestRunsToCompare() {
    const testRun = Template.instance().testRun.get();

    const testRuns = TestRuns.find({
      $and: [
        { application: testRun.application },
        { testType: testRun.testType },
        { testEnvironment: testRun.testEnvironment },
      ],
    }).fetch();

    return testRuns.length > 1;
  },

  runAdapt() {
    const testRun = Template.instance().testRun.get();

    const application = Applications.findOne({
      name: testRun.application,
    });

    let runAdapt;
    let testTypeIndex = -1;

    const testEnvironmentIndex = application.testEnvironments
      .map((testEnvironment) => {
        return testEnvironment.name;
      })
      .indexOf(FlowRouter.current().queryParams.testEnvironment);

    if (testEnvironmentIndex !== -1) {
      testTypeIndex = application.testEnvironments[
        testEnvironmentIndex
      ].testTypes
        .map((testType) => {
          return testType.name;
        })
        .indexOf(FlowRouter.current().queryParams.workload);
    }

    if (
      testEnvironmentIndex !== -1 &&
      testTypeIndex !== -1 &&
      application.testEnvironments[testEnvironmentIndex].testTypes[
        testTypeIndex
      ].runAdapt
    ) {
      runAdapt =
        application.testEnvironments[testEnvironmentIndex].testTypes[
          testTypeIndex
        ].runAdapt;
    } else {
      runAdapt = false;
    }

    return runAdapt;
  },
  testRunHasBenchmarkConfigurationOrAdapt() {
    const testRun = Template.instance().testRun.get();
    const benchmarks = Benchmarks.find({
      $and: [
        { application: testRun.application },
        { testType: testRun.testType },
        { testEnvironment: testRun.testEnvironment },
      ],
    }).fetch();

    const application = Applications.findOne({
      name: testRun.application,
    });

    let runAdapt;
    let testTypeIndex = -1;

    const testEnvironmentIndex = application.testEnvironments
      .map((testEnvironment) => {
        return testEnvironment.name;
      })
      .indexOf(FlowRouter.current().queryParams.testEnvironment);

    if (testEnvironmentIndex !== -1) {
      testTypeIndex = application.testEnvironments[
        testEnvironmentIndex
      ].testTypes
        .map((testType) => {
          return testType.name;
        })
        .indexOf(FlowRouter.current().queryParams.workload);
    }

    if (
      testEnvironmentIndex !== -1 &&
      testTypeIndex !== -1 &&
      application.testEnvironments[testEnvironmentIndex].testTypes[
        testTypeIndex
      ].runAdapt
    ) {
      runAdapt =
        application.testEnvironments[testEnvironmentIndex].testTypes[
          testTypeIndex
        ].runAdapt;
    } else {
      runAdapt = false;
    }

    return benchmarks.length > 0 || runAdapt;
  },
  testRunHasBenchmarkConfiguration() {
    const testRun = Template.instance().testRun.get();
    const benchmarks = Benchmarks.find({
      $and: [
        { application: testRun.application },
        { testType: testRun.testType },
        { testEnvironment: testRun.testEnvironment },
      ],
    }).fetch();

    return benchmarks.length > 0;
  },
  anaylsisIsRunning() {
    const testRun = Template.instance().testRun.get();

    if (testRun.status) {
      const evalCheck = testRun.status.evaluatingChecks;
      const checkResultsComplete =
        evalCheck === 'COMPLETE' ||
        evalCheck === 'ERROR' ||
        evalCheck === 'NOT_CONFIGURED';

      const evalCompare = testRun.status.evaluatingComparisons;
      const compareResultsComplete =
        evalCompare === 'COMPLETE' ||
        evalCompare === 'ERROR' ||
        evalCompare === 'NOT_CONFIGURED' ||
        evalCompare === 'NO_BASELINES_FOUND' ||
        evalCompare === 'NO_AUTO_COMPARE' ||
        evalCompare === 'NO_PREVIOUS_TEST_RUN_FOUND' ||
        evalCompare === 'BASELINE_TEST_RUN';

      const adaptCheck =
        testRun.status.evaluatingAdapt ?
          testRun.status.evaluatingAdapt
        : 'NOT_CONFIGURED';
      const adaptCheckComplete =
        adaptCheck === 'COMPLETE' ||
        adaptCheck === 'ERROR' ||
        adaptCheck === 'NO_BASELINES_FOUND' ||
        adaptCheck === 'NOT_CONFIGURED';

      return (
        !checkResultsComplete || !compareResultsComplete || !adaptCheckComplete
      );
    } else {
      return false;
    }
  },
  testRunHasRequirements() {
    const testRun = Template.instance().testRun.get();

    if (testRun)
      return (
        testRun.benchmarks &&
        testRun.benchmarks.dashboards.length > 0 &&
        testRun.benchmarks.meetsRequirement !== undefined
      );
  },
  testRunHasPreviousTestRunBenchmark() {
    const testRun = Template.instance().testRun.get();

    if (testRun)
      return (
        testRun.benchmarks &&
        testRun.benchmarks.dashboards.length > 0 &&
        testRun.benchmarks.benchmarkPreviousTestRunOK !== undefined
      );
  },
  testRunHasBaselineTestRunBenchmark() {
    const testRun = Template.instance().testRun.get();

    if (testRun)
      return (
        testRun.benchmarks &&
        testRun.benchmarks.dashboards.length > 0 &&
        testRun.benchmarks.benchmarkBaselineTestRunOK !== undefined
      );
  },
  testRunHasBaselineTestRuns() {
    const testRun = Template.instance().testRun.get();

    if (testRun)
      return (
        testRun.benchmarks &&
        testRun.benchmarks.dashboards.length > 0 &&
        (testRun.benchmarks.benchmarkBaselineTestRunOK !== undefined ||
          testRun.benchmarks.benchmarkPreviousTestRunOK !== undefined)
      );
  },
  benchmarkResult(result) {
    let HTML;

    if (result === true) {
      HTML =
        '<i class="fa fa-check" style="color: green;" aria-hidden="true"></i>';
    } else {
      HTML =
        '<i class="fa fa-exclamation-circle" style="color: red;" aria-hidden="true"></i>';
    }
    return new Spacebars.SafeString(HTML);
  },
  testRunExpired() {
    const testRun = Template.instance().testRun.get();

    if (testRun) {
      return testRun.expired === true;
    }
  },
});

Template.benchmarks.events({
  'click div .create-benchmarks'(event, template) {
    const testRun = template.testRun.get();

    if (testRun) {
      log.debug('Re-evaluating benchmarks for test run: ' + testRun.testRunId);

      Meteor.call('updateChecksForTestRun', testRun, (result, err) => {
        if ((err, result)) {
          window.toastr.clear();
          window.toastr['error'](err.reason, 'Error');
        } else {
          if (result.error) {
            window.toastr.clear();
            window.toastr['error'](result.error.message, 'Error');
          } else {
            window.toastr.clear();
            window.toastr['success']('Done!', 'Updated test run checks');
          }
        }
      });
    }
    return false;
  },
  'click div .re-evaluate-benchmarks'(event, template) {
    const testRun = template.testRun.get();

    if (testRun) {
      log.debug('Re-evaluating benchmarks for test run: ' + testRun.testRunId);

      Meteor.call(
        'batchEvaluateSelectedTestRuns',
        [testRun._id],
        'RE_EVALUATE',
        (err, result) => {
          if (err) {
            window.toastr.clear();
            window.toastr['error'](err.reason, 'Error');
          } else {
            if (result.error) {
              window.toastr.clear();
              window.toastr['error'](result.err.reason, 'Error');
            } else {
              window.toastr.clear();
              window.toastr['success']('Done!', 'Updated test run checks');
            }
          }
        },
      );
    }

    return false;
  },
  'click div .refresh-data'(event, template) {
    const testRun = template.testRun.get();

    if (testRun) {
      log.debug('Refreshing data for test run: ' + testRun.testRunId);

      Meteor.call(
        'batchEvaluateSelectedTestRuns',
        [testRun._id],
        'REFRESH',
        (err, result) => {
          if (err) {
            window.toastr.clear();
            window.toastr['error'](err, 'Error');
          } else {
            if (result.error) {
              window.toastr.clear();
              window.toastr['error'](result.error.message, 'Error');
            } else {
              window.toastr.clear();
              window.toastr['success'](
                'Done!',
                'Refresh data and re-evaluate started, please wait for the process to complete',
              );
            }
          }
        },
      );
    }

    return false;
  },
  'click #enable-adapt'() {
    const application = Applications.findOne({
      name: Session.get('application'),
    });
    if (application) {
      const testEnvironmentIndex = application.testEnvironments
        .map((testEnvironment) => {
          return testEnvironment.name;
        })
        .indexOf(Session.get('testEnvironment'));
      const testTypeIndex = application.testEnvironments[
        testEnvironmentIndex
      ].testTypes
        .map((testType) => {
          return testType.name;
        })
        .indexOf(Session.get('testType'));
      application.testEnvironments[testEnvironmentIndex].testTypes[
        testTypeIndex
      ].runAdapt = true;
      Meteor.call('updateSystemUnderTest', application);
    }
  },
  'click .open-kpi-tab'(event) {
    event.preventDefault();

    const queryParams = {};
    queryParams['systemUnderTest'] =
      FlowRouter.current().queryParams.systemUnderTest;
    queryParams['workload'] = FlowRouter.current().queryParams.workload;
    queryParams['testEnvironment'] =
      FlowRouter.current().queryParams.testEnvironment;

    FlowRouter.go('keyMetrics', null, queryParams);
  },
  'click .add-kpi'(event) {
    event.preventDefault();

    const queryParams = {};
    queryParams['systemUnderTest'] =
      FlowRouter.current().queryParams.systemUnderTest;
    queryParams['workload'] = FlowRouter.current().queryParams.workload;
    queryParams['testEnvironment'] =
      FlowRouter.current().queryParams.testEnvironment;

    FlowRouter.go('keyMetrics', null, queryParams);
  },
});
