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

import { Session } from 'meteor/session';
import { dynamicSort, getTestRun, slugify } from '../../../helpers/utils';
import { Meteor } from 'meteor/meteor';
import { $ } from 'meteor/jquery';
import { log } from '/both/logger';

import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';
import { Benchmarks } from '../../../collections/benchmarks';
import { DeepLinks } from '../../../collections/deeplinks';
import { ApplicationDashboards } from '../../../collections/applicationDashboards';

import './runningTestDashboards.html';
import { Applications } from '../../../collections/applications';
import _ from 'lodash';

Template.runningTestDashboards.onCreated(
  function runningTestDashboardsOnCreated() {
    this.applicationDashboards = new ReactiveVar();
    this.showCarousel = new ReactiveVar(false);
    this.activeDashboardHref = new ReactiveVar('all');
    Session.set('dashboardTags', 'All');

    const testRunQuery = { $and: [] };

    if (Session.get('application'))
      testRunQuery.$and.push({ application: Session.get('application') });
    if (Session.get('testEnvironment'))
      testRunQuery.$and.push({
        testEnvironment: Session.get('testEnvironment'),
      });
    if (Session.get('testType'))
      testRunQuery.$and.push({ testType: Session.get('testType') });

    Meteor.subscribe(
      'testRuns',
      'runningTestDashboards',
      50,
      testRunQuery,
      Session.get('team'),
    );
    Meteor.subscribe('benchmarks', testRunQuery);

    const benchmarks = Benchmarks.find(testRunQuery).fetch();

    this.activeHref =
      benchmarks.length > 0 ?
        new ReactiveVar('#key-metrics')
      : new ReactiveVar('#dashboards');

    this.hasConfiguration = new ReactiveVar(false);

    Meteor.call(
      'getTestRunConfig',
      _.extend(testRunQuery, {
        testRunId: FlowRouter.current().params.testRunId,
      }),
      (err, testRunConfigs) => {
        if (testRunConfigs.error) {
          log.error(JSON.stringify(testRunConfigs.error));
        } else {
          this.hasConfiguration.set(testRunConfigs.data.length > 0);
        }
      },
    );

    this.autorun(() => {
      const applicationDashboardSubscriptionQuery = {
        $and: [
          { application: Session.get('application') },
          { testEnvironment: Session.get('testEnvironment') },
        ],
      };

      // eslint-disable-next-line prefer-const
      let applicationDashboardQuery = { $and: [] };

      if (Session.get('application'))
        applicationDashboardQuery.$and.push({
          application: Session.get('application'),
        });
      if (Session.get('testEnvironment'))
        applicationDashboardQuery.$and.push({
          testEnvironment: Session.get('testEnvironment'),
        });
      if (
        Session.get('dashboardTags') &&
        Session.get('dashboardTags') !== 'All'
      ) {
        const dashboardTagsRegex = '^' + Session.get('dashboardTags') + '$';
        applicationDashboardQuery.$and.push({
          tags: { $regex: dashboardTagsRegex, $options: 'i' },
        });
      }

      if (applicationDashboardQuery.$and.length > 0) {
        if (
          Meteor.subscribe(
            'applicationDashboards',
            applicationDashboardSubscriptionQuery,
          ).ready()
        ) {
          const applicationDashboards = ApplicationDashboards.find(
            applicationDashboardQuery,
          ).fetch();
          if (Session.get('dashboardFilter')) {
            const filteredDashboards = applicationDashboards.filter(
              (applicationDashboard) => {
                const dashboardRegExp = new RegExp(
                  Session.get('dashboardFilter'),
                  'ig',
                );

                return dashboardRegExp.test(
                  applicationDashboard.dashboardLabel,
                );
              },
            );

            this.applicationDashboards.set(filteredDashboards);
          } else {
            this.applicationDashboards.set(applicationDashboards);
          }
        }
      }

      const testRun = getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        FlowRouter.current().params.testRunId,
      );
      if (testRun && testRun.completed === true) {
        const queryParams = {};

        if (Session.get('team')) queryParams['team'] = Session.get('team');
        if (Session.get('application'))
          queryParams['systemUnderTest'] = Session.get('application');
        if (Session.get('testEnvironment'))
          queryParams['testEnvironment'] = Session.get('testEnvironment');
        if (Session.get('testType'))
          queryParams['workload'] = Session.get('testType');

        FlowRouter.go('testRuns', null, queryParams);
      }
    });
  },
);

Template.runningTestDashboards.onRendered(function () {
  this.autorun(() => {
    Session.get('dashboardTags'); // trigger autorun

    Meteor.setTimeout(() => {
      const dashboards = this.applicationDashboards.get();
      if (dashboards && dashboards.length === 1) {
        const dashboardLabelSlug = slugify(dashboards[0].dashboardLabel);
        const selector = `#dashboard-accordion-${dashboardLabelSlug}-${dashboards[0].dashboardUid}.panel-collapse.collapse`;

        $(selector).collapse('show');
      }
    }, 100);
  });
});

Template.runningTestDashboards.helpers({
  showCarousel() {
    return Template.instance().showCarousel.get();
  },
  tabActive(href) {
    return Template.instance().activeHref.get() === href;
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
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
        ],
      }).fetch();

      return benchmarks.length > 0;
    }
  },
  hasApplicationDashboards() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const applicationDashboards = ApplicationDashboards.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
        ],
      }).fetch();

      return applicationDashboards.length > 0;
    }
  },
  applicationDashboardTagTabActive(href) {
    return Template.instance().activeDashboardHref.get() === href.toString();
  },

  applicationDashboardsTags() {
    const applicationDashboards = ApplicationDashboards.find({
      $and: [
        { application: Session.get('application') },
        { testEnvironment: Session.get('testEnvironment') },
      ],
    }).fetch();

    if (applicationDashboards) {
      const tags = [];

      applicationDashboards.forEach((applicationDashboard) => {
        applicationDashboard.tags.forEach((tag) => {
          if (tags.indexOf(tag.charAt(0).toUpperCase() + tag.slice(1)) === -1)
            tags.push(tag.charAt(0).toUpperCase() + tag.slice(1));
        });
      });

      return tags.filter((tag) => {
        const perfanaRegExp = new RegExp('.*perfana.*', 'ig');
        return !perfanaRegExp.test(tag) && tag.indexOf('$') === -1;
      });
    }
  },
  applicationDashboards() {
    const applicationDashboards =
      Template.instance().applicationDashboards.get();
    if (applicationDashboards) {
      return applicationDashboards.sort(dynamicSort('dashboardLabel'));
    }
  },
  dynatraceInLicense() {
    return true;
  },
  hasConfiguration() {
    return (
      Template.instance().hasConfiguration &&
      Template.instance().hasConfiguration.get()
    );
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
});

Template.runningTestDashboards.events({
  'click .clear-filter'(event) {
    event.preventDefault();
    Session.set('dashboardFilter', undefined);
  },

  'keyup #dashboard-filter'(event) {
    // template.requestNameFilter.set(event.target.value)
    Session.set('dashboardFilter', event.target.value);
  },
  'click .nav-tabs.application-dashboard-tags  a'(event, template) {
    event.preventDefault();
    // $(this).tab('show');
    template.activeDashboardHref.set(
      event.currentTarget.getAttribute('href').replace('#', ''),
    );

    template.applicationDashboards.set([]);

    Session.set('dashboardTags', event.currentTarget.text);
  },
  'change #showCarousel'() {
    if (Template.instance().showCarousel.get() === false) {
      Template.instance().showCarousel.set(true);
    } else {
      Template.instance().showCarousel.set(false);
    }
  },
  'click .nav-tabs.running-test  a'(event, template) {
    event.preventDefault();
    // $(this).tab('show');
    template.activeHref.set(event.currentTarget.getAttribute('href'));
  },
  'click #interval-10'(event) {
    $('.btn-group > .btn').removeClass('active');
    event.currentTarget.classList.toggle('active');
    Session.set('carouselInterval', 10000);
  },
  'click #interval-15'(event) {
    $('.btn-group > .btn').removeClass('active');
    event.currentTarget.classList.toggle('active');
    Session.set('carouselInterval', 15000);
  },
  'click #interval-20'(event) {
    $('.btn-group > .btn').removeClass('active');
    event.currentTarget.classList.toggle('active');
    Session.set('carouselInterval', 20000);
  },
  'click #interval-30'(event) {
    $('.btn-group > .btn').removeClass('active');
    event.currentTarget.classList.toggle('active');
    Session.set('carouselInterval', 30000);
  },
});

Template.runningTestDashboardsAccordion.onCreated(
  function runningTestDashboardsAccordionOnCreated() {
    this.testRun = new ReactiveVar();
    this.metricHeaderCollapsed = new ReactiveVar(true);

    const query = { $and: [] };

    if (Session.get('application'))
      query.$and.push({ application: Session.get('application') });
    if (Session.get('testEnvironment'))
      query.$and.push({ testEnvironment: Session.get('testEnvironment') });

    Meteor.subscribe(
      'testRuns',
      'runningTestDashboards2',
      50,
      query,
      Session.get('team'),
    );

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
  },
);

Template.runningTestDashboardsAccordion.helpers({
  metricHeaderCollapsed() {
    return Template.instance().metricHeaderCollapsed.get();
  },
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
});

Template.runningTestDashboardsAccordion.events({
  'shown.bs.collapse .metric-collapse'(event, template) {
    template.metricHeaderCollapsed.set(false);
  },
  'hide.bs.collapse .metric-collapse'(event, template) {
    template.metricHeaderCollapsed.set(true);
  },
  'click .fa-external-link': function (event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    Meteor.call(
      'renderGrafanaUrl',
      this,
      testRun,
      true,
      false,
      (err, grafanaUrl) => {
        if (grafanaUrl.error) {
          log.error(JSON.stringify(grafanaUrl.error));
        } else {
          window.open(grafanaUrl.data, '_blank');
        }
      },
    );
  },
  'click #open-key-metrics-modal'(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const keyMetricModalParams = {
      dashboardUid: this.dashboardUid,
      dashboardId: this.dashboardId,
      dashboardLabel: this.dashboardLabel,
      grafana: this.grafana,
      snapshotUrl: this.snapshotUrl,
      application: FlowRouter.current().queryParams.systemUnderTest,
      testEnvironment: FlowRouter.current().queryParams.testEnvironment,
      testType: FlowRouter.current().queryParams.workload,
    };

    Modal.show('addKeyMetricsModal', keyMetricModalParams);
  },
});

Template.runningTestDashboardIframe.onCreated(function () {
  this.grafanaUrl = new ReactiveVar();
  this.windowHeight = new ReactiveVar();

  this.windowHeight.set(0.9 * $(window).height());

  const testRun = getTestRun(
    FlowRouter.current().queryParams.systemUnderTest,
    FlowRouter.current().params.testRunId,
  );

  if (testRun) {
    Meteor.call(
      'renderGrafanaUrl',
      this.data,
      testRun,
      true,
      true,
      (err, grafanaUrl) => {
        if (grafanaUrl.error) {
          log.error(JSON.stringify(grafanaUrl.error));
        } else {
          this.grafanaUrl.set(grafanaUrl.data);
        }
      },
    );
  }
});

Template.runningTestDashboardIframe.helpers({
  grafanaUrl() {
    return Template.instance().grafanaUrl.get();
  },
  windowHeight() {
    return Template.instance().windowHeight.get();
  },
});
//
//
// Template.runningTestDashboardsRowActions.events({
//   'click .fa-external-link': function (event) {
//     event.preventDefault()
//     event.stopImmediatePropagation()
//
//     let testRun = getTestRun(FlowRouter.current().queryParams.systemUnderTest, FlowRouter.current().params.testRunId);
//
//     Meteor.call('renderGrafanaUrl', this, testRun, true, false, (err, grafanaUrl) => {
//       if(grafanaUrl.error){
//         log.error(JSON.stringify(grafanaUrl.error))
//       } else {
//         window.open(grafanaUrl.data, '_blank')
//       }
//
//     })
//
//   },
//   'click #open-comment-box'(event, template) {
//     event.preventDefault();
//
//     let graphModalParams = {
//       dashboardUid: this.dashboardUid,
//       dashboardLabel: this.dashboardLabel,
//       grafana: this.grafana,
//       snapshotUrl: this.snapshotUrl
//     }
//
//     Modal.show('commentsModal', graphModalParams);
//   },
//   'click #open-key-metrics-modal'(event, template) {
//     event.preventDefault();
//
//     let keyMetricModalParams = {
//       dashboardUid: this.dashboardUid,
//       dashboardId: this.dashboardId,
//       dashboardLabel: this.dashboardLabel,
//       grafana: this.grafana,
//       snapshotUrl: this.snapshotUrl,
//       application: FlowRouter.current().queryParams.systemUnderTest,
//       testEnvironment: FlowRouter.current().queryParams.testEnvironment,
//       testType: FlowRouter.current().queryParams.workload,
//     }
//
//
//     Modal.show('addKeyMetricsModal', keyMetricModalParams);
//   },
// })
