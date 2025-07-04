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
import { ReactiveVar } from 'meteor/reactive-var';

import './testRuns.html';
import { TestRuns } from '../../../collections/testruns';
import { Session } from 'meteor/session';
import { Benchmarks } from '../../../collections/benchmarks';
import { Applications } from '../../../collections/applications';
import { Meteor } from 'meteor/meteor';
import '../../testrun/testRunSummary/testRunDataScienceCompareResults/unresolvedRegression';

Template.testRuns.onCreated(function testRunsOnCreated() {
  this.activeHref = new ReactiveVar();
  this.multipleTestRuns = new ReactiveVar(false);
  this.workloadSelected = new ReactiveVar(false);
  this.unresolvedRegression = new ReactiveVar([]);
  this.hasUnresolvedRegression = new ReactiveVar(false);
  this.adaptEnabled = new ReactiveVar(false);
});

Template.testRuns.onRendered(function testRunsOnRendered() {
  this.autorun(() => {
    FlowRouter.watchPathChange();

    const activeTab =
      (
        FlowRouter.current().queryParams.tab &&
        FlowRouter.current().queryParams.tab !== undefined
      ) ?
        FlowRouter.current().queryParams.tab
      : 'testruns';
    this.activeHref.set(`#${activeTab}`);

    if (
      Session.get('application') !== undefined &&
      Session.get('testEnvironment') !== undefined &&
      Session.get('testType') !== undefined
    ) {
      this.workloadSelected.set(true);

      const query = {
        $and: [
          { application: Session.get('application') },
          { testEnvironment: Session.get('testEnvironment') },
          { testType: Session.get('testType') },
        ],
      };

      Meteor.subscribe('benchmarks', query);

      Meteor.subscribe('testRuns', 'testRuns', 50, query);

      const multipleTestRuns = TestRuns.find(query).fetch();

      const benchmarks = Benchmarks.find(query).fetch();

      if (multipleTestRuns && benchmarks) {
        this.multipleTestRuns.set(
          benchmarks.length > 0 && multipleTestRuns.length > 1,
        );
      }

      const application = Applications.findOne({
        name: Session.get('application'),
      });
      if (application) {
        const testEnvironment = application.testEnvironments.find(
          (te) => te.name === Session.get('testEnvironment'),
        );
        if (testEnvironment) {
          const testType = testEnvironment.testTypes.find(
            (tt) => tt.name === Session.get('testType'),
          );
          if (testType) {
            this.adaptEnabled.set(testType.runAdapt === true);
          }
        }
      }

      if (this.adaptEnabled.get() === true) {
        Meteor.call(
          'getUnresolvedRegression',
          Session.get('application'),
          Session.get('testEnvironment'),
          Session.get('testType'),
          (error, result) => {
            if (result.error) {
              // toastr.error(result.error);
            } else {
              this.unresolvedRegression.set(result.data);
              this.hasUnresolvedRegression.set(result.data.length > 0);
            }
          },
        );
      }
    } else {
      this.workloadSelected.set(false);
      this.multipleTestRuns.set(false);
    }
  });
});

Template.testRuns.helpers({
  adaptBaselineModeEnabled() {
    const application = Applications.findOne({
      name: Session.get('application'),
    });
    if (application) {
      const testEnvironment = application.testEnvironments.find(
        (te) => te.name === Session.get('testEnvironment'),
      );
      if (testEnvironment) {
        const testType = testEnvironment.testTypes.find(
          (tt) => tt.name === Session.get('testType'),
        );
        if (testType) {
          return testType.adaptMode === 'BASELINE';
        }
      }
    }
  },
  hasUnresolvedRegression() {
    return (
      Template.instance().hasUnresolvedRegression &&
      Template.instance().hasUnresolvedRegression.get() === true
    );
  },
  unresolvedRegression() {
    return (
      Template.instance().unresolvedRegression &&
      Template.instance().unresolvedRegression.get()
    );
  },
  unresolvedRegressionCount() {
    return (
      Template.instance().unresolvedRegression &&
      Template.instance().unresolvedRegression.get().length
    );
  },
  tabActive(href) {
    return Template.instance().activeHref.get() === href;
  },
  multipleTestRuns() {
    return (
      Template.instance().multipleTestRuns &&
      Template.instance().multipleTestRuns.get() === true
    );
  },
  workloadSelected() {
    return (
      Template.instance().workloadSelected &&
      Template.instance().workloadSelected.get() === true
    );
  },
  testRunsWithReports() {
    const testRunReports = TestRuns.find({
      $and: [
        { application: Session.get('application') },
        { testEnvironment: Session.get('testEnvironment') },
        { testType: Session.get('testType') },
        { reportAnnotations: { $exists: true } },
      ],
    }).fetch();

    return testRunReports.length > 0;
  },

  invalidConfiguration() {
    const invalidBenchmarks = Benchmarks.find({
      $and: [
        { application: Session.get('application') },
        { testEnvironment: Session.get('testEnvironment') },
        { testType: Session.get('testType') },
        { valid: false },
      ],
    }).fetch();

    return invalidBenchmarks.length > 0;
  },
});

Template.testRuns.events({
  'click .nav-tabs  a'(event, template) {
    event.preventDefault();
    // $(this).tab('show');
    if (event.currentTarget.getAttribute('href') !== '#no-trends') {
      template.activeHref.set(event.currentTarget.getAttribute('href'));
      FlowRouter.withReplaceState(function () {
        FlowRouter.setQueryParams({
          tab: event.currentTarget.getAttribute('href').substring(1),
        });
        if (event.currentTarget.getAttribute('href') !== '#trends') {
          FlowRouter.setQueryParams({ trendMetricId: null });
          FlowRouter.setQueryParams({ trendMetric: null });
        }
      });
    }
  },
  'click #open-sli'() {
    const queryParams = {};
    queryParams['systemUnderTest'] = Session.get('application');
    queryParams['testEnvironment'] = Session.get('testEnvironment');
    queryParams['workload'] = Session.get('testType');
    FlowRouter.go('keyMetrics', null, queryParams);
  },
  'click #disable-baseline-mode'() {
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
      ].adaptMode = 'DEFAULT';

      Meteor.call('updateSystemUnderTest', application, (error, result) => {
        if (result.error) {
          toastr.error(result.error);
        } else {
          toastr.success('Adapt Baseline Mode disabled');
        }
      });
    }
  },
});
