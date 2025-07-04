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

import { TestRuns } from '../../../collections/testruns';

import './applicationReleaseManagementSummary.html';
import _ from 'lodash';

Template.registerHelper('allCaps', (string) => {
  return string.toUpperCase();
});

Template.applicationReleaseManagementSummary.onCreated(
  function applicationOnCreated() {
    Meteor.subscribe('applicationTestRuns', Session.get('application'));
  },
);

Template.applicationReleaseManagementSummary.helpers({
  application() {
    return FlowRouter.current().queryParams.systemUnderTest;
  },
  release() {
    return FlowRouter.current().queryParams.release;
  },
  applicationReleaseManagementSummary() {
    const applicationTestRuns = TestRuns.find(
      {
        $and: [
          { application: FlowRouter.current().queryParams.systemUnderTest },
          { applicationRelease: FlowRouter.current().queryParams.release },
        ],
      },
      { sort: { end: -1 } },
    ).fetch();

    if (applicationTestRuns && applicationTestRuns.length > 0) {
      const applicationReleaseManagementSummary = [];

      _.each(applicationTestRuns, (testRun) => {
        if (
          _.has(testRun, 'reportAnnotations') &&
          testRun.reportAnnotations.length > 0
        ) {
          applicationReleaseManagementSummary.push(testRun);
        }
      });

      return applicationReleaseManagementSummary;
    }
  },
  lastTestRunEnded() {
    const applicationTestRuns = TestRuns.find(
      {
        $and: [
          { application: FlowRouter.current().queryParams.systemUnderTest },
          { applicationRelease: FlowRouter.current().queryParams.release },
        ],
      },
      { sort: { end: 1 } },
    ).fetch();

    if (applicationTestRuns && applicationTestRuns.length > 0) {
      /* filter test runs with reports */

      const testRunsWithReports = applicationTestRuns.filter(
        (testRun) =>
          _.has(testRun, 'reportAnnotations') &&
          testRun.reportAnnotations.length > 0,
      );

      return testRunsWithReports[testRunsWithReports.length - 1].end;
    }
  },
});

Template.applicationReleaseManagementSummaryTestRun.helpers({
  testRunHasRequirements() {
    const testRun = this.testRun;

    if (testRun)
      return (
        (testRun.benchmarks &&
          testRun.benchmarks.dashboards.length > 0 &&
          testRun.benchmarks.meetsRequirement !== undefined) ||
        (_.has(testRun, 'reportRequirements') &&
          testRun.reportRequirements.length > 0)
      );
  },
  hasReportAnnotations() {
    const testRun = this.testRun;

    if (testRun) {
      if (_.has(testRun, 'reportAnnotations') && testRun.reportAnnotations) {
        const panelsWithAnnotations = testRun.reportAnnotations.filter(
          (reportAnnotation) =>
            reportAnnotation.panel.annotation &&
            reportAnnotation.panel.annotation !== '',
        );

        return panelsWithAnnotations.length > 0;
      } else {
        return false;
      }
    }
  },
});

Template.applicationReleaseManagementSummaryTestRun.events({
  'click div .show-release-test-report'() {
    const index = this.index;
    const tabSelector = `.nav-tabs a[href="#${index}"]`;

    $(tabSelector).tab('show');

    /* scroll to top */

    Meteor.setTimeout(() => {
      // let paneSelector = `.tab-content #${index}.tab-pane`;

      $(window).scrollTop(0);
    }, 100);
  },
});
