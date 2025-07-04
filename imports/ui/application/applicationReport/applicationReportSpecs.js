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
import { log } from '/both/logger';

import { ApplicationDashboards } from '../../../collections/applicationDashboards';
import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';
import async from 'async';
import './applicationReportSpecs.html';
// import './applicationReportSpecs.less';
import { Applications } from '../../../collections/applications';
import { ReportPanels } from '../../../collections/reportPanels';
import { TestRuns } from '../../../collections/testruns';

toastr.options = {
  closeButton: false,
  debug: false,
  newestOnTop: false,
  progressBar: false,
  positionClass: 'toast-top-right',
  preventDuplicates: false,
  onclick: null,
  showDuration: '300',
  hideDuration: '1000',
  timeOut: '5000',
  extendedTimeOut: '1000',
  showEasing: 'swing',
  hideEasing: 'linear',
  showMethod: 'fadeIn',
  hideMethod: 'fadeOut',
};

Template.applicationReportSpecs.onCreated(
  function applicationReportSpecsOnCreated() {
    this.reportPanelsHaveBeenChanged = new ReactiveVar(false);

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

    const reportPanelsQuery = {
      $and: [
        { application: Session.get('application') },
        { testEnvironment: Session.get('testEnvironment') },
        { testType: Session.get('testType') },
      ],
    };

    Meteor.subscribe('testRuns', 'applicationReportSpecs', 50, query);
    Meteor.subscribe('reportPanels', reportPanelsQuery);
    Meteor.subscribe('applications');
    Meteor.subscribe('applicationDashboards', applicationDashboardQuery);

    this.userHasPermissionForApplication = new ReactiveVar(false);

    this.autorun(() => {
      const application = Applications.findOne({
        name: Session.get('application'),
      });

      if (application) {
        Meteor.call(
          'userHasPermissionForApplication',
          application.name,
          (err, result) => {
            if (err) {
              log.error(JSON.stringify(err));
            } else {
              if (result.error) {
                log.error(JSON.stringify(result.error));
              } else {
                this.userHasPermissionForApplication.set(result.data);
              }
            }
          },
        );
      }
    });

    AutoForm.addHooks(
      'editReportPanel',
      {
        onSuccess: function () {
          window.toastr.clear();
          window.toastr['success']('Done!', 'Updated report panel!');
        },
        onError: function (formType, err) {
          window.toastr.clear();
          window.toastr['error'](err, 'Error');
        },
      },
      false,
    );

    // AutoForm.addHooks('addReportPanel', {
    //     onSuccess: function() {
    //         window.toastr.clear();
    //         window.toastr["success"]("Done!", "Added report panel!")
    //     },
    //     onError: function(formType, err) {
    //         window.toastr.clear();
    //         window.toastr["error"](err.reason, "Error")
    //     }
    // });

    AutoForm.addHooks(
      'addReportPanel',
      {
        onSuccess: function () {
          window.toastr.clear();
          window.toastr['success']('Done!', 'Added report panel!');
        },
        onError: function (formType, err) {
          window.toastr.clear();
          window.toastr['error'](err, 'Error');
        },
      },
      false,
    );
  },
);

Template.applicationReportSpecs.helpers({
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
  application() {
    return Session.get('application');
  },
  testEnvironment() {
    return Session.get('testEnvironment');
  },
  testType() {
    return Session.get('testType');
  },
  reportPanelsHaveBeenChanged() {
    return Template.instance().reportPanelsHaveBeenChanged.get();
  },
  hasTestRunsWithReports() {
    const testRuns = TestRuns.find({
      $and: [
        { application: FlowRouter.current().queryParams.systemUnderTest },
        { testType: FlowRouter.current().queryParams.workload },
        { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
        { reportAnnotations: { $exists: true } },
      ],
    }).fetch();

    if (testRuns) {
      return testRuns.length > 0;
    }
  },

  applicationReportSpecs() {
    const reportPanels = getApplicationReportSpecs();
    if (reportPanels) return reportPanels;
  },
  fields() {
    return [
      {
        key: 'index',
        label: '#',
        sortOrder: 0,
        sortDirection: 'ascending',
        sortable: false,
        hidden: true,
      },

      {
        key: 'index',
        label: '',
        isVisible: Template.instance().userHasPermissionForApplication,

        fn: (value, object) => {
          if (object.index > 0)
            return new Spacebars.SafeString(
              `<i id="move-panel-up" class="fa fa-arrow-up reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Move up"></i>`,
            );
        },
      },
      {
        key: '_id',
        label: '',
        sortable: false,
        isVisible: Template.instance().userHasPermissionForApplication,

        fn: (value, object) => {
          const reportPanels = ReportPanels.find({
            $and: [
              { application: FlowRouter.current().queryParams.systemUnderTest },
              {
                testEnvironment:
                  FlowRouter.current().queryParams.testEnvironment,
              },
              { testType: FlowRouter.current().queryParams.workload },
            ],
          }).fetch();

          if (object.index < reportPanels.length - 1)
            return new Spacebars.SafeString(
              `<i id="move-panel-down" class="fa fa-arrow-down reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Move down"></i>`,
            );
        },
      },
      {
        key: 'dashboardLabel',
        label: 'Dashboard label',
        sortable: false,
        cellClass: 'col-md-2',
      },
      {
        key: 'panel.title',
        label: 'Metric',
        sortable: false,
        cellClass: 'col-md-3',
        fn: (value) => {
          return value.replace(/[0-9]+-(.*)/, '$1');
        },
      },
      {
        key: 'panel.annotation',
        label: 'Default annotation',
        cellClass: 'col-md-6',
        sortable: false,
      },

      {
        key: '_id',
        label: '',
        sortable: false,
        isVisible: Template.instance().userHasPermissionForApplication,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="edit-report-panel" class="fa fa-pencil reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Edit panel"></i>`,
          );
        },
      },

      {
        key: '_id',
        label: '',
        sortable: false,
        isVisible: Template.instance().userHasPermissionForApplication,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="delete-report-panel" class="fa fa-trash reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete benchmark"></i>`,
          );
        },
      },
    ];
  },
  settings() {
    return {
      rowsPerPage: 20,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      noDataTmpl: Template.noApplicationReportSpecs,
    };
  },
  hasApplicationDashboards() {
    const applicationDashboards = ApplicationDashboards.find({
      $and: [
        { application: FlowRouter.current().queryParams.systemUnderTest },
        { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
      ],
    }).fetch();

    if (applicationDashboards) return applicationDashboards.length > 0;
  },
});

Template.applicationReportSpecs.events({
  'click .back'() {
    history.back();
  },
  'click .reactive-table tbody tr'(event, template) {
    let currentIndex;
    const afAtts = {};

    switch (event.target.id) {
      case 'delete-report-panel':
        swal({
          title: 'Delete panel',
          text: 'Are you sure?',
          icon: 'warning',
          buttons: ['Cancel', 'OK'],
          dangerMode: true,
        }).then((willDelete) => {
          //bound to the current `this`
          if (willDelete) {
            Meteor.call(
              'deleteReportPanel',
              this.application,
              this.testEnvironment,
              this.testType,
              this.index,
              this,
              (err, result) => {
                if (result.error) {
                  window.toastr.clear();
                  window.toastr['error'](JSON.stringify(result.error), 'Error');
                } else {
                  window.toastr.clear();
                  window.toastr['success']('Done!', 'Deleted report panel!');
                }

                swal.close();
              },
            );

            template.reportPanelsHaveBeenChanged.set(true);
            swal.close();
          } else {
            swal.close();
          }
        });

        break;

      case 'edit-report-panel':
        afAtts['type'] = 'method-update';
        afAtts['meteormethod'] = 'updateReportPanel';
        afAtts['id'] = 'editReportPanel';
        afAtts['schema'] = 'ReportPanelsSchema';
        afAtts['collection'] = 'ReportPanels';
        afAtts['buttonContent'] = 'Update';
        afAtts['backdrop'] = 'static';

        AutoForm.addHooks(
          afAtts['id'],
          {
            onSuccess: function () {
              // noinspection JSCheckFunctionSignatures
              Modal.hide('afModalWindow');
              template.reportPanelsHaveBeenChanged.set(true);
            },
          },
          false,
        );

        Modal.show('afModalWindow', {
          title: 'Update panel',
          dialogClass: '',
          afAtts: afAtts,
          operation: 'update',
          collection: 'ReportPanels',
          doc: this,
          backdrop: afAtts['backdrop'],
        });

        break;

      case 'move-panel-up':
        currentIndex = this.index;

        /* first set temp index*/
        Meteor.call(
          'updateApplicationReportSpecsByIndex',
          currentIndex - 1,
          9999,
          this.application,
          this.testEnvironment,
          this.testType,
        );

        /* first set temp index*/
        Meteor.call(
          'updateApplicationReportSpecsByIndex',
          currentIndex,
          currentIndex - 1,
          this.application,
          this.testEnvironment,
          this.testType,
        );

        /* first set temp index*/
        Meteor.call(
          'updateApplicationReportSpecsByIndex',
          9999,
          currentIndex,
          this.application,
          this.testEnvironment,
          this.testType,
        );

        template.reportPanelsHaveBeenChanged.set(true);
        break;

      case 'move-panel-down':
        currentIndex = this.index;

        /* first set temp index*/
        Meteor.call(
          'updateApplicationReportSpecsByIndex',
          currentIndex + 1,
          9999,
          this.application,
          this.testEnvironment,
          this.testType,
        );

        /* first set temp index*/
        Meteor.call(
          'updateApplicationReportSpecsByIndex',
          currentIndex,
          currentIndex + 1,
          this.application,
          this.testEnvironment,
          this.testType,
        );

        /* first set temp index*/
        Meteor.call(
          'updateApplicationReportSpecsByIndex',
          9999,
          currentIndex,
          this.application,
          this.testEnvironment,
          this.testType,
        );

        template.reportPanelsHaveBeenChanged.set(true);

        break;
    }
  },
  'click .add-grafana-dashboard'(event, template) {
    /* change tab to application dashboards */

    $('.nav-tabs a[href="#application-dashboards"]').tab('show');

    /* show add dashboard afModal*/

    const afAtts = {};

    afAtts['id'] = 'addApplicationDashboards';
    afAtts['type'] = 'method';
    afAtts['meteormethod'] = 'insertApplicationDashboard';
    afAtts['schema'] = 'ApplicationDashboardsSchema';
    afAtts['collection'] = 'ApplicationDashboards';
    afAtts['buttonContent'] = 'Add';
    afAtts['backdrop'] = 'static';

    AutoForm.addHooks(
      afAtts['id'],
      {
        onSuccess: function () {
          template.reportPanelsHaveBeenChanged.set(true);
          // noinspection JSCheckFunctionSignatures
          Modal.hide('afModalWindow');
        },
      },
      false,
    );

    Modal.show('afModalWindow', {
      title: 'Add Grafana dashboard',
      dialogClass: '',
      afAtts: afAtts,
      operation: 'insert',
      collection: 'ApplicationDashboards',
      backdrop: afAtts['backdrop'],
    });
  },
  'click .add-report-panel'(event, template) {
    /* show add report panel afModal*/

    const afAtts = {};

    afAtts['id'] = 'addReportPanel';
    afAtts['type'] = 'method';
    afAtts['meteormethod'] = 'insertReportPanel';
    afAtts['schema'] = 'ReportPanelsSchema';
    afAtts['collection'] = 'ReportPanels';
    afAtts['buttonContent'] = 'Add';
    afAtts['backdrop'] = 'static';

    AutoForm.addHooks(
      afAtts['id'],
      {
        onSuccess: function () {
          template.reportPanelsHaveBeenChanged.set(true);
          // noinspection JSCheckFunctionSignatures
          Modal.hide('afModalWindow');
        },
      },
      false,
    );

    Modal.show('afModalWindow', {
      title: 'Add report panel',
      dialogClass: '',
      afAtts: afAtts,
      operation: 'insert',
      collection: 'ReportPanels',
      backdrop: afAtts['backdrop'],
    });
  },
  'click .apply-to-latest-report'(event, template) {
    const testRuns = TestRuns.find(
      {
        $and: [
          { application: FlowRouter.current().queryParams.systemUnderTest },
          { testType: FlowRouter.current().queryParams.workload },
          { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
          { reportAnnotations: { $exists: true } },
        ],
      },
      { sort: { end: -1 } },
    ).fetch();

    swal({
      title: `Applying changes to report for test run ${testRuns[0].testRunId}`,
      text: 'Are you sure?',
      icon: 'warning',
      buttons: ['Cancel', 'OK'],
      dangerMode: true,
    }).then((willDelete) => {
      //bound to the current `this`
      if (willDelete) {
        Meteor.call('applyReportSpecs', testRuns[0], () => {});

        toastr['success']('Done!', 'Updated test run report');

        template.reportPanelsHaveBeenChanged.set(false);
        swal.close();
      } else {
        swal.close();
      }
    });
  },
  'click .apply-to-all-reports'(event, template) {
    const testType = FlowRouter.current().queryParams.workload;
    const testEnvironment = FlowRouter.current().queryParams.testEnvironment;

    const testRuns = TestRuns.find({
      $and: [
        { application: FlowRouter.current().queryParams.systemUnderTest },
        { testType: FlowRouter.current().queryParams.workload },
        { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
        { reportAnnotations: { $exists: true } },
      ],
    }).fetch();

    swal({
      title: `Applying changes to all reports for workload ${testType}, test environment ${testEnvironment}`,
      text: 'Are you sure?',
      icon: 'warning',
      buttons: ['Cancel', 'OK'],
      dangerMode: true,
    }).then((willDelete) => {
      //bound to the current `this`
      if (willDelete) {
        async.each(
          testRuns,
          (testRun, callback) => {
            Meteor.call('applyReportSpecs', testRun, () => {
              callback();
            });
          },
          () => {
            toastr['success']('Done!', 'Updated all test run reports');
          },
        );

        template.reportPanelsHaveBeenChanged.set(false);
        swal.close();
      } else {
        swal.close();
      }
    });
  },
});

Template.noApplicationReportSpecs.onCreated(
  function applicationBenchmarksOnCreated() {
    this.userHasPermissionForApplication = new ReactiveVar(false);

    Meteor.subscribe('applications');

    this.autorun(() => {
      const application = Applications.findOne({
        name: Session.get('application'),
      });

      if (application) {
        Meteor.call(
          'userHasPermissionForApplication',
          application.name,
          (err, result) => {
            if (err) {
              log.error(JSON.stringify(err));
            } else {
              if (result.error) {
                log.error(JSON.stringify(result.error));
              } else {
                this.userHasPermissionForApplication.set(result.data);
              }
            }
          },
        );
      }
    });
  },
);

Template.noApplicationReportSpecs.helpers({
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
  hasApplicationDashboards() {
    const applicationDashboards = ApplicationDashboards.find({
      $and: [
        { application: FlowRouter.current().queryParams.systemUnderTest },
        { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
      ],
    }).fetch();

    if (applicationDashboards) return applicationDashboards.length > 0;
  },
});

const getApplicationReportSpecs = () => {
  return ReportPanels.find({
    $and: [
      { application: FlowRouter.current().queryParams.systemUnderTest },
      { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
      { testType: FlowRouter.current().queryParams.workload },
    ],
  });
};
