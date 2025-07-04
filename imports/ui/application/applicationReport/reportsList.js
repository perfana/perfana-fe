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

/* eslint-disable no-case-declarations */
// noinspection JSCheckFunctionSignatures

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { log } from '/both/logger';

import './reportsList.html';
import { Session } from 'meteor/session';
import { TestRuns } from '../../../collections/testruns';
import { Applications } from '../../../collections/applications';
import { formatDate, humanReadableDuration } from '../../../helpers/utils';
import swal from 'sweetalert';
import { ReactiveVar } from 'meteor/reactive-var';
import _ from 'lodash';

Template.applicationReportsList.onCreated(function teamsOnCreated() {
  this.selectedReports = new ReactiveArray();
  this.testRunQuery = new ReactiveVar();
  this.userHasPermissionForApplication = new ReactiveVar(false);
  this.testRunsLimit = new ReactiveVar(50);
  this.testRunsCount = new ReactiveVar();

  Meteor.subscribe('applications');

  const application = Applications.findOne({
    name: Session.get('application'),
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

  this.autorun(function () {
    const query = {
      $and: [{ expires: 0 }, { reportAnnotations: { $exists: true } }],
    };

    if (Session.get('application') !== undefined)
      query.$and.push({ application: Session.get('application') });
    if (Session.get('testEnvironment') !== undefined)
      query.$and.push({ testEnvironment: Session.get('testEnvironment') });
    if (Session.get('testType') !== undefined)
      query.$and.push({ testType: Session.get('testType') });
    if (Session.get('version') !== undefined)
      query.$and.push({ applicationRelease: Session.get('version') });
    if (Session.get('tags') !== undefined && Session.get('tags').length > 0)
      query.$and.push({ tags: { $all: Session.get('tags') } });

    if (query.$and.length > 0)
      Meteor.subscribe(
        'testRuns',
        'reportsList',
        Template.instance().testRunsLimit.get(),
        query,
      );

    Template.instance().testRunQuery.set(query);

    const instance = Template.instance();

    Meteor.call('getTestRunsCount', query, (err, testRunsCountResponse) => {
      if (testRunsCountResponse.error) {
        log.error(JSON.stringify(testRunsCountResponse.error));
      } else {
        instance.testRunsCount.set(testRunsCountResponse.data);
      }
    });
  });
});

Template.applicationReportsList.helpers({
  showLoadButton() {
    return (
      Template.instance().testRunsCount.get() >
      Template.instance().testRunsLimit.get()
    );
  },
  testRunsWithReport() {
    const query = Template.instance().testRunQuery.get();

    const testRunReports = TestRuns.find(query);

    if (testRunReports) return testRunReports;
  },
  fields() {
    return [
      { key: 'application', label: 'System under test' },
      { key: 'applicationRelease', label: 'Version' },
      { key: 'testType', label: 'Workload' },
      { key: 'testEnvironment', label: 'Test environment' },
      { key: 'testRunId', label: 'Test run ID' },
      {
        key: 'start',
        label: 'Start',
        fn: (value) => {
          return formatDate(value);
        },
      },
      { key: 'end', hidden: true, sortOrder: 0, sortDirection: 'descending' }, //hidden column to sort unformatted date
      {
        key: 'end',
        label: 'End',
        fn: (value) => {
          return formatDate(value);
        },
      },
      {
        key: 'duration',
        label: 'Duration',
        fn: (value) => {
          return humanReadableDuration(value);
        },
      },

      {
        key: '_id',
        sortable: false,
        label: () => {
          return new Spacebars.SafeString(
            `<i id="delete-selected-reports" class="fa fa-trash reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete selected reports"></i>`,
          );
        },
        isVisible: Template.instance().userHasPermissionForApplication,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="delete-report" class="fa fa-trash reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete report"></i>`,
          );
        },
      },

      {
        key: '_id',
        sortable: false,
        label: '',
        /*label: () =>  {
                    return new Spacebars.SafeString(`<input id="select-all-testruns" type='checkbox' />`);
                },*/
        isVisible: Template.instance().userHasPermissionForApplication,
        fn: () => {
          return new Spacebars.SafeString(
            `<input id="select-report" class="reactive-table-icon" type='checkbox' />`,
          );
        },
      },
    ];
  },
  settings() {
    return {
      rowsPerPage: 50,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
    };
  },
});

Template.applicationReportsList.events({
  'click button#load-older-test-runs'(event, template) {
    event.preventDefault();

    template.testRunsLimit.set(template.testRunsLimit.get() + 50);
  },
  'click .reactive-table.admin-teams tbody tr'(event) {
    const testRun = this;
    // eslint-disable-next-line prefer-const
    let reportFilterSettings = {};
    switch (event.target.id) {
      case 'delete-report':
        // noinspection SqlNoDataSourceInspection,SqlDialectInspection
        swal({
          title: 'Delete report from database',
          text: 'Are you sure?',
          icon: 'warning',
          buttons: ['Cancel', 'OK'],
          dangerMode: true,
        }).then((willDelete) => {
          if (willDelete) {
            TestRuns.update(
              {
                _id: testRun._id,
              },
              {
                $unset: {
                  reportAnnotations: '',
                  reportRequirements: '',
                },
              },
            );
          } else {
            swal.close();
          }
        });

        break;
      case 'select-report':
        if (event.target.checked) {
          Template.instance().selectedReports.push(this._id);
        } else {
          const index = Template.instance().selectedReports.indexOf(this._id);
          Template.instance().selectedReports.splice(index, 1);
        }

        break;

      default:
        if (Session.get('application'))
          reportFilterSettings['application'] = Session.get('application');
        if (Session.get('testEnvironment'))
          reportFilterSettings['testEnvironment'] =
            Session.get('testEnvironment');
        if (Session.get('testType'))
          reportFilterSettings['testType'] = Session.get('testType');
        if (Session.get('tags'))
          reportFilterSettings['tags'] = Session.get('tags');

        Session.set('reportFilterSettings', reportFilterSettings);
        Session.set('reportRoute', 'reports');

        const queryParams = {
          systemUnderTest: testRun.application,
          testEnvironment: testRun.testEnvironment,
          workload: testRun.testType,
        };
        const params = {
          systemUnderTest: testRun.application,
          testEnvironment: testRun.testEnvironment,
          workload: testRun.testType,
          testRunId: testRun.testRunId,
        };
        FlowRouter.go('report', params, queryParams);

        break;
    }
  },
  'click #delete-selected-reports'(event, template) {
    swal({
      title: 'Delete selected reports',
      text: 'Are you sure?',
      icon: 'warning',
      buttons: true,
      cancel: true,
      confirm: 'Confirm',
    }).then((willDelete) => {
      //bound to the current `this`
      if (willDelete) {
        _.each(template.selectedReports, (_id) => {
          TestRuns.update(
            {
              _id: _id,
            },
            {
              $unset: {
                reportAnnotations: '',
                reportRequirements: '',
              },
            },
          );
        });

        template.selectedReports.clear();
      } else {
        swal.close();
      }
    });
  },
});
