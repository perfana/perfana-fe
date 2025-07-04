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

// noinspection JSCheckFunctionSignatures

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';
import { ReactiveVar } from 'meteor/reactive-var';
import { formatDate } from '../../../helpers/utils';
import { log } from '/both/logger';

import './runningTests.html';
import './runningTests.less';

import { Applications } from '../../../collections/applications';
import { TestRuns } from '../../../collections/testruns';
import { Session } from 'meteor/session';
import moment from 'moment';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';

Template.runningTests.onCreated(function runningTestsOnCreated() {
  this.state = new ReactiveDict();

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

  Meteor.subscribe('runningTests');
  Meteor.subscribe('grafanas');
  Meteor.subscribe('applicationDashboards', applicationDashboardQuery);
  Meteor.subscribe('reportPanels', reportPanelsQuery);

  this.userHasPermissionForApplication = new ReactiveVar(false);
  this.isAdmin = new ReactiveVar();
  this.isAdmin.set(
    Roles.userHasRole(Meteor.userId(), 'admin') ||
      Roles.userHasRole(Meteor.userId(), 'super-admin'),
  );

  this.ready = new ReactiveVar(false);

  Meteor.subscribe(
    'applications',
    {},
    {
      onReady: () => {
        const application = Applications.findOne({
          name: FlowRouter.current().queryParams.systemUnderTest,
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
      },
    },
  );

  Meteor.subscribe('runningTests', {
    onReady: () => {
      this.ready.set(true);
    },
  });
});

const currentTime = new ReactiveVar(new Date().valueOf());

Meteor.setInterval(() => {
  currentTime.set(moment().utc());
}, 5000); // ms

Template.runningTests.helpers({
  runningTests() {
    const instance = Template.instance();
    if (instance.ready.get()) {
      const query = {
        $and: [
          {
            end: {
              $gte: new Date(currentTime.get() - 30 * 1000),
            },
          },
          { completed: false },
          { 'events.title': { $ne: 'Test aborted' } },
        ],
      };

      if (Session.get('application'))
        query.$and.push({ application: Session.get('application') });
      if (Session.get('testEnvironment'))
        query.$and.push({ testEnvironment: Session.get('testEnvironment') });
      if (Session.get('testType'))
        query.$and.push({ testType: Session.get('testType') });

      return TestRuns.find(query, { sort: { start: 1 } });
    } else {
      return [];
    }
  },
  fields() {
    return [
      { key: 'application', label: 'System under test' },
      { key: 'applicationRelease', label: 'Version' },
      { key: 'testEnvironment', label: 'Test environment' },
      { key: 'testType', label: 'Workload' },
      {
        key: 'testRunId',
        label: 'Test run ID',
        fn: (value, object) => {
          return new Spacebars.SafeString(createLink(object));
        },
      },
      {
        key: 'start',
        label: 'Start',
        fn: (value) => {
          return formatDate(value);
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
        key: 'duration',
        label: 'Duration',
        fn: (value) => {
          return humanReadableDuration(value);
        },
      },
      {
        key: 'end',
        label: 'Progress',
        fn: (value, object) => {
          return new Spacebars.SafeString(getProgressHTML(object));
        },
      },
      {
        key: '_id',
        label: '',
        sortable: false,
        isVisible:
          Template.instance().isAdmin ||
          Template.instance().userHasPermissionForApplication,
        fn: (value, object) => {
          return new Spacebars.SafeString(getTestRunAbortElement(object));
        },
      },
    ];
  },
  settings() {
    return {
      rowsPerPage: 10,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      noDataTmpl: Template.noRunningTests,
    };
  },
  application() {
    return Applications.findOne({ name: this.params().name });
  },
});

Template.runningTests.events({
  'mouseenter .reactive-table tbody tr td i'(event) {
    event.preventDefault();

    tippy('[data-tippy-content]', {
      theme: 'light-border',
    });
  },
  'click .running-tests.reactive-table tbody tr'(event) {
    const testRun = this;

    if (event.target.id !== 'abort-test-run') {
      const queryParams = {
        systemUnderTest: testRun.application,
        testEnvironment: testRun.testEnvironment,
        workload: testRun.testType,
      };

      FlowRouter.go(
        'runningTestCarousel',
        { testRunId: testRun.testRunId },
        queryParams,
      );
    } else {
      const user = Meteor.user();

      testRun.abort = true;
      testRun.abortMessage =
        user && user.username ?
          `Test run manually aborted by ${user.username}`
        : `Test run manually aborted`;

      Meteor.call('updateTestRunAbort', testRun, (error, results) => {
        if (error) {
          window.toastr.clear();
          window.toastr['error'](JSON.stringify(error), 'Error');
        } else {
          if (results.error) {
            window.toastr.clear();
            window.toastr['error'](JSON.stringify(results.error), 'Error');
          } else {
            window.toastr.clear();
            window.toastr['success']('Done!', 'Initiated test run abort');
          }
        }
      });
    }
  },
});

const createLink = (testRun) => {
  return `<a id="running-test" href="/running-test/${testRun.testRunId}?systemUnderTest=${testRun.application}&workload=${testRun.testType}&testEnvironment=${testRun.testEnvironment}">${testRun.testRunId}</a>`;
};
const getProgressHTML = (testRun) => {
  const currentDurationInSeconds =
    (testRun.end.getTime() - testRun.start.getTime()) / 1000;
  const progress =
    testRun.plannedDuration !== -1 ?
      Math.round((currentDurationInSeconds / testRun.plannedDuration) * 100)
    : 0;
  const progressText =
    testRun.plannedDuration === -1 ? 'No data available'
    : progress <= 100 ?
      humanReadableDuration(
        testRun.plannedDuration - currentDurationInSeconds,
      ) + ' left'
    : humanReadableDuration(
        currentDurationInSeconds - testRun.plannedDuration,
      ) + ' longer than expected';

  return `<div class="progress">
                <div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100" style="width: ${progress}%">
                </div>
            </div>
            <div class="progress-text">
               <p>${progressText}</p>
            </div>`;
};

const humanReadableDuration = (durationInSeconds) => {
  const date = new Date(durationInSeconds * 1000);
  let readableDate = '';
  const daysLabel = date.getUTCDate() - 1 === 1 ? ' day, ' : ' days, ';
  const hoursLabel = date.getUTCHours() === 1 ? ' hour, ' : ' hours, ';
  const minutesLabel = date.getUTCMinutes() === 1 ? ' minute' : ' minutes';
  const secondsLabel = date.getUTCSeconds() === 1 ? '  second' : '  seconds';

  if (date.getUTCDate() - 1 > 0)
    readableDate += date.getUTCDate() - 1 + daysLabel;
  if (date.getUTCHours() > 0) readableDate += date.getUTCHours() + hoursLabel;
  if (date.getUTCMinutes() > 0)
    readableDate += date.getUTCMinutes() + minutesLabel;
  if (date.getUTCMinutes() === 0)
    readableDate += date.getUTCSeconds() + secondsLabel;
  return readableDate;
};

const getTestRunAnnotationsTooltip = (testRun) => {
  if (testRun.annotations && testRun.annotations.length > 0) {
    return `<i id="testrun-annotations" class="fa fa-info-circle reactive-table-icon" data-tippy-content="${testRun.annotations}"></i>`;
  } else {
    return `<div></div>`;
  }
};

const getTestRunAbortElement = (testRun) => {
  if (testRun.abort === false) {
    return `<i id="abort-test-run" class="fa fa-lg  fa-stop-circle-o alert-danger reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Abort test run"></i>`;
  } else {
    return `<div></div>`;
  }
};
