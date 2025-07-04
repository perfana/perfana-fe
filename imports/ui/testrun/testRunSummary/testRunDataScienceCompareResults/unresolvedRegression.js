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
// noinspection HtmlUnknownAttribute

import { Template } from 'meteor/templating';
import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import './unresolvedRegression.html';
import { dynamicSort, formatDate, getTestRun } from '/imports/helpers/utils';
import { Session } from 'meteor/session';

Template.unresolvedRegressionOverview.onCreated(
  function unresolvedRegressionOverviewOnCreated() {
    this.unresolvedRegression = new ReactiveVar();
    this.unresolvedRegressionsForTestRun = new ReactiveVar();
    this.selectedTestRun = new ReactiveVar();
    this.showControlGroupRunsOnly = new ReactiveVar(true);

    this.autorun(() => {
      let unresolvedRegression = Template.currentData().unresolvedRegression;
      // if( this.showControlGroupRunsOnly.get() === true){
      //     unresolvedRegression = unresolvedRegression.filter((unresolvedRegression) => {
      //         return unresolvedRegression.consolidatedResult && unresolvedRegression.consolidatedResult.meetsRequirement === true;
      //     });
      // }
      // filter out test runs without regressions
      // unresolvedRegression = unresolvedRegression.filter((unresolvedRegression) => {
      //     return unresolvedRegression.regressions > 0;
      // });

      // add index to each unresolved regression
      unresolvedRegression = unresolvedRegression
        .sort(dynamicSort('start'))
        .map((unresolvedRegression, index) => {
          unresolvedRegression.index = index;
          return unresolvedRegression;
        });

      if (!this.selectedTestRun.get()) {
        this.selectedTestRun.set(
          unresolvedRegression.length > 0 ?
            `${unresolvedRegression.sort(dynamicSort('start'))[0].trackedTestRunId}`
          : '',
        );
      }

      this.unresolvedRegression.set(unresolvedRegression);
      const selectedTestRun = this.selectedTestRun.get();
      if (selectedTestRun) {
        const unresolvedRegressionsForTestRun = this.unresolvedRegression
          .get()
          .find(
            (unresolvedRegression) =>
              `${unresolvedRegression.trackedTestRunId}` === selectedTestRun,
          ).data;
        this.unresolvedRegressionsForTestRun.set(
          unresolvedRegressionsForTestRun,
        );
      }
    });
  },
);

Template.unresolvedRegressionOverview.onRendered(
  function unresolvedRegressionOverviewOnRendered() {},
);

Template.unresolvedRegressionOverview.helpers({
  showControlGroupRunsOnly() {
    return Template.instance().showControlGroupRunsOnly.get();
  },
  selectedTestRun() {
    return (
      Template.instance().selectedTestRun &&
      Template.instance().selectedTestRun.get()
    );
  },

  unresolvedRegressionsForTestRunChunks() {
    let unresolvedRegressionsForTestRun =
      Template.instance().unresolvedRegressionsForTestRun.get();
    if (unresolvedRegressionsForTestRun) {
      const chunks = [];
      const size =
        Session.get('graphsPerRow') ? Session.get('graphsPerRow')
        : unresolvedRegressionsForTestRun.length < 4 ?
          unresolvedRegressionsForTestRun.length
        : 3;
      const columnWidth = 12 / size;
      Session.set('columnWidth', `col-md-${columnWidth}`);
      while (unresolvedRegressionsForTestRun.length > size) {
        chunks.push({ row: unresolvedRegressionsForTestRun.slice(0, size) });
        unresolvedRegressionsForTestRun =
          unresolvedRegressionsForTestRun.slice(size);
      }
      chunks.push({ row: unresolvedRegressionsForTestRun });
      return chunks;
    }
  },

  rowClass() {
    if (Template.instance().selectedTestRun.get()) {
      return function (item) {
        // let rowClass = (item.ignore.ignore === true) ? 'ignored ' : '';
        let rowClass = '';

        if (`${item.trackedTestRunId}` === this.templateData.selectedTestRun) {
          rowClass += 'profile-selected';
        }
        return rowClass;
      };
    }
  },
  unresolvedRegression() {
    return (
      Template.instance().unresolvedRegression &&
      Template.instance().unresolvedRegression.get().sort(dynamicSort('start'))
    );
  },

  fields() {
    return [
      { key: 'trackedTestRunId', label: 'Test run' },
      {
        key: 'start',
        label: 'Date',
        fn: function (value) {
          return formatDate(value);
        },
      },
      { key: 'applicationRelease', label: 'Version' },
      { key: 'annotations', label: 'Annotations' },
      // { key: 'regressions', label: '# of regressions' },
      // { key: 'unresolvedRegressions', label: '# of unresolvedRegressions' },
      // { key: 'resolvedRegressions', label: '# of resolvedRegressions' },
      // { key: 'consolidatedResult.meetsRequirement', label: 'SLO', fn: function(value, object) { return value === true ? 'OK' : 'NOK'; } },
      {
        key: 'trackedTestRunId',
        label: '',
        fn: function (value, object) {
          if (object.index === 0) {
            return new Spacebars.SafeString(
              `<i class="fa fa-lg fa-check alert-success" id="accept-regression" data-tippy-content="Click to accept regression as variability and keep test run in the control group used as baseline"></i>`,
            );
          } else {
            return '';
          }
        },
      },
      {
        key: 'trackedTestRunId',
        label: '',
        fn: function (value, object) {
          if (object.index === 0) {
            return new Spacebars.SafeString(
              `<i class="fa fa-lg fa-times alert-warning" id="deny-regression" data-tippy-content="Click to confirm regression and exclude test run from the control group. Since all Service Level Objectives were met for this test run, you might want to revisit them"></i>`,
            );
          } else {
            return '';
          }
        },
      },
      {
        key: 'trackedTestRunId',
        label: '',
        fn: (value, object) => {
          return new Spacebars.SafeString(createLink(object));
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
    };
  },
});

Template.unresolvedRegressionOverview.events({
  'change input#showControlGroupRunsOnly'(event, template) {
    template.showControlGroupRunsOnly.set(event.currentTarget.checked);
  },
  'mouseenter .reactive-table tbody tr td i'(event) {
    event.preventDefault();

    tippy('[data-tippy-content]', {
      theme: 'light-border',
    });
  },
  'click .reactive-table tbody tr'(event) {
    event.preventDefault();

    let testRun;

    switch (event.target.id) {
      case 'test-run-link':
        const testRunUrl = event.target.getAttribute('test-run-url');
        window.open(testRunUrl, '_blank');
        break;
      case 'accept-regression':
        testRun = getTestRun(
          FlowRouter.current().queryParams.systemUnderTest,
          this.trackedTestRunId,
        );
        if (testRun) {
          Meteor.call(
            'resolveRegression',
            testRun,
            'ACCEPTED',
            true,
            (err, result) => {
              if (result.error) {
                window.toastr.clear();
                window.toastr['error'](JSON.stringify(result.error), 'Error');
              } else {
                window.toastr.clear();
                window.toastr['success'](
                  'Done!',
                  'Accepted regression as variability!',
                );

                const queryParams = {};

                if (Session.get('team'))
                  queryParams['team'] = Session.get('team');
                if (Session.get('application'))
                  queryParams['systemUnderTest'] = Session.get('application');
                if (Session.get('testEnvironment'))
                  queryParams['testEnvironment'] =
                    Session.get('testEnvironment');
                if (Session.get('testType'))
                  queryParams['workload'] = Session.get('testType');

                FlowRouter.go('testRuns', null, queryParams);
              }
            },
          );
        }
        break;
      case 'deny-regression':
        testRun = getTestRun(
          FlowRouter.current().queryParams.systemUnderTest,
          this.trackedTestRunId,
        );
        if (testRun) {
          Meteor.call(
            'resolveRegression',
            testRun,
            'DENIED',
            true,
            (err, result) => {
              if (result.error) {
                window.toastr.clear();
                window.toastr['error'](JSON.stringify(result.error), 'Error');
              } else {
                window.toastr.clear();
                window.toastr['success'](
                  'Done!',
                  'Removed test run from the baseline!',
                );

                const queryParams = {};

                if (Session.get('team'))
                  queryParams['team'] = Session.get('team');
                if (Session.get('application'))
                  queryParams['systemUnderTest'] = Session.get('application');
                if (Session.get('testEnvironment'))
                  queryParams['testEnvironment'] =
                    Session.get('testEnvironment');
                if (Session.get('testType'))
                  queryParams['workload'] = Session.get('testType');

                FlowRouter.go('testRuns', null, queryParams);
              }
            },
          );
        }
        break;
      default:
        Template.instance().selectedTestRun.set(`${this.trackedTestRunId}`);
        break;
    }
  },
  'click #row-1'() {
    // $(".btn-group > .btn").removeClass("active");
    // event.currentTarget.classList.toggle("active");
    Session.set('graphsPerRow', 1);
  },
  'click #row-2'() {
    // $(".btn-group > .btn").removeClass("active");
    // event.currentTarget.classList.toggle("active");
    Session.set('graphsPerRow', 2);
  },
  'click #row-3'() {
    // $(".btn-group > .btn").removeClass("active");
    // event.currentTarget.classList.toggle("active");
    Session.set('graphsPerRow', 3);
  },
  'click #row-4'() {
    // $(".btn-group > .btn").removeClass("active");
    // event.currentTarget.classList.toggle("active");
    Session.set('graphsPerRow', 4);
  },
});

Template.unresolvedRegressionRow.helpers({
  columnClass() {
    return Session.get('columnWidth');
  },
  dashboardLabel() {
    return this.dashboardLabel;
  },
  panelTitle() {
    return this.panelTitle;
  },
  panelId() {
    return this.panelId;
  },
  applicationDashboardId() {
    return this.applicationDashboardId;
  },
  metricName() {
    return this.metricName;
  },
  testRunId() {
    return `${this.trackedTestRunId}`;
  },
});

const createLink = (testRun) => {
  return `<i id="test-run-link" class="fa fa-external-link" test-run-url="/test-run/${testRun.trackedTestRunId}?systemUnderTest=${testRun.application}&workload=${testRun.testType}&testEnvironment=${testRun.testEnvironment}&tab=adapt" data-tippy-content="Click to open test run in new tab"></i>`;
};
