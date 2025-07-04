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
import {
  getDataRetention,
  getTestRun,
  renderGrafanaPanelSoloUrl,
  renderGrafanaSnapshotPanelUrl,
  replaceDynamicVariableValues,
} from '../../../helpers/utils';
import { CheckResults } from '../../../collections/checkResults';

import './testRunKeyMetrics.html';

import { Grafanas } from '../../../collections/grafanas';
import { Session } from 'meteor/session';
import { ReactiveVar } from 'meteor/reactive-var';
import { ReactiveDict } from 'meteor/reactive-dict';
import { Benchmarks } from '../../../collections/benchmarks';
import { ApplicationDashboards } from '../../../collections/applicationDashboards';
import { Snapshots } from '../../../collections/snapshots';
import { GrafanaDashboards } from '../../../collections/grafanaDashboards';
import _ from 'lodash';
import { $ } from 'meteor/jquery';

const testRunState = new ReactiveDict('testRunState');

Template.testRunKeyMetrics.onCreated(function testRunKeyMetricsOnCreated() {
  this.expandGraph = new ReactiveVar(true);
  this.panelWidth = new ReactiveVar(1500);
  this.testRun = new ReactiveVar();
  this.columnWidth = new ReactiveVar();
  this.visibleLimit = new ReactiveVar(1);

  Meteor.setTimeout(() => {
    this.visibleLimit.set(6);
  }, 1000);

  this.visibleLimit = new ReactiveVar(1);

  Meteor.setTimeout(() => {
    this.visibleLimit.set(6);
  }, 1000);

  testRunState.set('running', this.data.runningTest);

  const query = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
    ],
  };

  Meteor.subscribe('checkResults', query, 'testRunKeyMetrics');
  Meteor.subscribe('grafanas');
  Meteor.subscribe('configuration');
  Meteor.subscribe('benchmarks', query);

  const grafanaDashboardsQuery = {
    $and: [{ usedBySUT: Session.get('application') }],
  };

  Meteor.subscribe('grafanaDashboards', grafanaDashboardsQuery);

  this.autorun(() => {
    FlowRouter.watchPathChange();

    if (
      Session.get('application') &&
      Session.get('testEnvironment') &&
      Session.get('testType') &&
      FlowRouter.current().params.testRunId
    ) {
      const snapshotQuery = {
        $and: [
          { application: Session.get('application') },
          { testEnvironment: Session.get('testEnvironment') },
          { testType: Session.get('testType') },
          { testRunId: FlowRouter.current().params.testRunId },
        ],
      };

      Meteor.subscribe('snapshots', snapshotQuery, 'testRunKeyMetrics');
    }

    if (Session.get('application') && Session.get('testEnvironment')) {
      const applicationDashboardQuery = {
        $and: [
          { application: Session.get('application') },
          { testEnvironment: Session.get('testEnvironment') },
        ],
      };
      Meteor.subscribe('applicationDashboards', applicationDashboardQuery);
    }

    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    this.testRun.set(testRun);
  });
});

Template.testRunKeyMetrics.onDestroyed(function () {
  $(window).off('scroll');
});

Template.testRunKeyMetrics.onRendered(function () {
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

  this.autorun(() => {
    const currentWidth = self.$('panel-body .grafana-iframe').width();
    if (currentWidth > 0) self.panelWidth.set(currentWidth);
  });
});

Template.testRunKeyMetrics.helpers({
  trimPanelTitle(title) {
    return title.replace(/[0-9]+-(.*)/, '$1');
  },
  keyMetrics() {
    const testRun = Template.instance().testRun.get();

    if (testRun) {
      const limit = Template.instance().visibleLimit.get();

      const benchmarks = Benchmarks.find(
        {
          $and: [
            { application: testRun.application },
            { testType: testRun.testType },
            { testEnvironment: testRun.testEnvironment },
          ],
        },
        { sort: { dashboardLabel: 1 }, limit: limit },
      ).fetch();

      if (benchmarks) {
        let all = _.uniq(benchmarks);
        const chunks = [];
        const size =
          Session.get('graphsPerRow') ? Session.get('graphsPerRow')
          : all.length < 4 ? all.length
          : 3;
        const columnWidth = 12 / size;
        Session.set('columnWidth', `col-md-${columnWidth}`);
        while (all.length > size) {
          chunks.push({ row: all.slice(0, size) });
          all = all.slice(size);
        }
        chunks.push({ row: all, runningTest: this.runningTest });
        return chunks;
      }
    }
  },
  expandGraph() {
    // return Session.get('showInteractiveGraph');
    return Template.instance().expandGraph.get();
  },
  annotation() {
    const testRun = this.testRun;

    if (testRun) {
      return getPersistedAnnotation(
        testRun,
        this.reportAnnotations.dashboardUid,
        this.reportAnnotations.panel,
      );
    }
  },

  reportPanelHasAnnotations() {
    const testRun = this.testRun;

    if (testRun) {
      const annotation = getPersistedAnnotation(
        testRun,
        this.reportAnnotations.dashboardUid,
        this.reportAnnotations.panel,
      );

      if (annotation !== undefined) Template.instance().expandGraph.set(false);

      return annotation !== undefined;
    }
  },
  url() {
    const testRun = this.testRun;

    const dashboardUid = this.reportAnnotations.dashboardUid;

    const dashboardLabel = this.reportAnnotations.dashboardLabel;

    if (testRun) {
      /* Filter snapshot */

      const filteredSnapshot = testRun.snapshots.filter(
        (snapshot) =>
          snapshot.dashboardUid === dashboardUid &&
          snapshot.dashboardLabel === dashboardLabel,
      );

      const grafana = Grafanas.findOne({ label: filteredSnapshot[0].grafana });

      return renderGrafanaSnapshotPanelUrl(
        filteredSnapshot[0].url,
        this.reportAnnotations.panel.id,
        testRun,
        filteredSnapshot[0],
        grafana,
        '&fullscreen',
      );
    }
  },

  currentWidth() {
    if (Template.instance().panelWidth.get() > 0)
      return Template.instance().panelWidth.get();
  },
  testRunPanel() {
    const testRun = this.testRun;

    if (testRun) {
      const testRunPanel = getTestRunPanel(
        testRun,
        this.reportAnnotations.dashboardUid,
        this.reportAnnotations.dashboardLabel,
        this.reportAnnotations.panel.id,
      );

      if (testRunPanel) return testRunPanel;
    }
  },
  testRunPanelHasRequirements() {
    const testRun = this.testRun;

    if (testRun && testRun.benchmarks) {
      const testRunPanel = getTestRunPanel(
        testRun,
        this.reportAnnotations.grafana,
        this.reportAnnotations.dashboardUid,
        this.reportAnnotations.dashboardLabel,
        this.reportAnnotations.panel.id,
      );

      if (testRunPanel) {
        if (_.has(testRunPanel, 'meetsRequirement'))
          Template.instance().expandGraph.set(false);

        return _.has(testRunPanel, 'meetsRequirement');
      } else {
        return false;
      }
    } else {
      return false;
    }
  },

  panel() {
    return this.reportAnnotations.panel;
  },

  panelCheckResults() {
    const panelCheckResults = CheckResults.findOne({
      $and: [
        { application: this.testRun.application },
        { testEnvironment: this.testRun.testEnvironment },
        { testType: this.testRun.testType },
        { testRunId: this.testRun.testRunId },
        { grafana: this.reportAnnotations.grafana },
        { dashboardLabel: this.reportAnnotations.dashboardLabel },
        { dashboardUid: this.reportAnnotations.dashboardUid },
        { panelTitle: this.reportAnnotations.panel.title },
        { panelId: this.reportAnnotations.panel.id },
      ],
    });
    if (panelCheckResults) return panelCheckResults;
  },
  testRunPanelHasComparisonPreviousTestRunResults() {
    const testRun = this.testRun;

    if (testRun && testRun.benchmarks) {
      const testRunPanel = getTestRunPanel(
        testRun,
        this.reportAnnotations.grafana,
        this.reportAnnotations.dashboardUid,
        this.reportAnnotations.dashboardLabel,
        this.reportAnnotations.panel.id,
      );

      if (testRunPanel) {
        if (_.has(testRunPanel, 'benchmarkPreviousTestRunOK'))
          Template.instance().expandGraph.set(false);

        return _.has(testRunPanel, 'benchmarkPreviousTestRunOK');
      } else {
        return false;
      }
    } else {
      return false;
    }
  },
  testRunPanelHasComparisonBaselineTestRunResults() {
    const testRun = this.testRun;

    if (testRun && testRun.benchmarks) {
      const testRunPanel = getTestRunPanel(
        testRun,
        this.reportAnnotations.grafana,
        this.reportAnnotations.dashboardUid,
        this.reportAnnotations.dashboardLabel,
        this.reportAnnotations.panel.id,
      );

      if (testRunPanel) {
        if (_.has(testRunPanel, 'benchmarkBaselineTestRunOK'))
          Template.instance().expandGraph.set(false);

        return _.has(testRunPanel, 'benchmarkBaselineTestRunOK');
      } else {
        return false;
      }
    } else {
      return false;
    }
  },
  previousTestRunLink() {
    const testRun = this.testRun;

    if (testRun && testRun.benchmarks.previousTestRun) {
      const previousTestRun = getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        testRun.benchmarks.previousTestRun,
      );

      if (previousTestRun) {
        const testRunUrl =
          '/test-run/' +
          previousTestRun.testRunId +
          '?systemUnderTest=' +
          previousTestRun.application +
          '&workload=' +
          previousTestRun.testType +
          '&testEnvironment=' +
          previousTestRun.testEnvironment;

        return new Spacebars.SafeString(
          `<a href="${testRunUrl}" target="_blank">${previousTestRun.testRunId}, ${previousTestRun.applicationRelease}</a>`,
        );
      }
    }
  },
  baselineTestRunLink() {
    const testRun = this.testRun;

    if (testRun && testRun.benchmarks.baselineTestRun) {
      const baselineTestRun = getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        testRun.benchmarks.baselineTestRun,
      );
      if (baselineTestRun) {
        const testRunUrl =
          '/test-run/' +
          baselineTestRun.testRunId +
          '?systemUnderTest=' +
          baselineTestRun.application +
          '&workload=' +
          baselineTestRun.testType +
          '&testEnvironment=' +
          baselineTestRun.testEnvironment;

        return new Spacebars.SafeString(
          `<a href="${testRunUrl}" target="_blank">${baselineTestRun.testRunId}, ${baselineTestRun.applicationRelease}</a>`,
        );
      }
    }
  },
  reportPanelTitle() {
    return this.reportAnnotations.panel.title.replace(/[0-9]+-(.*)/, '$1');
  },
});

Template.testRunKeyMetrics.events({
  'click #open-comment-box'(event) {
    event.preventDefault();

    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const graphModalParams = {
        dashboardUid: this.dashboardUid,
        dashboardLabel: this.dashboardLabel,
        grafana: this.grafana,
        snapshotUrl: this.snapshotUrl,
        panelId: this.panel.id,
        panelTitle: this.panel.title.replace(/[0-9]+-(.*)/, '$1'),
        testRun: testRun,
      };

      Modal.show('commentsModal', graphModalParams);
    }
  },
  'click div .toggle-graph-size'(event, template) {
    if (template.expandGraph.get() === true) {
      template.expandGraph.set(false);
    } else {
      template.expandGraph.set(true);
    }
  },
  'click div .interactive-graph'(event, template) {
    // Session.set('showInteractiveGraph', true)
    template.showInteractiveGraph.set(true);
  },
  'click div .snapshot-link'(event) {
    // Session.set('showInteractiveGraph', true)
    const snapshotUrl = $(event.target).attr('snapshot-url');
    window.open(snapshotUrl, '_blank');
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
  'click #row-5'() {
    // $(".btn-group > .btn").removeClass("active");
    // event.currentTarget.classList.toggle("active");
    Session.set('graphsPerRow', 5);
  },
});

Template.keyMetricsRow.helpers({
  panelImageUrl() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const grafana = Grafanas.findOne({ label: this.grafana });

      const grafanaDashboard = GrafanaDashboards.findOne({
        $and: [{ grafana: grafana.label }, { uid: this.dashboardUid }],
      });

      const applicationDashboard = ApplicationDashboards.findOne({
        $and: [
          { application: this.application },
          { testEnvironment: this.testEnvironment },
          { grafana: grafana.label },
          { dashboardUid: this.dashboardUid },
          { dashboardLabel: this.dashboardLabel },
        ],
      });

      if (grafanaDashboard && applicationDashboard)
        return renderGrafanaPanelSoloUrl(
          testRun,
          applicationDashboard.dashboardLabel,
          grafana.label,
          grafanaDashboard.uid,
          this.panel.id,
        );
    }
  },
  runningTestPanelImageUrl() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const grafana = Grafanas.findOne({ label: this.grafana });

      const grafanaDashboard = GrafanaDashboards.findOne({
        $and: [{ grafana: grafana.label }, { uid: this.dashboardUid }],
      });

      const applicationDashboard = ApplicationDashboards.findOne({
        $and: [
          { application: this.application },
          { testEnvironment: this.testEnvironment },
          { grafana: grafana.label },
          { dashboardUid: this.dashboardUid },
          { dashboardLabel: this.dashboardLabel },
        ],
      });

      const queryParams = `fullscreen&refresh=10s`;

      if (grafanaDashboard && applicationDashboard)
        return renderRunningTestGrafanaPanelUrl(
          testRun,
          applicationDashboard,
          grafana,
          grafanaDashboard,
          this.panel.id,
          queryParams,
        );
    }
  },
  hasSnapShotUrl() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const applicationDashboard = ApplicationDashboards.findOne({
        $and: [
          { application: this.application },
          { testEnvironment: this.testEnvironment },
          { grafana: this.grafana },
          { dashboardUid: this.dashboardUid },
          { dashboardLabel: this.dashboardLabel },
        ],
      });

      if (applicationDashboard) {
        const snapshot = Snapshots.findOne({
          $and: [
            { application: testRun.application },
            { testEnvironment: testRun.testEnvironment },
            { testType: testRun.testType },
            { testRunId: testRun.testRunId },
            { dashboardUid: this.dashboardUid },
            { dashboardLabel: this.dashboardLabel },
          ],
        });

        if (snapshot) {
          return snapshot.url !== undefined;
        }
      }
    }
  },
  snapShotUrl() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const applicationDashboard = ApplicationDashboards.findOne({
        $and: [
          { application: this.application },
          { testEnvironment: this.testEnvironment },
          { grafana: this.grafana },
          { dashboardUid: this.dashboardUid },
          { dashboardLabel: this.dashboardLabel },
        ],
      });

      if (applicationDashboard) {
        const snapshot = Snapshots.findOne({
          $and: [
            { application: testRun.application },
            { testEnvironment: testRun.testEnvironment },
            { testType: testRun.testType },
            { testRunId: testRun.testRunId },
            { dashboardUid: this.dashboardUid },
            { dashboardLabel: this.dashboardLabel },
          ],
        });

        if (snapshot) {
          const grafana = Grafanas.findOne({ label: this.grafana });

          if (grafana) {
            return renderGrafanaSnapshotPanelUrl(
              snapshot.url,
              this.panel.id,
              testRun,
              applicationDashboard,
              grafana,
              '&fullscreen',
            );
          }
        }
      }
    }
  },
  themeUrl(url) {
    const user = Meteor.user();

    if (user && url)
      return url.replace(/theme=(dark|light)/, `theme=${user.profile.theme}`);
  },
  columnClass() {
    return Session.get('columnWidth');
  },
  runningTest() {
    return testRunState.get('running');
  },
  showSnapshots() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const applicationDashboard = ApplicationDashboards.findOne({
        dashboardUid: this.dashboardUid,
      });
      const dataRetention = getDataRetention(applicationDashboard);
      return (
        new Date().getTime() - new Date(testRun.end).getTime() >
        dataRetention * 1000
      );
    }
  },
});

const getTestRunPanel = (
  testRun,
  grafana,
  dashboardUid,
  dashboardLabel,
  panelId,
) => {
  const panelCheckResults = CheckResults.findOne({
    $and: [
      { application: testRun.application },
      { testEnvironment: testRun.testEnvironment },
      { testType: testRun.testType },
      { testRunId: testRun.testRunId },
      { grafana: grafana },
      { dashboardLabel: dashboardLabel },
      { dashboardUid: dashboardUid },
      { panelId: panelId },
    ],
  });
  if (panelCheckResults) return panelCheckResults;

  /* Filter dashboard */
  if (testRun.benchmarks) {
    const filteredDashboard = testRun.benchmarks.dashboards.filter(
      (dashboard) =>
        dashboard.dashboardUid === dashboardUid &&
        dashboard.dashboardLabel === dashboardLabel,
    );

    if (filteredDashboard.length > 0 && filteredDashboard[0].panels) {
      /* Filter panel */

      const filteredPanel = filteredDashboard[0].panels.filter(
        (panel) => panel.id === panelId,
      );

      if (filteredPanel.length > 0) return filteredPanel[0];
    }
  }
};

const getPersistedAnnotation = (testRun, dashboardUid, panel) => {
  if (testRun.persistReport) {
    /* filter panel */

    const filteredPanel = testRun.reportAnnotations.filter(
      (reportAnnotationItem) =>
        reportAnnotationItem.dashboardUid === dashboardUid &&
        reportAnnotationItem.panelId === panel.id,
    );

    return filteredPanel.length > 0 ? filteredPanel[0].annotation : undefined;
  } else {
    return panel.annotation ? panel.annotation : undefined;
  }
};

export const renderRunningTestGrafanaPanelUrl = (
  testRun,
  applicationDashboard,
  grafana,
  grafanaDashboard,
  panelId,
  queryParams,
) => {
  let result;
  const start = new Date(testRun.start).getTime();

  if (testRun && applicationDashboard) {
    let variables = `&var-system_under_test=${testRun.application}&var-test_environment=${testRun.testEnvironment}`;
    if (applicationDashboard.variables) {
      if (testRun.variables && testRun.variables.length > 0)
        applicationDashboard = replaceDynamicVariableValues(
          applicationDashboard,
          testRun,
        );

      for (const v in applicationDashboard.variables) {
        for (const l in applicationDashboard.variables[v].values) {
          if (applicationDashboard.variables[v])
            variables +=
              '&var-' +
              applicationDashboard.variables[v].name +
              '=' +
              applicationDashboard.variables[v].values[l];
        }
      }
    }

    const theme =
      Meteor.user().profile.theme ? Meteor.user().profile.theme : 'light';

    result = `${grafana.clientUrl}/d-solo/${grafanaDashboard.uid}/${grafanaDashboard.slug}?orgId=${grafana.orgId}&from=${start}&to=now${variables}&panelId=${panelId}&${queryParams}&theme=${theme}&kiosk`;
  }

  return result;
};
