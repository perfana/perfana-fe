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

// noinspection SqlNoDataSourceInspection,SqlDialectInspection,ES6ShorthandObjectProperty

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { getTestRun } from '../../../helpers/utils';
import { Applications } from '../../../collections/applications';
import { ReportPanels } from '../../../collections/reportPanels';

import './testRunManage.html';
import { Session } from 'meteor/session';

Template.manageTestRun.onCreated(() => {
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

  const benchmarksQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
    ],
  };

  const snapshotQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
      { testRunId: FlowRouter.current().params.testRunId },
    ],
  };

  Meteor.subscribe('snapshots', snapshotQuery, 'testRunManage');

  Meteor.subscribe('testRuns', 'testRunManage', 50, query);

  Meteor.subscribe('grafanas');
  Meteor.subscribe('applications');
  Meteor.subscribe('applicationDashboards', applicationDashboardQuery);
  Meteor.subscribe('benchmarks', benchmarksQuery);
});

Template.manageTestRun.helpers({
  isNotBaseline() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      /* Get application */
      const application = Applications.findOne({ name: testRun.application });

      if (application) {
        const filteredEnvironment = application.testEnvironments.filter(
          (environment) => environment.name === testRun.testEnvironment,
        );

        const filteredTestType = filteredEnvironment[0].testTypes.filter(
          (testType) => testType.name === testRun.testType,
        );

        return filteredTestType[0].baselineTestRun !== testRun.testRunId;
      }
    }
  },
  isAdmin() {
    const user = Meteor.user();
    if (user)
      return (
        Roles.userHasRole(user._id, 'admin') ||
        Roles.userHasRole(user._id, 'super-admin')
      );
  },
  testRunExpired() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      return testRun.expired === true;
    }
  },
});

Template.manageTestRun.events({
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
  'click div .edit-test-run'() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    const afAtts = {};

    afAtts['type'] = 'method-update';
    afAtts['meteormethod'] = 'updateTestRun';
    afAtts['id'] = 'editTestRuns';
    afAtts['schema'] = 'TestRunSchema';
    afAtts['collection'] = 'TestRuns';
    afAtts['buttonContent'] = 'Update';
    afAtts['backdrop'] = 'static';

    AutoForm.addHooks(
      afAtts['id'],
      {
        onSuccess: function () {
          // noinspection JSCheckFunctionSignatures
          Modal.hide('afModalWindow');
        },
      },
      false,
    );

    Modal.show('afModalWindow', {
      title: 'Update test run',
      dialogClass: '',
      afAtts: afAtts,
      operation: afAtts['type'],
      collection: 'TestRuns',
      doc: testRun,
      backdrop: afAtts['backdrop'],
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

Template.manageTestRunReport.helpers({
  testRunHasReport() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun)
      return testRun.reportAnnotations && testRun.reportAnnotations.length > 0;
  },
  testRunHasReportSpecification() {
    const reportPanels = ReportPanels.find({
      $and: [
        { application: FlowRouter.current().queryParams.systemUnderTest },
        { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
        { testType: FlowRouter.current().queryParams.workload },
      ],
    }).fetch();

    if (reportPanels) return reportPanels.length > 0;
  },
});

Template.manageTestRunReport.events({
  'click div #generate-report'(event) {
    event.preventDefault();

    toastr['info']('This might take a while', 'Creating report');

    Meteor.call('generateReport', this.testRun);

    const params = {
      systemUnderTest: this.testRun.application,
      testRunId: this.testRun.testRunId,
    };
    const queryParams = {
      systemUnderTest: this.testRun.application,
      workload: this.testRun.testType,
      testEnvironment: this.testRun.testEnvironment,
    };
    FlowRouter.go('testRunReport', params, queryParams);
    // window.open(FlowRouter.url('testRunReport', params, queryParams), '_blank')
  },
  'click div #open-report'(event) {
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
    FlowRouter.go('testRunReport', params, queryParams);
    // window.open(FlowRouter.url('testRunReport', params, queryParams), '_blank')
  },
  'click div #remove-report'(event) {
    event.preventDefault();
    swal({
      title: 'Delete report from database',
      text: 'Are you sure?',
      icon: 'warning',
      buttons: ['Cancel', 'OK'],
      dangerMode: true,
    }).then((willDelete) => {
      if (willDelete) {
        const testRun = getTestRun(
          FlowRouter.current().queryParams.systemUnderTest,
          FlowRouter.current().params.testRunId,
        );

        if (testRun) {
          Meteor.call('removeTestRunReport', testRun, (err, result) => {
            if (err) {
              window.toastr.clear();
              window.toastr['error'](JSON.stringify(result.error), 'Error');
            } else {
              window.toastr.clear();
              window.toastr['success']('Done!', 'Removed report!');
            }
          });
        }
      } else {
        swal.close();
      }
    });
  },
  'click div #open-report-specification'(event) {
    event.preventDefault();

    const queryParams = {};
    queryParams['systemUnderTest'] =
      FlowRouter.current().queryParams.systemUnderTest;
    queryParams['workload'] = FlowRouter.current().queryParams.workload;
    queryParams['testEnvironment'] =
      FlowRouter.current().queryParams.testEnvironment;

    FlowRouter.go('reportingTemplate', null, queryParams);

    // Meteor.setTimeout(() => {
    //
    //     $('.nav-tabs a[href="#configuration"]').tab('show');
    //
    //     Meteor.setTimeout(() => {
    //
    //         $('.nav-tabs a[href="#application-report-specs"]').tab('show');
    //
    //
    //     })
    // })
  },
});

Template.debugTestRun.events({
  'click div .download-resources'() {
    const testRunId = FlowRouter.current().params.testRunId;

    Meteor.call(
      'exportTestRunData',
      FlowRouter.current().queryParams.systemUnderTest,
      testRunId,
      FlowRouter.current().queryParams.workload,
      FlowRouter.current().queryParams.testEnvironment,
      (error, response) => {
        if (error) {
          toastr.clear();
          window.toastr['error'](JSON.stringify(response.error), 'Error');
        } else {
          if (response) {
            const blob = convert(response.data);
            saveAs(blob, `${testRunId}.zip`);
          }
        }
      },
    );
  },
});

const convert = (base64String) => {
  const decodedString = _decodeBase64(base64String),
    decodedStringLength = _getLength(decodedString),
    byteArray = _buildByteArray(decodedString, decodedStringLength);

  if (byteArray) {
    return _createBlob(byteArray);
  }
};

const _decodeBase64 = (string) => {
  return atob(string);
};

const _getLength = (value) => {
  return value.length;
};

const _buildByteArray = (string, stringLength) => {
  const buffer = new ArrayBuffer(stringLength),
    array = new Uint8Array(buffer);

  for (let i = 0; i < stringLength; i++) {
    array[i] = string.charCodeAt(i);
  }

  return array;
};

const _createBlob = (byteArray) => {
  return new Blob([byteArray], { type: 'application/zip' });
};
