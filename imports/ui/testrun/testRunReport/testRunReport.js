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
import { formatDate, getTestRun } from '../../../helpers/utils';
import { Comments } from '../../../collections/comments';
import { log } from '/both/logger';
import './testRunReport.html';
import './testRunReport.less';

import { Session } from 'meteor/session';
import { ReactiveVar } from 'meteor/reactive-var';
import { Applications } from '../../../collections/applications';
import { CompareResults } from '../../../collections/compareResults';
import { ReportPanels } from '../../../collections/reportPanels';
import { Snapshots } from '../../../collections/snapshots';
import { $ } from 'meteor/jquery';
import _ from 'lodash';

Template.testRunReportPage.onCreated(function applicationOnCreated() {
  this.state = new ReactiveDict();
  this.testRun = new ReactiveVar();
  this.visibleLimit = new ReactiveVar(1);

  Meteor.setTimeout(() => {
    this.visibleLimit.set(3);
  }, 1000);

  this.autorun(() => {
    FlowRouter.watchPathChange();
    const query = {
      $and: [
        { application: FlowRouter.current().params.systemUnderTest },
        { testEnvironment: FlowRouter.current().params.testEnvironment },
        { testType: FlowRouter.current().params.workload },
        { testRunId: FlowRouter.current().params.testRunId },
      ],
    };

    const applicationDashboardQuery = {
      $and: [
        { application: FlowRouter.current().params.systemUnderTest },
        { testEnvironment: FlowRouter.current().params.testEnvironment },
      ],
    };

    Meteor.subscribe('testRuns', 'testRunReport', 50, query);
    Meteor.subscribe('grafanas');
    Meteor.subscribe('applications');
    Meteor.subscribe('applicationDashboards', applicationDashboardQuery);
    Meteor.subscribe('benchmarks', query);
    Meteor.subscribe('reportPanels', query);
    Meteor.subscribe('comments');

    const testRun = getTestRun(
      FlowRouter.current().params.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    this.testRun.set(testRun);
  });
});

Template.testRunReportPage.onRendered(function applicationOnRendered() {
  const self = this;

  $(window).on('scroll', function () {
    const scrollHeight = $(document).height();
    const scrollPos = Math.floor($(window).height() + $(window).scrollTop());
    const isBottom = scrollHeight - scrollPos < 100;

    if (isBottom) {
      const previousLimit = self.visibleLimit.get();
      self.visibleLimit.set(previousLimit + 4); // Increase the limit by 4
    }
  });
});

Template.testRunReportPage.helpers({
  testRun() {
    return Template.instance().testRun.get();
  },
});

Template.testRunReport.onRendered(function testRunReportOnRendered() {
  const parentInstance = this.view.parentView.parentView.templateInstance();

  this.autorun(() => {
    this.visibleLimit.set(parentInstance.visibleLimit.get());
  });
});

Template.testRunReport.onCreated(function testRunReportOnCreated() {
  this.visibleLimit = new ReactiveVar(1);

  if (this.data.testRun) {
    if (!_.has(this.data.testRun, 'reportAnnotations')) {
      Meteor.call('generateReport', this.data.testRun);
    }
  }

  this.autorun(() => {
    const testRun = getTestRun(
      FlowRouter.current().params.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    const snapshotQuery = {
      $and: [
        { application: Session.get('application') },
        { testEnvironment: Session.get('testEnvironment') },
        { testType: Session.get('testType') },
        { testRunId: FlowRouter.current().params.testRunId },
        {
          $or: [{ status: 'COMPLETE' }, { status: 'ERROR' }],
        },
      ],
    };

    Meteor.subscribe('snapshots', snapshotQuery, 'testRunReports');

    this.userHasPermissionForApplication = new ReactiveVar(false);

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

    const query = {
      $and: [
        { application: Session.get('application') },
        { testEnvironment: Session.get('testEnvironment') },
        { testType: Session.get('testType') },
        { testRunId: FlowRouter.current().params.testRunId },
      ],
    };

    Meteor.subscribe('compareResults', query);
  });
});

Template.testRunReport.helpers({
  snapshotsIncomplete() {
    const reportPanels = ReportPanels.find(
      {
        $and: [
          { application: FlowRouter.current().queryParams.systemUnderTest },
          { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
          { testType: FlowRouter.current().queryParams.workload },
        ],
      },
      { sort: { index: 1 } },
    ).fetch();

    if (reportPanels) {
      const dashboardsData = reportPanels.map((reportPanel) => {
        return {
          dashboardUid: reportPanel.dashboardUid,
          dashboardLabel: reportPanel.dashboardLabel,
        };
      });

      let snapshotsCounter = 0;

      dashboardsData.forEach((dashboardData) => {
        const snapshot = Snapshots.findOne({
          $and: [
            { application: Session.get('application') },
            { testEnvironment: Session.get('testEnvironment') },
            { testType: Session.get('testType') },
            { testRunId: FlowRouter.current().params.testRunId },
            { status: 'COMPLETE' },
            { dashboardUid: dashboardData.dashboardUid },
            { dashboardLabel: dashboardData.dashboardLabel },
          ],
        });

        if (snapshot) {
          snapshotsCounter++;
        }
      });

      if (snapshotsCounter > 0) {
        return snapshotsCounter < dashboardsData.length;
      }
    }
  },
  reportWillExpire() {
    const testRun = this.testRun;
    if (testRun) {
      return testRun.expires !== 0 && testRun.expired === false;
    }
  },
  testRunExpiry() {
    const testRun = this.testRun;
    if (testRun) {
      return formatDate(
        new Date(testRun.end).setSeconds(
          new Date(testRun.end).getSeconds() + parseInt(testRun.expires),
        ),
      );
    }
  },
  reportComparisonHasAnnotation() {
    return _.has(this, 'annotation');
  },
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
  hasReportComparisons() {
    const testRun = this.testRun;

    if (testRun) {
      return testRun.reportComparisons && testRun.reportComparisons.length > 0;
    }
  },
  testRunHasCompareResults() {
    const testRun = this.testRun;

    if (testRun) {
      const compareResults = CompareResults.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
          { testRunId: testRun.testRunId },
          { status: 'COMPLETE' },
        ],
      }).fetch();

      if (compareResults) {
        return compareResults.length > 0;
      }
    }
  },
  testRunHasEvents() {
    const testRun = this.testRun;

    if (testRun) {
      return _.has(testRun, 'events') && testRun.events.length > 0;
    }
  },
  testRunHasAlerts() {
    const testRun = this.testRun;

    if (testRun) {
      return _.has(testRun, 'alerts') && testRun.alerts.length > 0;
    }
  },
  hasReportAnnotations() {
    const testRun = this.testRun;

    if (testRun) {
      if (_.has(testRun, 'reportAnnotations') && testRun.reportAnnotations) {
        const panelsWithAnnotations = testRun.reportAnnotations.filter(
          (reportAnnotation) =>
            reportAnnotation.panel.annotation &&
            reportAnnotation.panel.annotation !== '',
        );

        return panelsWithAnnotations.length > 0;
      } else {
        return false;
      }
    }
  },

  testRunComments() {
    return Comments.find({
      $and: [
        { application: this.testRun.application },
        { testEnvironment: this.testRun.testEnvironment },
        { testType: this.testRun.testType },
        { testRunId: this.testRun.testRunId },
      ],
    });
  },
  hasComments() {
    const testRun = this.testRun;

    if (testRun) {
      return (
        Comments.find({
          $and: [
            { application: testRun.application },
            { testEnvironment: testRun.testEnvironment },
            { testType: testRun.testType },
            { testRunId: testRun.testRunId },
          ],
        }).fetch().length > 0
      );
    }
  },
  testReportPanels() {
    let reportAnnotations;
    const testRun = this.testRun;
    const limit = Template.instance().visibleLimit.get();

    if (testRun) {
      if (testRun.reportAnnotations && testRun.reportAnnotations.length > 0) {
        reportAnnotations = testRun.reportAnnotations;
      } else {
        reportAnnotations = ReportPanels.find(
          {
            $and: [
              { application: FlowRouter.current().queryParams.systemUnderTest },
              {
                testEnvironment:
                  FlowRouter.current().queryParams.testEnvironment,
              },
              { testType: FlowRouter.current().queryParams.workload },
            ],
          },
          { sort: { index: 1 }, limit: limit },
        ).fetch();
      }

      // add testRunObject to each reportAnnotations object

      if (reportAnnotations) {
        return reportAnnotations.map((reportAnnotationsObj) => ({
          reportAnnotations: reportAnnotationsObj,
          testRun: testRun,
        }));
      }
    }
  },
  testRun() {
    return this.testRun;
  },
  testRunHasRequirements() {
    const testRun = this.testRun;

    if (testRun)
      return (
        testRun.consolidatedResult &&
        testRun.consolidatedResult.meetsRequirement !== undefined
      );
  },
  testRunHasSnapshots() {
    const testRun = this.testRun;

    if (testRun) return testRun.snapshots && testRun.snapshots.length > 0;
  },
});

Template.testRunReport.events({
  'click .go-to-manage-tab'(event) {
    event.preventDefault();
    const params = { testRunId: FlowRouter.current().params.testRunId };
    const queryParams = {
      systemUnderTest: FlowRouter.current().queryParams.systemUnderTest,
      workload: FlowRouter.current().queryParams.workload,
      testEnvironment: FlowRouter.current().queryParams.testEnvironment,
      tab: 'manage',
    };

    BlazeLayout.reset();
    FlowRouter.go('testRunSummary', params, queryParams);
  },
  'click .persist-report'(event) {
    event.preventDefault();
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    Meteor.call('persistTestRunReport', testRun, (error, results) => {
      if (error) {
        window.toastr.clear();
        window.toastr['error'](JSON.stringify(error), 'Error');
      } else {
        if (results.error) {
          window.toastr.clear();
          window.toastr['error'](JSON.stringify(results.error), 'Error');
        } else {
          window.toastr.clear();
          window.toastr['success']('Done!', 'Persisted test run report');
        }
      }
    });
  },

  // 'click div #edit-annotations' (event) {
  //     event.preventDefault();
  //     if(userHasPermissionForApplicationFn(this.testRun)){
  //         Modal.show('testRunReportPanelAnnotation', this);
  //     }
  //
  // },
  // 'click div #add-annotations' (event) {
  //     event.preventDefault();
  //     if(userHasPermissionForApplicationFn(this.testRun)){
  //         Modal.show('testRunReportPanelAnnotation', this);
  //     }
  //
  // },
  'click div .select-report-comparison'(event) {
    event.preventDefault();
    const params = { testRun: this.testRun };

    Modal.show('testRunReportComparisonsModal', params);
  },
  'click #edit-compare-result-annotation'(event) {
    event.preventDefault();
    // let params = {testRun: this.testRun};
    Modal.show('testRunReportComparisonAnnotation', this);
  },
  'click #add-compare-result-annotation'(event) {
    event.preventDefault();
    // let params = {testRun: this.testRun};
    Modal.show('testRunReportComparisonAnnotation', this);
  },
  'click div .ci-build-result-url'(event) {
    event.preventDefault();
    window.open($(event.target).text(), '_blank');
  },
  'click div .grafana-dashboard-link'(event) {
    event.preventDefault();
    window.open(this.dashboardUrl, '_blank');
  },
  'click div .grafana-snapshot-link'(event) {
    event.preventDefault();
    const params = { testRunId: this.testRun.testRunId };
    const queryParams = {
      systemUnderTest: this.testRun.application,
      workload: this.testRun.testType,
      testEnvironment: this.testRun.testEnvironment,
      dashboard: this.dashboardLabel,
    };

    FlowRouter.go('testRunSnapshots', params, queryParams);
  },
});

Template.testRunReportComparisonsModal.helpers({
  testRun() {
    return this.testRun;
  },
});
Template.testRunReportComparisonsModal.events({
  'click button#save-test-run-report-comparisons'(event) {
    event.preventDefault();

    Meteor.call(
      'addTestRunReportComparison',
      this.testRun,
      Session.get('selectedCompareResultLabel'),
      Session.get('selectedCompareResultBaselineTestRunId'),
      (err, result) => {
        if (result.error) {
          window.toastr.clear();
          window.toastr['error'](JSON.stringify(result.error), 'Error');
        } else {
          // noinspection JSCheckFunctionSignatures
          Modal.hide('testRunReportComparisonsModal');
        }
      },
    );
  },
});

Template.testRunReportComparisonAnnotation.events({
  'click div #save-testrun-comparison-annotations'(event) {
    event.preventDefault();

    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const index =
        testRun.reportComparisons ?
          testRun.reportComparisons
            .map((reportComparison) => {
              return reportComparison.compareResultLabel;
            })
            .indexOf(this.compareResultLabel)
        : 0;

      if (!testRun.reportComparisons) testRun.reportComparisons = [];

      testRun.reportComparisons[index].annotation = $('#annotations').val();

      Meteor.call(
        'updateTestRunReportComparisonAnnotations',
        testRun,
        (err, result) => {
          if (result.error) {
            window.toastr.clear();
            window.toastr['error'](JSON.stringify(result.error), 'Error');
          } else {
            window.toastr.clear();
            window.toastr['success']('Done!', 'Updated report!');
            $('#testreport-comparison-annotations-modal').modal('hide');
          }
        },
      );
    }
  },
});
