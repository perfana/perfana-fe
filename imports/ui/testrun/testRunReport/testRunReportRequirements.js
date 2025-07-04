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

import { Template } from 'meteor/templating';

import './testRunReportRequirements.html';

import { TestRuns } from '../../../collections/testruns';
import { Benchmarks } from '../../../collections/benchmarks';
import { getTestRun } from '../../../helpers/utils';
import _ from 'lodash';

Template.testRunReportRequirements.helpers({
  hasAdditionalRequirements() {
    const testRun = this.testRun;

    if (testRun)
      return (
        _.has(testRun, 'reportRequirements') &&
        testRun.reportRequirements.length > 0
      );
  },
  hasBenchmarks() {
    const testRun = this.testRun;

    if (testRun)
      return (
        _.has(testRun, 'benchmarks') && testRun.benchmarks.dashboards.length > 0
      );
  },
  additionalRequirements() {
    const testRun = this.testRun;

    if (testRun) {
      return testRun.reportRequirements.map((reportRequirement) => ({
        reportRequirement: reportRequirement,
        testRun: testRun,
      }));
    }
  },
  previousRelease() {
    const testRun = this.testRun;

    if (
      testRun.benchmarks &&
      testRun.benchmarks.dashboards.length > 0 &&
      _.has(testRun.benchmarks, 'compared-to-previous-test-run')
    ) {
      const previousTestRun = TestRuns.findOne({
        $and: [
          { application: testRun.application },
          { testType: testRun.testType },
          { testEnvironment: testRun.testEnvironment },
          { testRunId: testRun.benchmarks.previousTestRun },
        ],
      });

      return previousTestRun.applicationRelease;
    }
  },
  baselineRelease() {
    const testRun = this.testRun;

    if (
      testRun.benchmarks &&
      testRun.benchmarks.dashboards.length > 0 &&
      _.has(testRun.benchmarks, 'baselineTestRun')
    ) {
      const baselineTestRun = TestRuns.findOne({
        $and: [
          { application: testRun.application },
          { testType: testRun.testType },
          { testEnvironment: testRun.testEnvironment },
          { testRunId: testRun.benchmarks.baselineTestRun },
        ],
      });

      return baselineTestRun.applicationRelease;
    }
  },
  testRunHasBenchmarks() {
    const testRun = this.testRun;

    if (testRun)
      return testRun.benchmarks && testRun.benchmarks.dashboards.length > 0;
  },
  testRunHasComparisonResults() {
    const testRun = this.testRun;

    if (testRun)
      return (
        testRun.benchmarks &&
        testRun.benchmarks.dashboards.length > 0 &&
        (_.has(testRun.benchmarks, 'benchmarkPreviousTestRunOK') ||
          _.has(testRun.benchmarks, 'benchmarkBaselineTestRunOK'))
      );
  },
  hasTestRunsToCompare() {
    const testRun = this.testRun;

    const testRuns = TestRuns.find({
      $and: [
        { application: testRun.application },
        { testType: testRun.testType },
        { testEnvironment: testRun.testEnvironment },
      ],
    }).fetch();

    return testRuns.length > 1;
  },
  compareTestRuns() {
    const testRun = this.testRun;

    const testRuns = TestRuns.find({
      $and: [
        { application: testRun.application },
        { testType: testRun.testType },
        { testEnvironment: testRun.testEnvironment },
      ],
    }).fetch();

    /* filter current test run an test runs without benchmark data  */

    const compareTestRuns = testRuns.filter(
      (t) =>
        t.testRunId !== testRun.testRunId &&
        t.benchmarks &&
        t.benchmarks.dashboards,
    );

    return compareTestRuns.map((testRun) => ({
      testRunId: testRun.testRunId,
    }));
  },

  testRunHasBenchmarkConfiguration() {
    const testRun = this.testRun;
    const benchmarks = Benchmarks.find({
      $and: [
        { application: testRun.application },
        { testType: testRun.testType },
        { testEnvironment: testRun.testEnvironment },
      ],
    }).fetch();

    return benchmarks.length > 0;
  },
  testRunHasRequirements() {
    const testRun = this.testRun;

    if (testRun)
      return (
        testRun.benchmarks &&
        testRun.benchmarks.dashboards.length > 0 &&
        testRun.benchmarks.meetsRequirement !== undefined
      );
  },
  testRunHasPreviousTestRunBenchmark() {
    const testRun = this.testRun;

    if (testRun)
      return (
        testRun.benchmarks &&
        testRun.benchmarks.dashboards.length > 0 &&
        testRun.benchmarks.benchmarkPreviousTestRunOK !== undefined
      );
  },
  testRunHasBaselineTestRunBenchmark() {
    const testRun = this.testRun;

    if (testRun)
      return (
        testRun.benchmarks &&
        testRun.benchmarks.dashboards.length > 0 &&
        testRun.benchmarks.benchmarkBaselineTestRunOK !== undefined
      );
  },
  testRunHasBaselineTestRuns() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

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
});

Template.testRunReportRequirements.events({
  // 'click div .drill-down-requirements' (event) {
  //     event.preventDefault();
  //     let params = {systemUnderTest: this.testRun.application, testRunId: this.testRun.testRunId};
  //     let queryParams = {systemUnderTest: this.testRun.application, workload: this.testRun.testType, testEnvironment: this.testRun.testEnvironment};
  //
  //     Meteor.setTimeout(() => {
  //         FlowRouter.go('testRunReportRequirementsDetails', params, queryParams)
  //
  //     })
  // },
  // 'click div .drill-down-benchmarks' (event) {
  //     event.preventDefault();
  //     let benchMarkType = (event.currentTarget.id) ? event.currentTarget.id : $(event.target).parent().attr("id");
  //     let params = {systemUnderTest: FlowRouter.current().queryParams.systemUnderTest, testRunId: FlowRouter.current().params.testRunId, benchmarkType: benchMarkType};
  //     let queryParams = {systemUnderTest: FlowRouter.current().queryParams.systemUnderTest, workload: FlowRouter.current().queryParams.workload, testEnvironment: FlowRouter.current().queryParams.testEnvironment};
  //
  //     Meteor.setTimeout(() => {
  //         FlowRouter.go('testRunReportBenchmarkDetails', params, queryParams)
  //
  //     })
  // },
  'click div #toggle-requirement-result'(event) {
    event.preventDefault();

    const requirementIndex = this.testRun.reportRequirements
      .map((requirement) => requirement.index)
      .indexOf(this.reportRequirement.index);

    this.testRun.reportRequirements[requirementIndex].requirementResult =
      !_.has(this.reportRequirement, 'requirementResult') ||
      this.reportRequirement.requirementResult === false;

    TestRuns.update(
      {
        _id: this.testRun._id,
      },
      {
        $set: {
          reportRequirements: this.testRun.reportRequirements,
        },
      },
    );
  },
  'click div #open-previous-test-run'(event) {
    event.preventDefault();
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const testRunUrl =
        '/testrun/' +
        testRun.benchmarks.previousTestRun +
        '?systemUnderTest=' +
        testRun.application +
        '&workload=' +
        testRun.testType +
        '&testEnvironment=' +
        testRun.testEnvironment;
      window.open(testRunUrl, '_blank');
    }
  },
  'click div #open-baseline-test-run'(event) {
    event.preventDefault();
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const testRunUrl =
        '/testrun/' +
        testRun.benchmarks.baselineTestRun +
        '?systemUnderTest=' +
        testRun.application +
        '&workload=' +
        testRun.testType +
        '&testEnvironment=' +
        testRun.testEnvironment;
      window.open(testRunUrl, '_blank');
    }
  },
});
