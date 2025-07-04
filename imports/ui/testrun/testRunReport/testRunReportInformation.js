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

import './testRunReportInformation.html';

Template.testRunReportInformation.helpers({
  testRunHasCIBuildResultsUrl() {
    const testRun = this.testRun;

    if (testRun) {
      return (
        testRun.CIBuildResultsUrl &&
        testRun.CIBuildResultsUrl.length > 0 &&
        testRun.CIBuildResultsUrl !== 'null' &&
        testRun.CIBuildResultsUrl !== 'unknown'
      );
    }
  },
  testRunHasAnnotations() {
    const testRun = this.testRun;

    if (testRun) return testRun.annotations && testRun.annotations.length > 0;
  },
  testRunHasTags() {
    const testRun = this.testRun;

    if (testRun) return testRun.tags && testRun.tags.length > 0;
  },
  completedHTML(result) {
    if (result === true) {
      return 'Yes';
    } else {
      return 'No';
    }
  },
  testRun() {
    if (this.testRun) return this.testRun;
  },
});

Template.testRunReportInformation.events({
  'click div .ci-build-result-url'(event) {
    event.preventDefault();
    window.open($(event.target).text(), '_blank');
  },
  'click div .test-run-url'(event) {
    event.preventDefault();
    const params = {
      systemUnderTest: this.testRun.application,
      testRunId: this.testRun.testRunId,
    };
    const queryParams = {
      systemUnderTest: this.testRun.application,
      workload: this.testRun.testType,
      testEnvironment: this.testRun.testEnvironment,
    };
    FlowRouter.go('testRunSummary', params, queryParams);
  },
});
