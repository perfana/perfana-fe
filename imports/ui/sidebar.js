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
import { ReactiveVar } from 'meteor/reactive-var';
import { Applications } from '../collections/applications';
import { Session } from 'meteor/session';
import './sidebar.html';
import './sidebar.less';
import './sidebar.js';
import { getTestRun } from '../helpers/utils';
import { Benchmarks } from '../collections/benchmarks';
import { log } from '/both/logger';

Template.registerHelper('showFilters', () => {
  return FlowRouter.current().path !== '/grafana';
});

Template.sidebar.onCreated(function sidebarOnCreated() {
  this.userHasPermissionForApplication = new ReactiveVar(false);
  this.dynatraceConfigured = new ReactiveVar(false);

  // Check if Dynatrace is configured
  Meteor.call('isDynatraceConfigured', (err, result) => {
    if (err) {
      log.error('Error checking Dynatrace configuration:', JSON.stringify(err));
    } else {
      this.dynatraceConfigured.set(result);
    }
  });

  const testRun = getTestRun(
    FlowRouter.current().queryParams.systemUnderTest,
    FlowRouter.current().params.testRunId,
  );

  if (testRun) {
    Meteor.call(
      'userHasPermissionForApplication',
      testRun.application,
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

Template.sidebar.helpers({
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
  isAdmin() {
    const user = Meteor.user();
    if (user)
      return (
        Roles.userHasRole(user._id, 'admin') ||
        Roles.userHasRole(user._id, 'super-admin')
      );
  },
  testRunView: function () {
    return (
      FlowRouter.getRouteName() === 'testRuns' ||
      FlowRouter.getRouteName() === 'testRunSummary' ||
      FlowRouter.getRouteName() === 'testRunReport' ||
      FlowRouter.getRouteName() === 'grafanaDashboards' ||
      FlowRouter.getRouteName() === 'dynatrace' ||
      FlowRouter.getRouteName() === 'reportingTemplate' ||
      FlowRouter.getRouteName() === 'keyMetrics' ||
      FlowRouter.getRouteName() === 'runningTestCarousel' ||
      FlowRouter.getRouteName() === 'abortAlertTags' ||
      FlowRouter.getRouteName() === 'systemUnderTest' ||
      FlowRouter.getRouteName() === 'applicationNotificationsChannels'
    );
  },
  grafanaPath: function () {
    return FlowRouter.current().route.name === 'grafana';
  },
  applicationsPath: function () {
    return FlowRouter.current().route.name !== 'grafana';
  },
  showTestRunFilter: function () {
    // return Template.instance().currentRouteName.get()  === 'testRuns'
    return (
      FlowRouter.getRouteName() === 'testRuns' ||
      FlowRouter.getRouteName() === 'testRunSummary' ||
      FlowRouter.getRouteName() === 'runningTestCarousel'
    );
  },
  applicationSelected: function () {
    return Session.get('application') !== undefined;
  },
  teamSelected: function () {
    return Session.get('team') !== undefined;
  },
  teamOrApplicationSelected: function () {
    return (
      (Session.get('team') && Session.get('team') !== null) ||
      (Session.get('application') && Session.get('application') !== null)
    );
  },
  systemUnderTestSelected: function () {
    return Session.get('application') !== undefined;
  },
  testEnvironmentSelected: function () {
    return Session.get('testEnvironment') !== undefined;
  },
  testTypeSelected: function () {
    return (
      Session.get('testType') !== undefined &&
      Session.get('testEnvironment') !== undefined
    );
  },
  systemUnderTest() {
    if (Session.get('application') !== null) return Session.get('application');
  },
  team() {
    if (Session.get('team') !== null) return Session.get('team');
  },
  environments() {
    const application = Applications.findOne({
      name: Session.get('application'),
    });
    if (application) return application.testEnvironments;
  },
  environmentActive() {
    return this.name === Session.get('testEnvironment');
  },
  workloads() {
    const application = Applications.findOne({
      name: Session.get('application'),
    });
    if (application) {
      const selectedTestEnvironment = application.testEnvironments
        .map((environment) => {
          return environment.name;
        })
        .indexOf(Session.get('testEnvironment'));
      return application.testEnvironments[selectedTestEnvironment].testTypes;
    }
  },
  workloadActive() {
    return this.name === Session.get('testType');
  },
  invalidConfiguration() {
    const invalidBenchmarks = Benchmarks.find({
      $and: [
        { application: Session.get('application') },
        { testEnvironment: Session.get('testEnvironment') },
        { testType: Session.get('testType') },
        { valid: false },
      ],
    }).fetch();

    return invalidBenchmarks.length > 0;
  },
  dynatraceConfigured() {
    return Template.instance().dynatraceConfigured && Template.instance().dynatraceConfigured.get();
  },
});

Template.sidebar.events({
  // 'click #clearFilters' () {
  //     ReactiveTable.clearFilters(['testTypeFilter', 'testEnvironmentFilter', 'recentIntervalFilter']);
  //
  //     Session.set('testType', null);
  //     Session.set('testEnvironment', null);
  // },
  // 'click .env-link' () {
  //
  //     Session.set('testEnvironment', this.name);
  //     Session.set('testType', null);
  //
  //
  // },
  // 'click .workload-link' () {
  //
  //     Session.set('testType', this.name);
  // },
  'click #open-grafana-dashboards'() {
    const queryParams = {};
    queryParams['systemUnderTest'] = Session.get('application');
    queryParams['testEnvironment'] = Session.get('testEnvironment');
    FlowRouter.go('grafanaDashboards', null, queryParams);
  },
  'click #open-grafana-configuration'() {
    FlowRouter.go('grafana', null, null);
  },
  'click #open-autoconfig-settings'() {
    FlowRouter.go('autoConfigSettings', null, null);
  },
  'click #open-team-settings'() {
    FlowRouter.go('teams', null, null);
  },
  'click #open-user-settings'() {
    FlowRouter.go('users', null, null);
  },
  'click #results-per-profile'() {
    FlowRouter.go('profileResults', null, null);
  },
  'click #open-key-metrics'() {
    const queryParams = {};
    queryParams['systemUnderTest'] = Session.get('application');
    queryParams['testEnvironment'] = Session.get('testEnvironment');
    queryParams['workload'] = Session.get('testType');
    FlowRouter.go('keyMetrics', null, queryParams);
  },
  'click #open-reporting-template'() {
    const queryParams = {};
    queryParams['systemUnderTest'] = Session.get('application');
    queryParams['testEnvironment'] = Session.get('testEnvironment');
    queryParams['workload'] = Session.get('testType');
    FlowRouter.go('reportingTemplate', null, queryParams);
  },
  'click #open-abort-alerts'() {
    const queryParams = {};
    queryParams['systemUnderTest'] = Session.get('application');
    queryParams['testEnvironment'] = Session.get('testEnvironment');
    queryParams['workload'] = Session.get('testType');
    FlowRouter.go('abortAlertTags', null, queryParams);
  },
  'click #open-deep-links'() {
    const queryParams = {};
    queryParams['systemUnderTest'] = Session.get('application');
    queryParams['testEnvironment'] = Session.get('testEnvironment');
    queryParams['workload'] = Session.get('testType');
    FlowRouter.go('deepLinks', null, queryParams);
  },
  'click #open-system-under-test'() {
    const queryParams = {};
    queryParams['systemUnderTest'] = Session.get('application');
    if (Session.get('testEnvironment'))
      queryParams['testEnvironment'] = Session.get('testEnvironment');
    if (Session.get('testType'))
      queryParams['workload'] = Session.get('testType');
    FlowRouter.go('systemUnderTest', null, queryParams);
  },
  'click #open-notification-channels'() {
    const queryParams = {};
    queryParams['systemUnderTest'] = Session.get('application');
    FlowRouter.go('applicationNotificationsChannels', null, queryParams);
  },
  'click #open-admin-notification-channels'() {
    Session.set('application', undefined);
    FlowRouter.go('applicationNotificationsChannels', null, null);
  },
  'click #open-settings'() {
    FlowRouter.go('settings', null, null);
  },
  'click #open-api-keys'() {
    FlowRouter.go('apiKeys', null, null);
  },
  'click #open-dynatrace'() {
    const queryParams = {};
    queryParams['systemUnderTest'] = Session.get('application');
    queryParams['testEnvironment'] = Session.get('testEnvironment');
    FlowRouter.go('dynatrace', null, queryParams);
  },
  'click #home'() {
    FlowRouter.go('landingPage', null, null);
  },
  'click #test-runs'() {
    const queryParams = {};

    Session.set('reset-table', true);
    if (Session.get('team') !== undefined) Session.set('team', '');
    Session.set('application', undefined);
    Session.set('testEnvironment', undefined);
    Session.set('testType', undefined);
    Session.set('tags', undefined);
    queryParams['team'] = null;
    queryParams['systemUnderTest'] = null;
    queryParams['testEnvironment'] = null;
    queryParams['workload'] = null;
    queryParams['tags'] = null;

    // if (Session.get('team')) queryParams['team'] = Session.get('team')
    // if (Session.get('application')) queryParams['systemUnderTest'] = Session.get('application')
    // if (Session.get('testEnvironment')) queryParams['testEnvironment'] = Session.get('testEnvironment')
    // if (Session.get('testType')) queryParams['workload'] = Session.get('testType')

    FlowRouter.go('testRuns', null, queryParams);
  },
  'click #reports'() {
    const queryParams = {};

    if (Session.get('team')) queryParams['team'] = Session.get('team');
    if (Session.get('application'))
      queryParams['systemUnderTest'] = Session.get('application');
    if (Session.get('testEnvironment'))
      queryParams['testEnvironment'] = Session.get('testEnvironment');
    if (Session.get('testType'))
      queryParams['workload'] = Session.get('testType');

    FlowRouter.go('reports', null, queryParams);
  },
  'click #documentation'() {
    window.open('https://docs.perfana.io/', '_blank');
  },
  'click .sidebar--toggle'() {
    const toggle = document.getElementsByClassName('sidebar--toggle')[0];
    const sidebar = document.getElementsByClassName('perfana-sidebar')[0];
    const main = document.getElementsByClassName('perfana-main')[0];
    if (localStorage.sidebar > 0) {
      localStorage.sidebar = 0;
      toggle.classList.remove('is-active');
      sidebar.className = sidebar.getAttribute('data-collapsed');
      main.className = main.getAttribute('data-expanded');
    } else {
      localStorage.sidebar = 1;
      toggle.classList.add('is-active');
      sidebar.className = sidebar.getAttribute('data-expanded');
      main.className = main.getAttribute('data-collapsed');
    }
  },
});
