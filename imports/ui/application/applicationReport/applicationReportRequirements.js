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
import { ReactiveDict } from 'meteor/reactive-dict';
import { ReactiveVar } from 'meteor/reactive-var';
import async from 'async';
import './applicationReportRequirements.html';
import { ReportRequirements } from '../../../collections/reportRequirements';
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

Template.reportRequirements.onCreated(function () {
  this.state = new ReactiveDict();
  this.requirementsHaveBeenChanged = new ReactiveVar(false);

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

  Meteor.subscribe('testRuns', 'applicationReportRequirements', 50, query);
  Meteor.subscribe('reportRequirements');
  Meteor.subscribe('applications');
  Meteor.subscribe('applicationDashboards', applicationDashboardQuery);

  this.showIcons = new ReactiveVar(true);

  Template.instance().showIcons.set(Session.get('userIsAllowed'));

  this.autorun(() => {
    Template.instance().showIcons.set(Session.get('userIsAllowed'));
  });
});

const getApplicationReportRequirements = () => {
  return ReportRequirements.find({
    $and: [
      { application: FlowRouter.current().queryParams.systemUnderTest },
      { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
      { testType: FlowRouter.current().queryParams.workload },
    ],
  });
};

Template.reportRequirements.helpers({
  requirementsHaveBeenChanged() {
    return Template.instance().requirementsHaveBeenChanged.get();
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

  applicationReportRequirements() {
    const reportRequirements = getApplicationReportRequirements();
    if (reportRequirements) return reportRequirements;
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
        isVisible: Template.instance().showIcons,
        fn: (value, object) => {
          if (object.index > 0)
            return new Spacebars.SafeString(
              `<i id="move-requirement-up" class="fa fa-arrow-up" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Move up"></i>`,
            );
        },
      },
      {
        key: '_id',
        label: '',
        sortable: false,
        isVisible: Template.instance().showIcons,
        fn: (value, object) => {
          const reportRequirements = ReportRequirements.find({
            $and: [
              { application: FlowRouter.current().queryParams.systemUnderTest },
              {
                testEnvironment:
                  FlowRouter.current().queryParams.testEnvironment,
              },
              { testType: FlowRouter.current().queryParams.workload },
            ],
          }).fetch();

          if (object.index < reportRequirements.length - 1)
            return new Spacebars.SafeString(
              `<i id="move-requirement-down" class="fa fa-arrow-down" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Move down"></i>`,
            );
        },
      },
      {
        key: 'requirementText',
        label: 'Service Level Objective',
        sortable: false,
      },

      {
        key: '_id',
        label: '',
        sortable: false,
        hidden: () => {
          return !Session.get('userIsAllowed');
        },
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="edit-report-requirement" class="fa fa-pencil" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Edit panel"></i>`,
          );
        },
      },

      {
        key: '_id',
        label: '',
        sortable: false,
        hidden: () => {
          return !Session.get('userIsAllowed');
        },
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="delete-report-requirement" class="fa fa-trash" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete benchmark"></i>`,
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
      noDataTmpl: Template.noReportRequirements,
    };
  },
});

Template.reportRequirements.events({
  'click .reactive-table tbody tr'(event, template) {
    let currentIndex;
    const afAtts = {};

    switch (event.target.id) {
      case 'delete-report-requirement':
        swal({
          title: 'Delete requirement',
          text: 'Are you sure?',
          icon: 'warning',
          buttons: ['Cancel', 'OK'],
          dangerMode: true,
        }).then((willDelete) => {
          //bound to the current `this`
          if (willDelete) {
            Meteor.call(
              'deleteReportRequirement',
              this.application,
              this.testEnvironment,
              this.testType,
              this.index,
            );
            template.requirementsHaveBeenChanged.set(true);

            swal.close();
          } else {
            swal.close();
          }
        });

        break;

      case 'edit-report-requirement':
        afAtts['type'] = 'update';
        afAtts['id'] = 'editReportRequirement';
        afAtts['type'] = 'update';
        afAtts['schema'] = 'ReportRequirementsSchema';
        afAtts['collection'] = 'ReportRequirements';
        afAtts['buttonContent'] = 'Update';
        afAtts['backdrop'] = 'static';

        AutoForm.addHooks(
          afAtts['id'],
          {
            onSuccess: function () {
              // noinspection JSCheckFunctionSignatures
              Modal.hide('afModalWindow');
              template.requirementsHaveBeenChanged.set(true);
            },
          },
          false,
        );

        Modal.show('afModalWindow', {
          title: 'Update requirement',
          dialogClass: '',
          afAtts: afAtts,
          operation: afAtts['type'],
          collection: 'ReportRequirements',
          doc: this._id,
          backdrop: afAtts['backdrop'],
        });

        break;

      case 'move-requirement-up':
        currentIndex = this.index;

        /* first set temp index*/
        Meteor.call(
          'updateApplicationRequirementsByIndex',
          currentIndex - 1,
          9999,
          this.application,
          this.testEnvironment,
          this.testType,
        );

        /* first set temp index*/
        Meteor.call(
          'updateApplicationRequirementsByIndex',
          currentIndex,
          currentIndex - 1,
          this.application,
          this.testEnvironment,
          this.testType,
        );

        /* first set temp index*/
        Meteor.call(
          'updateApplicationRequirementsByIndex',
          9999,
          currentIndex,
          this.application,
          this.testEnvironment,
          this.testType,
        );

        template.requirementsHaveBeenChanged.set(true);

        break;

      case 'move-requirement-down':
        currentIndex = this.index;

        /* first set temp index*/
        Meteor.call(
          'updateApplicationRequirementsByIndex',
          currentIndex + 1,
          9999,
          this.application,
          this.testEnvironment,
          this.testType,
        );

        /* first set temp index*/
        Meteor.call(
          'updateApplicationRequirementsByIndex',
          currentIndex,
          currentIndex + 1,
          this.application,
          this.testEnvironment,
          this.testType,
        );

        /* first set temp index*/
        Meteor.call(
          'updateApplicationRequirementsByIndex',
          9999,
          currentIndex,
          this.application,
          this.testEnvironment,
          this.testType,
        );

        template.requirementsHaveBeenChanged.set(true);

        break;
    }
  },
  'click .add-report-requirement'(event, template) {
    /* show add report requirement afModal*/

    const afAtts = {};

    afAtts['id'] = 'addReportRequirement';
    afAtts['type'] = 'insert';
    afAtts['schema'] = 'ReportRequirementsSchema';
    afAtts['collection'] = 'ReportRequirements';
    afAtts['buttonContent'] = 'Add';
    afAtts['backdrop'] = 'static';

    AutoForm.addHooks(
      afAtts['id'],
      {
        onSuccess: function () {
          template.requirementsHaveBeenChanged.set(true);
          // noinspection JSCheckFunctionSignatures
          Modal.hide('afModalWindow');
        },
      },
      false,
    );

    Modal.show('afModalWindow', {
      title: 'Add report requirement',
      dialogClass: '',
      afAtts: afAtts,
      operation: afAtts['type'],
      collection: 'ReportRequirements',
      backdrop: afAtts['backdrop'],
    });
  },
  'click .apply-requirements-to-latest-report'(event, template) {
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
        Meteor.call('applyReportRequirements', testRuns[0], () => {});

        toastr['success']('Done!', 'Updated test run report');

        template.requirementsHaveBeenChanged.set(false);
        swal.close();
      } else {
        swal.close();
      }
    });
  },
  'click .apply-requirements-to-all-reports'(event, template) {
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
      title: `Applying changes to all test run reports for testType ${testType}, test environment ${testEnvironment}`,
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
            Meteor.call('applyReportRequirements', testRun, () => {
              callback();
            });
          },
          () => {
            toastr['success']('Done!', 'Updated all test run reports');
          },
        );

        template.requirementsHaveBeenChanged.set(false);
        swal.close();
      } else {
        swal.close();
      }
    });
  },
});
