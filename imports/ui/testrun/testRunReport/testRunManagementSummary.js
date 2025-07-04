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
import { getTestRun } from '../../../helpers/utils';

import './testRunManagementSummary.html';
import _ from 'lodash';

Template.testRunManagementSummary.onCreated(() => {
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

  Meteor.subscribe('testRuns', 'testRunManagementSummary', 50, query);
  Meteor.subscribe('grafanas');
  Meteor.subscribe('applications');
  Meteor.subscribe('applicationDashboards', applicationDashboardQuery);
  Meteor.subscribe('benchmarks', query);
});

Template.testRunManagementSummary.helpers({
  reportAnnotations() {
    const reportAnnotations = [];

    const testRun = this.testRun;

    if (testRun) {
      if (_.has(testRun, 'reportAnnotations') && testRun.reportAnnotations) {
        _.each(testRun.reportAnnotations, (reportAnnotation) => {
          if (
            reportAnnotation.panel.annotation &&
            reportAnnotation.panel.annotation !== ''
          ) {
            reportAnnotations.push({
              annotation: reportAnnotation.panel.annotation,
            });
          }
        });

        return reportAnnotations;
      }
    }
  },
});

Template.testRunManagementSummary.events({
  'click div .delete-test-run'() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    swal({
      title: 'Delete test run',
      text: testRun.testRunId,
      icon: 'warning',
      buttons: ['Cancel', 'OK'],
      dangerMode: true,
    }).then((willDelete) => {
      //bound to the current `this`
      if (willDelete) {
        Meteor.call('deleteTestRun', testRun._id, () => {
          const queryParams = {
            systemUnderTest: testRun.application,
            workload: testRun.testType,
            testEnvironment: testRun.testEnvironment,
          };
          FlowRouter.go('testRuns', null, queryParams);
        });
      } else {
        swal.close();
      }
    });
  },
  'click div .set-test-run-as-baseline'() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    swal({
      title: 'Set test run as baseline',
      text: testRun.testRunId,
      icon: 'warning',
      buttons: ['Cancel', 'OK'],
      dangerMode: true,
    }).then((confirm) => {
      //bound to the current `this`
      if (confirm) {
        Meteor.call('setTestRunAsBaseline', testRun, (error, testRun) => {
          toastr['info'](
            'This might take a while',
            'Updating test runs benchmark results',
          );

          if (error) {
            toastr.clear();
            window.toastr['error'](JSON.stringify(error), 'Error');
          } else if (testRun.error) {
            toastr.clear();
            window.toastr['error'](JSON.stringify(testRun.error), 'Error');
          } else {
            toastr.clear();
            toastr['success']('Done!', 'Updated test runs benchmark results');
          }
        });
      } else {
        swal.close();
      }
    });
  },
});
