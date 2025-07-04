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
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import swal from 'sweetalert';
import { formatDate, humanReadableDuration } from '../../helpers/utils';
import { log } from '/both/logger';

import './failedTestRuns.html';

import { Applications } from '../../collections/applications';
import { TestRuns } from '../../collections/testruns';
import { ReactiveVar } from 'meteor/reactive-var';
import { getConsolidatedBenchmarkResults } from '../application/applicationTestRuns/recentTestRuns';
import { Session } from 'meteor/session';
import _ from 'lodash';

const currentTime = new ReactiveVar(new Date().valueOf());

Meteor.setInterval(() => {
  currentTime.set(new Date().valueOf());
}, 30000); // ms

Template.failedTestRuns.onCreated(function failedTestRunsOnCreated() {
  this.selectedTestruns = new ReactiveArray();
  this.testRunQuery = new ReactiveVar();
  this.testRunsLimit = new ReactiveVar(20);
  this.testRunsCount = new ReactiveVar();
  this.failedTestRuns = new ReactiveVar();
  const currentPage = new ReactiveVar(Session.get('current-page') || 0);
  const rowsPerPage = new ReactiveVar(Session.get('rows-per-page') || 10);
  this.currentPage = currentPage;
  this.rowsPerPage = rowsPerPage;

  const user = Meteor.user();

  let applications;

  if (user) {
    if (
      Roles.userHasRole(user._id, 'admin') ||
      Roles.userHasRole(user._id, 'super-admin')
    ) {
      applications = Applications.find({}).fetch();
    } else if (user.profile.memberOf) {
      applications = Applications.find({
        team: { $in: user.profile.memberOf.teams },
      }).fetch();
    } else {
      applications = Applications.find({}).fetch();
    }

    const applicationNames = applications.map((application) => {
      return application.name;
    });

    const query = {
      $and: [
        {
          application: {
            $in: applicationNames,
          },
        },
        {
          'consolidatedResult.overall': false,
        },
        {
          viewedBy: { $ne: user._id },
        },
        {
          $and: [{ expired: { $exists: true } }, { expired: false }],
        },
      ],
    };

    Template.instance().testRunQuery.set(query);
  }

  Meteor.subscribe('grafanas');
  Meteor.subscribe('applications');

  this.autorun(function () {
    Session.set('current-page', currentPage.get());
    Session.set('rows-per-page', rowsPerPage.get());

    const user = Meteor.user();
    let applications;

    if (user) {
      if (
        Roles.userHasRole(user._id, 'admin') ||
        Roles.userHasRole(user._id, 'super-admin')
      ) {
        applications = Applications.find({}).fetch();
      } else if (user.profile.memberOf) {
        applications = Applications.find({
          team: { $in: user.profile.memberOf.teams },
        }).fetch();
      } else {
        applications = Applications.find({}).fetch();
      }

      const applicationNames = applications.map((application) => {
        return application.name;
      });

      const query = {
        $and: [
          {
            application: {
              $in: applicationNames,
            },
          },
          {
            'consolidatedResult.overall': false,
          },
          {
            viewedBy: { $ne: user._id },
          },
          {
            $and: [{ expired: { $exists: true } }, { expired: false }],
          },
        ],
      };

      const instance = Template.instance();

      Meteor.call('getTestRunsCount', query, (err, testRunsCountResponse) => {
        if (testRunsCountResponse.error) {
          log.error(JSON.stringify(testRunsCountResponse.error));
        } else {
          instance.testRunsCount.set(testRunsCountResponse.data);
        }
      });

      if (
        Template.instance().testRunsCount.get() >
          Template.instance().testRunsLimit.get() &&
        Math.floor(
          Template.instance().testRunsLimit.get() /
            Template.instance().rowsPerPage.get(),
        ) -
          1 ===
          Template.instance().currentPage.get()
      ) {
        Template.instance().testRunsLimit.set(
          Template.instance().testRunsLimit.get() + 20,
        );
        Meteor.subscribe(
          'testRuns',
          'failedTestRuns3',
          Template.instance().testRunsLimit.get(),
          query,
        );
      } else {
        Meteor.subscribe(
          'testRuns',
          'failedTestRuns2',
          Template.instance().testRunsLimit.get(),
          query,
        );
      }

      const failedTestRuns = TestRuns.find(query, {
        sort: { end: -1 },
      }).fetch();

      if (failedTestRuns)
        Template.instance().failedTestRuns.set(failedTestRuns);
    }
  });
});

Template.failedTestRuns.onRendered(function failedTestRunsOnRendered() {});

Template.failedTestRuns.helpers({
  hasFailedTestRuns() {
    if (Template.instance().failedTestRuns.get())
      return Template.instance().failedTestRuns.get().length > 0;
  },
  failedTestRuns() {
    return Template.instance().failedTestRuns.get() !== undefined ?
        Template.instance().failedTestRuns.get()
      : [];
  },

  fields() {
    return [
      { key: 'application', label: 'System under test' },
      { key: 'applicationRelease', label: 'Release' },
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
        label: '',
        fn: (value, object) => {
          return new Spacebars.SafeString(getTestRunBaselineIcon(object));
        },
      },
      {
        key: '_id',
        label: '',
        fn: (value, object) => {
          return new Spacebars.SafeString(getTestRunAnnotationsTooltip(object));
        },
      },
      {
        key: '_id',
        label: '',
        fn: (value, object) => {
          return new Spacebars.SafeString(getReport(object));
        },
      },
      {
        key: '_id',
        label: 'Result',
        fn: (value, object) => {
          return new Spacebars.SafeString(
            getConsolidatedBenchmarkResults(object),
          );
        },
      },
    ];
  },

  settings() {
    return {
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      noDataTmpl: Template.noTestRuns,
      currentPage: Template.instance().currentPage,
      rowsPerPage: Template.instance().rowsPerPage,
    };
  },

  application() {
    return Applications.findOne({ name: this.params().name });
  },
});

Template.failedTestRuns.events({
  'click .clear-all-failed-test-runs'(event, template) {
    /* Update viewedBy property */

    const user = Meteor.user();

    if (user) {
      const failedTestRuns = template.failedTestRuns.get();

      Meteor.call('testRunsUpdateViewedBy', failedTestRuns, user);
    }
  },
  'click .reactive-table tbody tr'(event) {
    const testRun = this;

    switch (event.target.id) {
      case 'delete-testrun':
        swal({
          title: 'Delete test run',
          text: testRun.testRunId,
          icon: 'warning',
          buttons: ['Cancel', 'OK'],
          dangerMode: true,
        }).then((willDelete) => {
          //bound to the current `this`
          if (willDelete) {
            Meteor.call('deleteTestRun', this._id, () => {});
          } else {
            swal.close();
          }
        });

        break;

      case 'set-filter-testrun':
        const queryParams = {
          systemUnderTest: testRun.application,
          testEnvironment: testRun.testEnvironment,
          workload: testRun.testType,
        };

        FlowRouter.go('testRuns', null, queryParams);

        break;
      case 'select-testrun':
        if (event.target.checked) {
          Template.instance().selectedTestruns.push(this._id);
        } else {
          const index = Template.instance().selectedTestruns.indexOf(this._id);
          Template.instance().selectedTestruns.splice(index, 1);
        }

        break;

      case 'view-report':
        const reportParams = {
          systemUnderTest: testRun.application,
          testRunId: testRun.testRunId,
        };
        const reportQueryParams = {
          systemUnderTest: testRun.application,
          workload: testRun.testType,
          testEnvironment: testRun.testEnvironment,
        };
        FlowRouter.go('testRunReport', reportParams, reportQueryParams);

        break;

      default:
        if (!event.target.className.includes('disabled')) {
          const params = {
            systemUnderTest: testRun.application,
            testRunId: testRun.testRunId,
          };
          const queryParams = {
            systemUnderTest: testRun.application,
            workload: testRun.testType,
            testEnvironment: testRun.testEnvironment,
          };
          FlowRouter.go('testRunSummary', params, queryParams);
        }
    }
  },
  'click #delete-selected-testruns'(event, template) {
    swal({
      title: 'Delete selected test runs',
      text: 'Are you sure?',
      icon: 'warning',
      buttons: true,
      cancel: true,
      confirm: 'Confirm',
    }).then((willDelete) => {
      //bound to the current `this`
      if (willDelete) {
        _.each(template.selectedTestruns, (_id) => {
          Meteor.call('deleteTestRun', _id, () => {});
        });

        template.selectedTestruns.clear();
      } else {
        swal.close();
      }
    });
  },
});

const getTestRunAnnotationsTooltip = (testRun) => {
  if (testRun.annotations && testRun.annotations.length > 0) {
    return `<i id="testrun-annotations" class="fa fa-info-circle reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="${testRun.annotations}"></i>`;
  } else {
    return `<div></div>`;
  }
};

const getTestRunBaselineIcon = (testRun) => {
  const application = Applications.findOne({ name: testRun.application });

  if (application) {
    const baselineTestRuns = [];

    _.each(application.testEnvironments, (testEnvironment) => {
      _.each(testEnvironment.testTypes, (testType) => {
        if (testType.baselineTestRun)
          baselineTestRuns.push(testType.baselineTestRun);
      });
    });

    if (baselineTestRuns.indexOf(testRun.testRunId) !== -1) {
      return `<i  class="fa fa-flag reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Baseline test run"></i>`;
    } else {
      return `<div></div>`;
    }
  }
};

const getReport = (testRun) => {
  let HTML;

  if (
    _.has(testRun, 'reportAnnotations') &&
    testRun.reportAnnotations.length > 0
  ) {
    HTML = `<i class="fa fa-file-text-o reactive-table-icon" id="view-report" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="View report"></i>`;
  } else {
    HTML = '<span></span>';
  }

  return HTML;
};
