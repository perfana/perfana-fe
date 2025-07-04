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
  getTestRun,
  renderGrafanaPanelSoloUrl,
  renderGrafanaSnapshotPanelUrl,
} from '../../../helpers/utils';
import { CheckResults } from '../../../collections/checkResults';

import './testRunReportPanel.html';

import { Grafanas } from '../../../collections/grafanas';
import { Session } from 'meteor/session';
import { ReactiveVar } from 'meteor/reactive-var';
import { Snapshots } from '../../../collections/snapshots';
import { Applications } from '../../../collections/applications';
import { log } from '/both/logger';
import { ApplicationDashboards } from '../../../collections/applicationDashboards';
import _ from 'lodash';

Template.testRunReportPanel.onCreated(function testRunReportPanelOnCreated() {
  this.expandGraph = new ReactiveVar(true);
  this.userHasPermissionForApplication = new ReactiveVar(false);
  this.panelWidth = new ReactiveVar(1500);

  const query = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
    ],
  };

  Meteor.subscribe('checkResults', query, 'testRunReportPanel');

  const snapshotQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
      { testRunId: FlowRouter.current().params.testRunId },
    ],
  };
  Meteor.subscribe('snapshots', snapshotQuery, 'testRunReportPanel');

  Meteor.subscribe('configuration');

  const applicationDashboardQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
    ],
  };
  Meteor.subscribe('applicationDashboards', applicationDashboardQuery);

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
});

Template.testRunReportPanel.onRendered(function () {
  const self = this;

  this.autorun(() => {
    const currentWidth = self.$('panel-body .grafana-iframe').width();
    if (currentWidth > 0) self.panelWidth.set(currentWidth);
  });
});

Template.testRunReportPanel.helpers({
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
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

    const applicationDashboard = ApplicationDashboards.findOne({
      $and: [
        { application: testRun.application },
        { testEnvironment: testRun.testEnvironment },
        { dashboardUid: this.reportAnnotations.dashboardUid },
        { dashboardLabel: this.reportAnnotations.dashboardLabel },
        { grafana: this.reportAnnotations.grafana },
      ],
    });

    if (applicationDashboard) {
      // let dataRetention = getDataRetention(applicationDashboard);
      // let showSnapShot = new Date().getTime() - new Date(testRun.end).getTime() > (dataRetention * 1000);

      const url = renderGrafanaPanelSoloUrl(
        testRun,
        applicationDashboard.dashboardLabel,
        applicationDashboard.grafana,
        applicationDashboard.dashboardUid,
        this.reportAnnotations.panel.id,
      );

      const user = Meteor.user();

      if (user && url)
        return url.replace(/theme=(dark|light)/, `theme=${user.profile.theme}`);

      // const snapshot = Snapshots.findOne({
      //     $and: [
      //         {application: testRun.application},
      //         {testEnvironment: testRun.testEnvironment},
      //         {testType: testRun.testType},
      //         {testRunId: testRun.testRunId},
      //         {grafana: this.reportAnnotations.grafana},
      //         {dashboardUid: this.reportAnnotations.dashboardUid},
      //         {dashboardLabel: this.reportAnnotations.dashboardLabel},
      //     ]
      // })
      //
      //
      // if (snapshot) {
      //
      //     let grafana = Grafanas.findOne({label: snapshot.grafana});
      //
      //     let url = renderGrafanaSnapshotPanelUrl(snapshot.url, this.reportAnnotations.panel.id, testRun, snapshot, grafana, '&fullscreen');
      //
      //     const user = Meteor.user();
      //
      //     if (user && url) return url.replace(/theme=(dark|light)/, `theme=${user.profile.theme}`)
      //
      //
      // }

      // if (showSnapShot) {
      //
      //     const snapshot = Snapshots.findOne({
      //         $and: [
      //             {application: testRun.application},
      //             {testEnvironment: testRun.testEnvironment},
      //             {testType: testRun.testType},
      //             {testRunId: testRun.testRunId},
      //             {grafana: this.reportAnnotations.grafana},
      //             {dashboardUid: this.reportAnnotations.dashboardUid},
      //             {dashboardLabel: this.reportAnnotations.dashboardLabel},
      //         ]
      //     })
      //
      //
      //     if (snapshot) {
      //
      //         let grafana = Grafanas.findOne({label: snapshot.grafana});
      //
      //         let url = renderGrafanaSnapshotPanelUrl(snapshot.url, this.reportAnnotations.panel.id, testRun, snapshot, grafana, '&fullscreen');
      //
      //         const user = Meteor.user();
      //
      //         if (user && url) return url.replace(/theme=(dark|light)/, `theme=${user.profile.theme}`)
      //
      //
      //     }
      // } else {
      //
      //     return renderGrafanaPanelSoloUrl(testRun, applicationDashboard.dashboardLabel, applicationDashboard.grafana, applicationDashboard.dashboardUid, this.reportAnnotations.panel.id);
      // }
    }
  },
  snapShotUrl() {
    const testRun = this.testRun;

    const snapshot = Snapshots.findOne({
      $and: [
        { application: testRun.application },
        { testEnvironment: testRun.testEnvironment },
        { testType: testRun.testType },
        { testRunId: testRun.testRunId },
        { grafana: this.reportAnnotations.grafana },
        { dashboardUid: this.reportAnnotations.dashboardUid },
        { dashboardLabel: this.reportAnnotations.dashboardLabel },
      ],
    });

    if (snapshot) {
      const user = Meteor.user();

      if (user && snapshot.url)
        return snapshot.url.replace(
          /theme=(dark|light)/,
          `theme=${user.profile.theme}`,
        );
    }
  },
  hasSnapShotUrl() {
    const testRun = this.testRun;

    const snapshot = Snapshots.findOne({
      $and: [
        { application: testRun.application },
        { testEnvironment: testRun.testEnvironment },
        { testType: testRun.testType },
        { testRunId: testRun.testRunId },
        { grafana: this.reportAnnotations.grafana },
        { dashboardUid: this.reportAnnotations.dashboardUid },
        { dashboardLabel: this.reportAnnotations.dashboardLabel },
      ],
    });

    if (snapshot) {
      return snapshot.url !== undefined;
    }
  },
  panelImageUrl() {
    const testRun = this.testRun;

    const snapshot = Snapshots.findOne({
      $and: [
        { application: testRun.application },
        { testEnvironment: testRun.testEnvironment },
        { testType: testRun.testType },
        { testRunId: testRun.testRunId },
        { grafana: this.reportAnnotations.grafana },
        { dashboardUid: this.reportAnnotations.dashboardUid },
        { dashboardLabel: this.reportAnnotations.dashboardLabel },
      ],
    });

    if (snapshot) {
      const grafana = Grafanas.findOne({ label: snapshot.grafana });

      /* get element width */

      const currentWidth = Template.instance().panelWidth.get() * 0.9;

      const queryParams = `&width=${currentWidth}&height=500&tz=UTC%2B01%3A00`;

      if (currentWidth > 0) {
        const url = renderGrafanaSnapshotPanelUrl(
          snapshot.url.replace('/dashboard/', '/render/dashboard-solo/'),
          this.reportAnnotations.panel.id,
          testRun,
          snapshot,
          grafana,
          queryParams,
        );
        const user = Meteor.user();

        if (user && url)
          return url.replace(
            /theme=(dark|light)/,
            `theme=${user.profile.theme}`,
          );
      }
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

    if (
      testRun &&
      testRun.consolidatedResult &&
      testRun.consolidatedResult.meetsRequirement !== undefined
    ) {
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

    if (
      testRun &&
      testRun.consolidatedResult &&
      testRun.consolidatedResult.benchmarkPreviousTestRunOK !== undefined
    ) {
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

    if (
      testRun &&
      testRun.consolidatedResult &&
      testRun.consolidatedResult.benchmarkBaselineTestRunOK !== undefined
    ) {
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
    return (
      this.reportAnnotations.dashboardLabel +
      ' | ' +
      this.reportAnnotations.panel.title.replace(/[0-9]+-(.*)/, '$1')
    );
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

Template.testRunReportPanel.events({
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
  'click div #edit-annotations'(event) {
    event.preventDefault();
    Modal.show('testRunReportPanelAnnotation', this);
  },
  'click #add-annotation'(event) {
    event.preventDefault();
    Modal.show('testRunReportPanelAnnotation', this);
  },
});

Template.testRunCommentPanel.onCreated(function testRunCommentPanelOnCreated() {
  this.expandGraph = new ReactiveVar(false);
  this.panelWidth = new ReactiveVar(1500);

  const snapshotQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
      { testRunId: FlowRouter.current().params.testRunId },
    ],
  };
  Meteor.subscribe('snapshots', snapshotQuery, 'testRunReportPanel2');
});

Template.testRunCommentPanel.onRendered(function () {
  const self = this;

  this.autorun(() => {
    const currentWidth = self.$('panel-body .grafana-iframe').width();
    if (currentWidth > 0) self.panelWidth.set(currentWidth);
  });
});

Template.testRunCommentPanel.helpers({
  expandGraph() {
    // return Session.get('showInteractiveGraph');
    return Template.instance().expandGraph.get();
  },
  themeSnapshotPanelUrl(url) {
    const user = Meteor.user();

    if (user && url)
      return url.replace(/theme=(dark|light)/, `theme=${user.profile.theme}`);
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
  hasGraphUrl() {
    return this.graphUrl !== undefined;
  },
  graphUrl(comment) {
    if (comment) {
      if (comment.panelId && comment.dashboardUid) {
        // const testRun = getTestRun(FlowRouter.current().queryParams.systemUnderTest, FlowRouter.current().params.testRunId);
        const testRun = getTestRun(comment.application, comment.testRunId);

        if (testRun) {
          const applicationDashboard = ApplicationDashboards.findOne({
            $and: [
              { application: testRun.application },
              { testEnvironment: testRun.testEnvironment },
              { dashboardUid: comment.dashboardUid },
              { dashboardLabel: comment.dashboardLabel },
            ],
          });

          if (applicationDashboard) {
            // let dataRetention = getDataRetention(applicationDashboard);
            // let showSnapShot = new Date().getTime() - new Date(testRun.end).getTime() > (dataRetention * 1000);

            /* get snapshot */

            const snapshot = Snapshots.findOne({
              $and: [
                { application: testRun.application },
                { testEnvironment: testRun.testEnvironment },
                { testType: testRun.testType },
                { testRunId: testRun.testRunId },
                { dashboardUid: comment.dashboardUid },
                { dashboardLabel: comment.dashboardLabel },
              ],
            });

            if (snapshot) {
              const grafana = Grafanas.findOne({ label: snapshot.grafana });

              const queryParams = `&fullscreen`;

              return renderGrafanaSnapshotPanelUrl(
                snapshot.url,
                comment.panelId,
                testRun,
                snapshot,
                grafana,
                queryParams,
              );
            }

            // if (showSnapShot) {
            //
            //     /* get snapshot */
            //
            //     const snapshot = Snapshots.findOne({
            //         $and: [
            //             {application: testRun.application},
            //             {testEnvironment: testRun.testEnvironment},
            //             {testType: testRun.testType},
            //             {testRunId: testRun.testRunId},
            //             {dashboardUid: comment.dashboardUid},
            //             {dashboardLabel: comment.dashboardLabel},
            //         ]
            //     })
            //
            //     if (snapshot) {
            //
            //         let grafana = Grafanas.findOne({label: snapshot.grafana});
            //
            //         let queryParams = `&fullscreen`
            //
            //         return renderGrafanaSnapshotPanelUrl(snapshot.url, comment.panelId, testRun, snapshot, grafana, queryParams)
            //
            //     }
            // } else {
            //
            //     return renderGrafanaPanelSoloUrl(testRun, applicationDashboard.dashboardLabel, applicationDashboard.grafana, applicationDashboard.dashboardUid, comment.panelId);
            // }
          }
        }
      } else {
        // legacy comments

        const user = Meteor.user();

        if (user && user.profile.theme) {
          return comment.graphUrl.replace(
            /theme=(dark|light)/,
            `theme=${user.profile.theme}`,
          );
        }
      }
    }
  },
});

Template.testRunCommentPanel.events({
  'click div .toggle-graph-size'(event, template) {
    if (template.expandGraph.get() === true) {
      template.expandGraph.set(false);
    } else {
      template.expandGraph.set(true);
    }
  },

  'click div .snapshot-link'(event) {
    // Session.set('showInteractiveGraph', true)
    const snapshotUrl = $(event.target).attr('snapshot-url');
    window.open(snapshotUrl, '_blank');
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
