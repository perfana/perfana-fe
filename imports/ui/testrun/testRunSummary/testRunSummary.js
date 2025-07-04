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
import {
  getFixedBaselineTestRun,
  getNextTestRun,
  getPreviousTestRun,
  getTestRun,
} from '../../../helpers/utils';
import { log } from '/both/logger';
import { ApplicationDashboards } from '/imports/collections/applicationDashboards';
import { TestRuns } from '/imports/collections/testruns';
import { DeepLinks } from '/imports/collections/deeplinks';
import { ReactiveVar } from 'meteor/reactive-var';
import { ReportPanels } from '/imports/collections/reportPanels';
import { Session } from 'meteor/session';
import { Snapshots } from '/imports/collections/snapshots';
import { Benchmarks } from '/imports/collections/benchmarks';
import './testRunSummary.html';
import './testRunSummary.less';
import './testRunDataScienceCompareResults/trackedRegression';
import { Comments } from '/imports/collections/comments';
import { Applications } from '/imports/collections/applications';
import { DsAdaptConclusion } from '/imports/collections/dsAdaptConclusion';
import { $ } from 'meteor/jquery';
import tippy from 'tippy.js';
import _ from 'lodash';
import { marked } from 'marked';

Template.testRunSummary.onCreated(function applicationOnCreated() {
  this.state = new ReactiveDict();
  this.testRun = new ReactiveVar();

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

  Meteor.subscribe('grafanas');
  Meteor.subscribe('applications');
  Meteor.subscribe('applicationDashboards', applicationDashboardQuery);
  Meteor.subscribe('benchmarks', query);

  const snapshotQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
      { testRunId: FlowRouter.current().params.testRunId },
    ],
  };
  Meteor.subscribe('snapshots', snapshotQuery, 'testRunSummary');

  const grafanaDashboardsQuery = {
    $and: [{ usedBySUT: Session.get('application') }],
  };

  Meteor.subscribe('grafanaDashboards', grafanaDashboardsQuery);

  Meteor.subscribe('testRuns', 'testRunSummary', 500, query, {
    onReady: () => {
      const testRun = getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        FlowRouter.current().params.testRunId,
      );

      if (testRun) {
        this.testRun.set(testRun);

        /* Update viewedBy property */
        const user = Meteor.user();

        if (user) {
          if (
            testRun &&
            ((testRun.viewedBy && testRun.viewedBy.indexOf(user._id) === -1) ||
              !testRun.viewedBy)
          ) {
            Meteor.call('testRunUpdateViewedBy', testRun, user);
          }
        }
      }
    },
  });
});

Template.testRunSummary.onRendered(function applicationOnRendered() {
  Meteor.subscribe('deepLinks');

  this.autorun(() => {
    FlowRouter.watchPathChange();
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    if (testRun) this.testRun.set(testRun);
  });
});

Template.testRunSummary.helpers({
  showDataScienceCompare() {
    const user = Meteor.user();
    if (user) {
      if (Roles.userHasRole(user._id, 'super-admin')) {
        return true;
      } else {
        return Meteor.settings.public.betaFeatureAdapt === true;
      }
    }
  },
  showLegacyCompare() {
    return Meteor.settings.showLegacyCompare ?
        Meteor.settings.showLegacyCompare === true
      : true;
  },
  previousTestRunId() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    if (testRun) {
      return getPreviousTestRun(testRun, true);
    }
  },
  trackedRegressionDetected() {
    return (
      Template.instance().trackedRegressions &&
      Template.instance().trackedRegressions.get().length > 0
    );
  },
  baselineTestRunId() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    if (testRun) {
      const baselineTestRunId = getFixedBaselineTestRun(testRun);
      if (baselineTestRunId) {
        Meteor.setTimeout(() => {
          return baselineTestRunId;
        }, 100);
      }
    }
  },

  hasPreviousTestRun() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    if (testRun) {
      const previousTestRunId = getPreviousTestRun(testRun, true);
      const baselineTestRunId = getFixedBaselineTestRun(testRun);
      if (baselineTestRunId !== undefined) {
        return (
          previousTestRunId !== undefined &&
          previousTestRunId !== baselineTestRunId
        );
      } else {
        return previousTestRunId !== undefined;
      }
    }
  },
  hasBaselineTestRun() {
    const application = Applications.findOne({
      name: FlowRouter.current().queryParams.systemUnderTest,
    });
    let testTypeIndex;
    if (application) {
      const testEnvironmentIndex = application.testEnvironments
        .map((testEnvironment) => {
          return testEnvironment.name;
        })
        .indexOf(FlowRouter.current().queryParams.testEnvironment);

      if (testEnvironmentIndex !== -1) {
        testTypeIndex = application.testEnvironments[
          testEnvironmentIndex
        ].testTypes
          .map((testType) => {
            return testType.name;
          })
          .indexOf(FlowRouter.current().queryParams.workload);
      }

      return (
        application.testEnvironments[testEnvironmentIndex].testTypes[
          testTypeIndex
        ].baselineTestRun !== undefined
      );
    }
  },
  adaptEnabled() {
    const application = Applications.findOne({
      name: FlowRouter.current().queryParams.systemUnderTest,
    });
    let testTypeIndex;
    if (application) {
      const testEnvironmentIndex = application.testEnvironments
        .map((testEnvironment) => {
          return testEnvironment.name;
        })
        .indexOf(FlowRouter.current().queryParams.testEnvironment);

      if (testEnvironmentIndex !== -1) {
        testTypeIndex = application.testEnvironments[
          testEnvironmentIndex
        ].testTypes
          .map((testType) => {
            return testType.name;
          })
          .indexOf(FlowRouter.current().queryParams.workload);
      }

      return (
        application.testEnvironments[testEnvironmentIndex].testTypes[
          testTypeIndex
        ].enableAdapt === true
      );
    }
  },
  autocompareTestRuns() {
    const application = Applications.findOne({
      name: FlowRouter.current().queryParams.systemUnderTest,
    });
    let testTypeIndex;
    if (application) {
      const testEnvironmentIndex = application.testEnvironments
        .map((testEnvironment) => {
          return testEnvironment.name;
        })
        .indexOf(FlowRouter.current().queryParams.testEnvironment);

      if (testEnvironmentIndex !== -1) {
        testTypeIndex = application.testEnvironments[
          testEnvironmentIndex
        ].testTypes
          .map((testType) => {
            return testType.name;
          })
          .indexOf(FlowRouter.current().queryParams.workload);
      }

      return application.testEnvironments[testEnvironmentIndex].testTypes[
        testTypeIndex
      ].autoCompareTestRuns;
    }
  },
  isNotBaselineTestRun() {
    const application = Applications.findOne({
      name: FlowRouter.current().queryParams.systemUnderTest,
    });
    let testTypeIndex;
    if (application) {
      const testEnvironmentIndex = application.testEnvironments
        .map((testEnvironment) => {
          return testEnvironment.name;
        })
        .indexOf(FlowRouter.current().queryParams.testEnvironment);

      if (testEnvironmentIndex !== -1) {
        testTypeIndex = application.testEnvironments[
          testEnvironmentIndex
        ].testTypes
          .map((testType) => {
            return testType.name;
          })
          .indexOf(FlowRouter.current().queryParams.workload);
      }

      return (
        application.testEnvironments[testEnvironmentIndex].testTypes[
          testTypeIndex
        ].baselineTestRun !== FlowRouter.current().params.testRunId
      );
    }
  },

  testRun() {
    return Template.instance().testRun.get();
  },
  testRunHasAlerts() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) return testRun.alerts && testRun.alerts.length > 0;
  },
  testRunHasEvents() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) return testRun.events && testRun.events.length > 0;
  },
  testRunHasSnapshots() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const snapshots = Snapshots.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
          { testRunId: testRun.testRunId },
        ],
      });

      if (snapshots) return snapshots.fetch().length > 0;
    }
  },
  testRunHasLinks() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const deeplinks = DeepLinks.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
        ],
      });

      if (deeplinks) return deeplinks.fetch().length > 0;
    }
  },
  testRunHasVariables() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) return testRun.variables && testRun.variables.length > 0;
  },
  applicationHasGrafanaDashboards() {
    const applicationDashboards = ApplicationDashboards.find({
      $and: [
        { application: FlowRouter.current().queryParams.systemUnderTest },
        { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
      ],
    }).fetch();

    if (applicationDashboards) return applicationDashboards.length > 0;
  },
});

Template.testRunSummaryTabs.onCreated(function testRunSummaryTabsOnCreated() {
  const activeTab =
    FlowRouter.current().queryParams.tab ?
      FlowRouter.current().queryParams.tab
    : 'summary';
  this.activeHref = new ReactiveVar(`#${activeTab}`);
  this.previousTestRun = new ReactiveVar();
  this.nextTestRun = new ReactiveVar();
  this.userHasPermissionForApplication = new ReactiveVar(false);
  this.hasConfiguration = new ReactiveVar(false);
  this.adaptAvailable = new ReactiveVar(false);

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
              if (err) {
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
    ],
  };

  const testRunQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
      { testRunId: FlowRouter.current().params.testRunId },
    ],
  };

  Meteor.subscribe('comments');
  Meteor.subscribe('testRuns', 'testRunSummary2', 50, testRunQuery);

  Meteor.subscribe('reportPanels', query, function () {
    Meteor.setTimeout(() => {
      const selector = `.nav-tabs a[href="#${activeTab}"]`;
      $(selector).tab('show');
      $(selector).addClass('active');
    }, 1);
  });

  Meteor.call('getTestRunConfig', testRunQuery, (err, testRunConfigs) => {
    if (testRunConfigs.error) {
      log.error(JSON.stringify(testRunConfigs.error));
    } else {
      this.hasConfiguration.set(testRunConfigs.data.length > 0);
    }
  });

  this.autorun(() => {
    FlowRouter.watchPathChange();

    if (
      Meteor.subscribe(
        'dsAdaptConclusion',
        FlowRouter.current().params.testRunId,
      ).ready()
    ) {
      const dsAdaptConclusion = DsAdaptConclusion.findOne({
        testRunId: FlowRouter.current().params.testRunId,
      });

      if (dsAdaptConclusion && dsAdaptConclusion.conclusion !== 'SKIPPED') {
        this.adaptAvailable.set(true);
      }
    }

    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const previousTestRunId = getPreviousTestRun(testRun, true);

      const previousTestRun = getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        previousTestRunId,
      );

      // do not display if testRun is older than 1 week for egg version

      if (!previousTestRun) {
        this.previousTestRun.set(undefined);
      } else {
        this.previousTestRun.set(previousTestRunId);
      }

      const nextTestRunId = getNextTestRun(testRun);

      this.nextTestRun.set(nextTestRunId);
    }

    // if(FlowRouter.current().queryParams.tab){
    //   activeTab = FlowRouter.current().queryParams.tab ? FlowRouter.current().queryParams.tab : 'summary';
    //   Template.instance().activeHref.set(`#${activeTab}`);
    // }
  });
});

Template.testRunSummaryTabs.helpers({
  perfanaChatUrlConfigured() {
    return Meteor.settings.public.perfanaChatUrl !== undefined;
  },
  showDataScienceCompare() {
    const user = Meteor.user();
    if (user) {
      if (Roles.userHasRole(user._id, 'super-admin')) {
        return true;
      } else {
        return Meteor.settings.public.betaFeatureAdapt === true;
      }
    }
  },
  adaptAvailable() {
    return Template.instance().adaptAvailable.get();
  },
  pyroScopeConfigured() {
    if (Meteor.settings.public.pyroscopeUrl === undefined) {
      return false;
    } else {
      const application = Applications.findOne({
        name: FlowRouter.current().queryParams.systemUnderTest,
      });

      if (application) {
        let pyroscopeApplication = '';

        const testEnvironmentIndex = application.testEnvironments
          .map((testEnvironment) => {
            return testEnvironment.name;
          })
          .indexOf(FlowRouter.current().queryParams.testEnvironment);
        const testTypeIndex = application.testEnvironments[
          testEnvironmentIndex
        ].testTypes
          .map((testType) => {
            return testType.name;
          })
          .indexOf(FlowRouter.current().queryParams.workload);

        if (
          application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].pyroscopeApplication
        ) {
          pyroscopeApplication =
            application.testEnvironments[testEnvironmentIndex].testTypes[
              testTypeIndex
            ].pyroscopeApplication;
        } else if (
          application.testEnvironments[testEnvironmentIndex]
            .pyroscopeApplication
        ) {
          pyroscopeApplication =
            application.testEnvironments[testEnvironmentIndex]
              .pyroscopeApplication;
        } else if (application.pyroscopeApplication) {
          pyroscopeApplication = application.pyroscopeApplication;
        }

        return pyroscopeApplication !== '';
      }
    }
  },
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
  hasPreviousTestRun() {
    return Template.instance().previousTestRun.get() !== undefined;
  },
  hasNextTestRun() {
    return Template.instance().nextTestRun.get() !== undefined;
  },

  previousTestRun() {
    return Template.instance().previousTestRun.get();
  },
  nextTestRun() {
    return Template.instance().nextTestRun.get();
  },

  tabActive(href) {
    return Template.instance().activeHref.get() === href;
  },
  hasConfiguration() {
    return (
      Template.instance().hasConfiguration &&
      Template.instance().hasConfiguration.get()
    );
  },
  hasReportingTemplate() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const reportPanels = ReportPanels.find(
        {
          $and: [
            { application: testRun.application },
            { testEnvironment: testRun.testEnvironment },
            { testType: testRun.testType },
          ],
        },
        { sort: { index: 1 } },
      ).fetch();

      if (reportPanels) return reportPanels.length > 0;
    }
  },
  hasReport() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun)
      return testRun.reportAnnotations && testRun.reportAnnotations.length > 0;
  },
  testRun() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) return testRun;
  },
  multipleTestRuns() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const multipleTestRuns = TestRuns.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
        ],
      }).fetch();

      return multipleTestRuns.length > 1;
    }
  },
  hasKeyMetrics() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const benchmarks = Benchmarks.find({
        $and: [
          { application: testRun.application },
          { testType: testRun.testType },
          { testEnvironment: testRun.testEnvironment },
        ],
      });

      if (benchmarks) return benchmarks.fetch().length > 0;
    }
  },
  hasComments() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const comments = Comments.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
          { testRunId: testRun.testRunId },
        ],
      });

      if (comments) return comments.fetch().length > 0;
    }
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
  testRunInvalid() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun && _.has(testRun, 'valid')) {
      return testRun.valid === false;
    } else {
      return false;
    }
  },
  reasonsNotValid() {
    let reasonsNotValid = '';
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun && testRun.reasonsNotValid) {
      testRun.reasonsNotValid.forEach((reason, index) => {
        if (index > 0) {
          reasonsNotValid += `<br>${reason} `;
        } else {
          reasonsNotValid += `${reason} `;
        }
      });
      return new Spacebars.SafeString(reasonsNotValid);
    }
  },
  unreadCommentsCount() {
    const user = Meteor.user();

    if (user) {
      const testRun = getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        FlowRouter.current().params.testRunId,
      );

      if (testRun) {
        const comments = Comments.find({
          $and: [
            { application: testRun.application },
            { testEnvironment: testRun.testEnvironment },
            { testType: testRun.testType },
            { testRunId: testRun.testRunId },
            {
              viewedBy: { $ne: user._id },
            },
            {
              $or: [
                { createdBy: { $ne: user._id } },
                { replies: { $exists: true } },
              ],
            },
          ],
        });

        if (comments) return comments.fetch().length;
      }
    }
  },
  hasUnreadComments() {
    const user = Meteor.user();

    if (user) {
      const testRun = getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        FlowRouter.current().params.testRunId,
      );

      if (testRun) {
        const comments = Comments.find({
          $and: [
            { application: testRun.application },
            { testEnvironment: testRun.testEnvironment },
            { testType: testRun.testType },
            { testRunId: testRun.testRunId },
            {
              viewedBy: { $ne: user._id },
            },
            {
              $or: [
                { createdBy: { $ne: user._id } },
                { replies: { $exists: true } },
              ],
            },
          ],
        });

        if (comments) return comments.fetch().length > 0;
      }
    }
  },
  tracingService() {
    if (Meteor.settings.public.tracingUrl === undefined) {
      return false;
    } else {
      const application = Applications.findOne({
        name: FlowRouter.current().queryParams.systemUnderTest,
      });

      if (application) {
        let tracingService = '';
        let testTypeIndex = -1;

        const testEnvironmentIndex = application.testEnvironments
          .map((testEnvironment) => {
            return testEnvironment.name;
          })
          .indexOf(FlowRouter.current().queryParams.testEnvironment);

        if (testEnvironmentIndex !== -1) {
          testTypeIndex = application.testEnvironments[
            testEnvironmentIndex
          ].testTypes
            .map((testType) => {
              return testType.name;
            })
            .indexOf(FlowRouter.current().queryParams.workload);
        }

        if (
          testEnvironmentIndex !== -1 &&
          testTypeIndex !== -1 &&
          application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].tracingService
        ) {
          tracingService =
            application.testEnvironments[testEnvironmentIndex].testTypes[
              testTypeIndex
            ].tracingService;
        } else if (
          testEnvironmentIndex !== -1 &&
          application.testEnvironments[testEnvironmentIndex].tracingService
        ) {
          tracingService =
            application.testEnvironments[testEnvironmentIndex].tracingService;
        } else if (application.tracingService) {
          tracingService = application.tracingService;
        }

        return tracingService !== '';
      }
    }
  },
  dynatraceConfigured() {
    const application = Applications.findOne({
      name: FlowRouter.current().queryParams.systemUnderTest,
    });

    if (application) {
      let dynatraceEntities = [];

      const testEnvironmentIndex = application.testEnvironments
        .map((testEnvironment) => {
          return testEnvironment.name;
        })
        .indexOf(FlowRouter.current().queryParams.testEnvironment);
      const testTypeIndex = application.testEnvironments[
        testEnvironmentIndex
      ].testTypes
        .map((testType) => {
          return testType.name;
        })
        .indexOf(FlowRouter.current().queryParams.workload);

      if (
        application.testEnvironments[testEnvironmentIndex].testTypes[
          testTypeIndex
        ].dynatraceEntities &&
        application.testEnvironments[testEnvironmentIndex].testTypes[
          testTypeIndex
        ].dynatraceEntities.length > 0
      ) {
        dynatraceEntities =
          application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].dynatraceEntities;
      } else if (
        application.testEnvironments[testEnvironmentIndex].dynatraceEntities &&
        application.testEnvironments[testEnvironmentIndex].dynatraceEntities
          .length > 0
      ) {
        dynatraceEntities =
          application.testEnvironments[testEnvironmentIndex].dynatraceEntities;
      } else if (
        application.dynatraceEntities &&
        application.dynatraceEntities.length > 0
      ) {
        dynatraceEntities = application.dynatraceEntities;
      }

      return dynatraceEntities.length > 0;
    }
  },
  dynatraceInLicense() {
    return true; // Always allow Dynatrace integration
  },
  markdown(text) {
    if (!text) return '';
    return marked(text);
  },
});

Template.testRunSummaryTabs.events({
  'mouseenter i#invalid-button-info'(event) {
    event.preventDefault();

    tippy('[data-tippy-content]', {
      theme: 'light-border',
    });
  },
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
  'click div .mark-as-valid'() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    swal({
      title: 'Mark test run as valid',
      text: `Mark test run ${testRun.testRunId} as valid? This may lead to failed checks if this test run is used as baseline`,
      icon: 'warning',
      buttons: ['Cancel', 'OK'],
      dangerMode: true,
    }).then((willDelete) => {
      //bound to the current `this`
      if (willDelete) {
        Meteor.call('markTestRunAsValid', testRun._id, () => {});
      } else {
        swal.close();
      }
    });
  },

  'click div .re-evaluate-benchmarks'() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      log.debug('Re-evaluating benchmarks for test run: ' + testRun.testRunId);

      Meteor.call(
        'batchEvaluateSelectedTestRuns',
        [testRun._id],
        'RE_EVALUATE',
        (err) => {
          if (err) {
            window.toastr.clear();
            window.toastr['error'](err.reason, 'Error');
          } else {
            window.toastr.clear();
            window.toastr['success'](
              'Done!',
              'Test run re-evaluation started, please wait for the process to complete',
            );
          }
        },
      );
    }

    return false;
  },
  'click div .refresh-data'() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      log.debug('Refreshing data for test run: ' + testRun.testRunId);

      Meteor.call(
        'batchEvaluateSelectedTestRuns',
        [testRun._id],
        'REFRESH',
        (err) => {
          if (err) {
            window.toastr.clear();
            window.toastr['error'](err.reason, 'Error');
          } else {
            window.toastr.clear();
            window.toastr['success'](
              'Done!',
              'Refresh data and re-evaluate started, please wait for the process to complete',
            );
          }
        },
      );
    }

    return false;
  },
  'click .nav-tabs.test-run-summary  a'(event, template) {
    /* reset comments session variables */
    Session.set('dashboardUid', undefined);
    Session.set('dashboardLabel', undefined);
    Session.set('panelId', undefined);
    /* reset compare results session variables */
    Session.set('baselineTestRunId', undefined);
    Session.set('compareResultLabel', undefined);
    /* reset dashboardFilter*/
    Session.set('dashboardFilter', undefined);

    event.preventDefault();
    // $(this).tab('show');
    template.activeHref.set(event.currentTarget.getAttribute('href'));

    FlowRouter.withReplaceState(function () {
      FlowRouter.setQueryParams({
        tab: event.currentTarget.getAttribute('href').substring(1),
      });
    });
  },
  'click #previous-test-run'(event) {
    // reset trends session variables
    // Session.set('evaluateType', undefined);
    // Session.set('panelTitle', undefined);
    // Session.set('dashboardLabel', undefined);
    // Session.set('period', undefined);

    const params = { testRunId: event.currentTarget.getAttribute('testRunId') };
    const queryParams = {
      systemUnderTest: FlowRouter.current().queryParams.systemUnderTest,
      workload: FlowRouter.current().queryParams.workload,
      testEnvironment: FlowRouter.current().queryParams.testEnvironment,
    };
    FlowRouter.go('testRunSummary', params, queryParams);
  },
  'click #next-test-run'(event) {
    // reset trends session variables
    // Session.set('evaluateType', undefined);
    // Session.set('panelTitle', undefined);
    // Session.set('dashboardLabel', undefined);
    // Session.set('period', undefined);

    const params = { testRunId: event.currentTarget.getAttribute('testRunId') };
    const queryParams = {
      systemUnderTest: FlowRouter.current().queryParams.systemUnderTest,
      workload: FlowRouter.current().queryParams.workload,
      testEnvironment: FlowRouter.current().queryParams.testEnvironment,
    };
    FlowRouter.go('testRunSummary', params, queryParams);
  },
});

Template.manageTestRunPage.onCreated(function manageTestRunPageOnCreated() {
  this.testRun = new ReactiveVar();

  this.autorun(() => {
    FlowRouter.watchPathChange();
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    this.testRun.set(testRun);
  });
});
Template.manageTestRunPage.helpers({
  isAdmin() {
    const user = Meteor.user();
    if (user)
      return (
        Roles.userHasRole(user._id, 'admin') ||
        Roles.userHasRole(user._id, 'super-admin')
      );
  },
  applicationHasGrafanaDashboards() {
    const applicationDashboards = ApplicationDashboards.find({
      $and: [
        { application: FlowRouter.current().queryParams.systemUnderTest },
        { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
      ],
    }).fetch();

    if (applicationDashboards) return applicationDashboards.length > 0;
  },
  testRunHasSnapshots() {
    const testRun = Template.instance().testRun.get();

    if (testRun) {
      const snapshots = Snapshots.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
          { testRunId: testRun.testRunId },
        ],
      });

      if (snapshots) return snapshots.fetch().length > 0;
    }
  },
  testRunHasReport() {
    const testRun = Template.instance().testRun.get();

    if (testRun)
      return testRun.reportAnnotations && testRun.reportAnnotations.length > 0;
  },
  testRun() {
    return Template.instance().testRun.get();
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

Template.adapt.onCreated(function adaptOnCreated() {
  this.testRun = new ReactiveVar();
  const testRunQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
    ],
  };
  this.autorun(() => {
    Meteor.subscribe('applications');
    if (
      Meteor.subscribe('testRuns', 'testRunSummary2', 50, testRunQuery).ready()
    ) {
      const testRun = getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        FlowRouter.current().params.testRunId,
      );
      if (testRun) this.testRun.set(testRun);
    }
  });
});

Template.adaptTLDR.onCreated(function adaptTLDROnCreated() {
  this.dsAdaptConclusion = new ReactiveVar();

  this.autorun(() => {
    if (
      Meteor.subscribe(
        'dsAdaptConclusion',
        FlowRouter.current().params.testRunId,
      ).ready()
    ) {
      const dsAdaptConclusion = DsAdaptConclusion.findOne({
        testRunId: FlowRouter.current().params.testRunId,
      });

      if (dsAdaptConclusion) {
        this.dsAdaptConclusion.set(dsAdaptConclusion);
      }
    }
  });
});

Template.adaptTLDR.helpers({
  perfanaChatUrl() {
    const previousTestRunId = getPreviousTestRun(
      getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        FlowRouter.current().params.testRunId,
      ),
    );

    const theme =
      Meteor.user().profile.theme ? Meteor.user().profile.theme : 'light';

    if (previousTestRunId) {
      return (
        Meteor.settings.public.perfanaChatUrl +
        '?testRunId=' +
        FlowRouter.current().params.testRunId +
        '&previousTestRunId=' +
        previousTestRunId +
        '&theme=' +
        theme
      );
    } else {
      return (
        Meteor.settings.public.perfanaChatUrl +
        '?testRunId=' +
        FlowRouter.current().params.testRunId +
        '&theme=' +
        theme
      );
    }
  },
  testRunAddedToBaseline() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    const dsAdaptConclusion = Template.instance().dsAdaptConclusion.get();
    if (testRun && dsAdaptConclusion !== undefined) {
      const meetsRequirement =
        testRun.consolidatedResult &&
        testRun.consolidatedResult.meetsRequirement === true;
      return (
        meetsRequirement &&
        dsAdaptConclusion.regressions.length > 0 &&
        testRun.adapt.differencesAccepted === 'TBD'
      );
    }
  },
  trackedRegressionDetected() {
    return (
      Template.instance().dsAdaptConclusion.get() &&
      Template.instance().dsAdaptConclusion.get().trackedRegressions.length > 0
    );
  },
  regressionDetected() {
    return (
      (this.testRun &&
        this.testRun.consolidatedResult &&
        this.testRun.consolidatedResult.adaptTestRunOK === false) ||
      (Template.instance().dsAdaptConclusion.get() &&
        (Template.instance().dsAdaptConclusion.get().regressions.length > 0 ||
          Template.instance().dsAdaptConclusion.get().trackedRegressions
            .length > 0))
    );
  },
  regressionsAccepted() {
    return (
      this.testRun.adapt &&
      this.testRun.adapt.differencesAccepted === 'ACCEPTED'
    );
  },
  regressionsConfirmed() {
    return (
      this.testRun.adapt && this.testRun.adapt.differencesAccepted === 'DENIED'
    );
  },
  regressionDetectedTestRun() {
    return (
      Template.instance().dsAdaptConclusion.get() &&
      Template.instance().dsAdaptConclusion.get().regressions.length > 0
    );
  },
  adaptReady() {
    return (
      this.testRun &&
      this.testRun.status &&
      (this.testRun.status.evaluatingAdapt === 'COMPLETE' ||
        this.testRun.status.evaluatingAdapt === 'ERROR' ||
        this.testRun.status.evaluatingAdapt === 'NO_BASELINES_FOUND')
    );
  },
  adaptInvalid() {
    return (
      this.testRun &&
      this.testRun.status &&
      this.testRun.status.evaluatingAdapt === 'NO_BASELINES_FOUND'
    );
  },
  markdown(text) {
    if (!text) return '';
    return marked(text);
  },
});

Template.adaptTLDR.events({
  'click .go-to-adapt-tab'(event) {
    event.preventDefault();
    const params = { testRunId: FlowRouter.current().params.testRunId };
    const queryParams = {
      systemUnderTest: FlowRouter.current().queryParams.systemUnderTest,
      workload: FlowRouter.current().queryParams.workload,
      testEnvironment: FlowRouter.current().queryParams.testEnvironment,
      tab: 'adapt',
    };

    BlazeLayout.reset();
    FlowRouter.go('testRunSummary', params, queryParams);
  },
  'click #regression-info'(event) {
    event.preventDefault();
    const params = { testRunId: FlowRouter.current().params.testRunId };
    const queryParams = {
      systemUnderTest: FlowRouter.current().queryParams.systemUnderTest,
      workload: FlowRouter.current().queryParams.workload,
      testEnvironment: FlowRouter.current().queryParams.testEnvironment,
      tab: 'adapt',
    };

    BlazeLayout.reset();
    FlowRouter.go('testRunSummary', params, queryParams);
  },
  'click .go-to-unresolved-regression'(event) {
    event.preventDefault();

    const queryParams = {
      systemUnderTest: FlowRouter.current().queryParams.systemUnderTest,
      workload: FlowRouter.current().queryParams.workload,
      testEnvironment: FlowRouter.current().queryParams.testEnvironment,
      tab: 'unresolved-regression',
    };

    BlazeLayout.reset();
    FlowRouter.go('testRuns', null, queryParams);
  },
  'click #exclude-test-run-from-baseline'(event) {
    event.preventDefault();

    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    if (testRun) {
      Meteor.call('resolveRegression', testRun, 'DENIED', true, (error) => {
        if (error) {
          window.toastr.clear();
          window.toastr['error'](error, 'Error');
        } else {
          window.toastr.clear();
          window.toastr['success'](
            'Test run excluded from control group ',
            'Success',
          );
        }
      });
    }
  },
  'mouseenter i#regression-info'(event) {
    event.preventDefault();

    tippy('[data-tippy-content]', {
      theme: 'light-border',
    });
  },
});
Template.testRunAI.helpers({
  perfanaChatUrl() {
    const previousTestRunId = getPreviousTestRun(
      getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        FlowRouter.current().params.testRunId,
      ),
    );

    const theme =
      Meteor.user().profile.theme ? Meteor.user().profile.theme : 'light';

    if (previousTestRunId) {
      return (
        Meteor.settings.public.perfanaChatUrl +
        '?testRunId=' +
        FlowRouter.current().params.testRunId +
        '&previousTestRunId=' +
        previousTestRunId +
        '&theme=' +
        theme
      );
    } else {
      return (
        Meteor.settings.public.perfanaChatUrl +
        '?testRunId=' +
        FlowRouter.current().params.testRunId +
        '&theme=' +
        theme
      );
    }
  },
});
Template.adapt.helpers({
  previousTestRunId() {
    const testRun =
      Template.instance().testRun && Template.instance().testRun.get();
    if (testRun) {
      return getPreviousTestRun(testRun, true);
    }
  },
  baselineTestRunId() {
    const testRun =
      Template.instance().testRun && Template.instance().testRun.get();
    if (testRun) {
      const baselineTestRunId = getFixedBaselineTestRun(testRun);
      if (baselineTestRunId) {
        Meteor.setTimeout(() => {
          return baselineTestRunId;
        }, 100);
      }
    }
  },

  hasPreviousTestRun() {
    if (
      Template.instance().testRun &&
      Template.instance().testRun.get() !== undefined
    ) {
      const testRun = Template.instance().testRun.get();
      if (testRun) {
        const previousTestRunId = getPreviousTestRun(testRun, true);
        const baselineTestRunId = getFixedBaselineTestRun(testRun);
        if (baselineTestRunId !== undefined) {
          return (
            previousTestRunId !== undefined &&
            previousTestRunId !== baselineTestRunId
          );
        } else {
          return previousTestRunId !== undefined;
        }
      }
    }
  },
  hasBaselineTestRun() {
    const application = Applications.findOne({
      name: FlowRouter.current().queryParams.systemUnderTest,
    });
    let testTypeIndex;
    if (application) {
      const testEnvironmentIndex = application.testEnvironments
        .map((testEnvironment) => {
          return testEnvironment.name;
        })
        .indexOf(FlowRouter.current().queryParams.testEnvironment);

      if (testEnvironmentIndex !== -1) {
        testTypeIndex = application.testEnvironments[
          testEnvironmentIndex
        ].testTypes
          .map((testType) => {
            return testType.name;
          })
          .indexOf(FlowRouter.current().queryParams.workload);
      }

      return (
        application.testEnvironments[testEnvironmentIndex].testTypes[
          testTypeIndex
        ].baselineTestRun !== undefined
      );
    }
  },

  isNotBaselineTestRun() {
    const application = Applications.findOne({
      name: FlowRouter.current().queryParams.systemUnderTest,
    });
    let testTypeIndex;
    if (application) {
      const testEnvironmentIndex = application.testEnvironments
        .map((testEnvironment) => {
          return testEnvironment.name;
        })
        .indexOf(FlowRouter.current().queryParams.testEnvironment);

      if (testEnvironmentIndex !== -1) {
        testTypeIndex = application.testEnvironments[
          testEnvironmentIndex
        ].testTypes
          .map((testType) => {
            return testType.name;
          })
          .indexOf(FlowRouter.current().queryParams.workload);
      }

      return (
        application.testEnvironments[testEnvironmentIndex].testTypes[
          testTypeIndex
        ].baselineTestRun !== FlowRouter.current().params.testRunId
      );
    }
  },

  testRun() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    if (testRun) return testRun;
  },
});
