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

import './applicationReleaseReports.html';
import _ from 'lodash';

Template.applicationReleaseReports.onRendered = () => {
  Meteor.setTimeout(() => {
    const selector = '.nav-tabs a[href="#release-management-summary"]';

    $(selector).tab('show');
  }, 500);
};

Template.applicationReleaseReports.onCreated(() => {
  Meteor.subscribe('applicationTestRuns', Session.get('application'));
});

Template.applicationReleaseReports.helpers({
  application() {
    return FlowRouter.current().queryParams.systemUnderTest;
  },
  release() {
    return FlowRouter.current().queryParams.release;
  },
  applicationReleaseReports() {
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
      const applicationReleaseReports = [];

      _.each(applicationTestRuns, (testRun) => {
        if (
          _.has(testRun, 'reportAnnotations') &&
          testRun.reportAnnotations.length > 0
        ) {
          applicationReleaseReports.push(testRun);
        }
      });

      return applicationReleaseReports;
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
