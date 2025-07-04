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

import { GrafanaDashboards } from '../../../collections/grafanaDashboards';
import { Session } from 'meteor/session';
import {
  dynamicSort,
  getDataRetention,
  getTestRun,
  renderGrafanaPanelSoloUrl,
  replaceDynamicVariableValues,
  slugify,
} from '../../../helpers/utils';
import { Meteor } from 'meteor/meteor';
import { $ } from 'meteor/jquery';
import { Snapshots } from '../../../collections/snapshots';

import './testRunDashboards.html';
import { Template } from 'meteor/templating';
import { ApplicationDashboards } from '../../../collections/applicationDashboards';
import { ReactiveVar } from 'meteor/reactive-var';
import { Grafanas } from '../../../collections/grafanas';
import { Applications } from '../../../collections/applications';
import { log } from '/both/logger';
// import 'datatables.net-bs/css/dataTables.bootstrap.css';

Template.testRunDashboards.onCreated(function () {
  this.applicationDashboards = new ReactiveVar();
  this.activeHref = new ReactiveVar('all');
  Session.set('dashboardTags', 'All');

  const grafanaDashboardsQuery = {
    $and: [{ usedBySUT: Session.get('application') }],
  };

  Meteor.subscribe('grafanaDashboards', grafanaDashboardsQuery);

  Meteor.subscribe('configuration');

  this.autorun(() => {
    FlowRouter.watchPathChange();

    const applicationDashboardQuery = {
      $and: [
        { application: Session.get('application') },
        { testEnvironment: Session.get('testEnvironment') },
      ],
    };

    if (
      Meteor.subscribe(
        'applicationDashboards',
        applicationDashboardQuery,
      ).ready()
    ) {
      const query = { $and: [] };

      if (Session.get('application'))
        query.$and.push({ application: Session.get('application') });
      if (Session.get('testEnvironment'))
        query.$and.push({ testEnvironment: Session.get('testEnvironment') });
      const dashboardTagsRegex = '^' + Session.get('dashboardTags') + '$';
      if (
        Session.get('dashboardTags') &&
        Session.get('dashboardTags') !== 'All'
      )
        query.$and.push({
          tags: {
            $regex: dashboardTagsRegex,
            $options: 'i',
          },
        });

      if (query.$and.length > 0) {
        const applicationDashboards = ApplicationDashboards.find(query).fetch();

        if (Session.get('dashboardFilter')) {
          const filterdDashboards = applicationDashboards.filter(
            (applicationDashboard) => {
              const dashboardRegExp = new RegExp(
                Session.get('dashboardFilter'),
                'ig',
              );

              return dashboardRegExp.test(applicationDashboard.dashboardLabel);
            },
          );

          this.applicationDashboards.set(filterdDashboards);
        } else {
          this.applicationDashboards.set(applicationDashboards);
        }
      }
    }
  });
});

Template.testRunDashboards.onRendered(function testRunDashboardsOnRendered() {
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

Template.testRunDashboards.helpers({
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

      return tags
        .filter((tag) => {
          const perfanaRegExp = new RegExp('.*perfana.*', 'ig');
          return !perfanaRegExp.test(tag) && tag.indexOf('$') === -1;
        })
        .sort();
    }
  },
  applicationDashboardTagTabActive(href) {
    return Template.instance().activeHref.get() === href.toString();
  },

  applicationDashboards() {
    return (
      Template.instance().applicationDashboards.get() &&
      Template.instance()
        .applicationDashboards.get()
        .sort(dynamicSort('dashboardLabel'))
    );
  },
  dashboardFilter() {
    // return  Template.instance().requestNameFilter.get()
    return Session.get('dashboardFilter');
  },
});

Template.testRunDashboards.events({
  'keyup #dashboard-filter'(event) {
    // template.requestNameFilter.set(event.target.value)
    Session.set('dashboardFilter', event.target.value);
  },
  'click .clear-filter'(event) {
    event.preventDefault();
    Session.set('dashboardFilter', undefined);
  },

  'click .nav-tabs.application-dashboard-tags  a'(event, template) {
    event.preventDefault();
    // $(this).tab('show');
    template.activeHref.set(
      event.currentTarget.getAttribute('href').replace('#', ''),
    );

    Session.set('dashboardTags', event.currentTarget.text);
  },

  'click #show-datasource-graphs': function () {
    Template.instance().showSnapshots.set(false);
  },
  'click #show-snapshot-graphs': function () {
    Template.instance().showSnapshots.set(true);
  },
});

Template.grafanaDashboardIframe.onCreated(function () {
  this.windowHeight = new ReactiveVar();

  this.windowHeight.set(0.9 * $(window).height());

  const applicationDashboardQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
    ],
  };

  Meteor.subscribe('applicationDashboards', applicationDashboardQuery);

  const snapshotQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
      { testRunId: FlowRouter.current().params.testRunId },
    ],
  };
  Meteor.subscribe('snapshots', snapshotQuery, 'testRunDashboards');

  this.grafanaUrl = new ReactiveVar();
  this.grafanaSnapshotUrl = new ReactiveVar();

  const testRun = getTestRun(
    FlowRouter.current().queryParams.systemUnderTest,
    FlowRouter.current().params.testRunId,
  );

  if (testRun) {
    renderGrafanaUrl(this.data, testRun, false, true, (err, grafanaUrl) => {
      if (err) {
        log.error(JSON.stringify(err));
      } else {
        this.grafanaUrl.set(grafanaUrl);
      }
    });

    // Meteor.call('renderGrafanaUrl', this.data, testRun, false, true, (err, grafanaUrl) => {
    //   if(grafanaUrl.error){
    //     log.error(JSON.stringify(grafanaUrl.error));
    //   } else {
    //     this.grafanaUrl.set(grafanaUrl.data);
    //   }
    // })

    renderGrafanaSnapshotUrl(this.data, testRun, (err, grafanaSnapshotUrl) => {
      if (err) {
        // log.error(JSON.stringify(err));
        this.grafanaSnapshotUrl.set(undefined);
      } else {
        this.grafanaSnapshotUrl.set(grafanaSnapshotUrl);
      }
    });
  }
});

Template.grafanaDashboardIframe.helpers({
  windowHeight() {
    return Template.instance().windowHeight.get();
  },
  grafanaUrl() {
    return Template.instance().grafanaUrl.get();
  },
  hasGrafanaSnapshotUrl() {
    return Template.instance().grafanaSnapshotUrl.get() !== undefined;
  },
  grafanaSnapshotUrl() {
    return Template.instance().grafanaSnapshotUrl.get();
  },
  showSnapshots() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const dataRetention = getDataRetention(this);
      return (
        new Date().getTime() - new Date(testRun.end).getTime() >
        dataRetention * 1000
      );
    }
  },
});

Template.testRunDashboardsAccordion.onCreated(
  function testRunDashboardsAccordionOnCreated() {
    this.testRun = new ReactiveVar();
    this.metricHeaderCollapsed = new ReactiveVar(true);

    const applicationDashboardQuery = {
      $and: [
        { application: Session.get('application') },
        { testEnvironment: Session.get('testEnvironment') },
      ],
    };

    Meteor.subscribe('applicationDashboards', applicationDashboardQuery);

    const snapshotQuery = {
      $and: [
        { application: Session.get('application') },
        { testEnvironment: Session.get('testEnvironment') },
        { testType: Session.get('testType') },
        { testRunId: FlowRouter.current().params.testRunId },
      ],
    };
    Meteor.subscribe('snapshots', snapshotQuery, 'testRunDashboards2');
    this.showSnapshots = new ReactiveVar(false);

    const query = { $and: [] };

    if (Session.get('application'))
      query.$and.push({ application: Session.get('application') });
    if (Session.get('testEnvironment'))
      query.$and.push({ testEnvironment: Session.get('testEnvironment') });

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

Template.testRunDashboardsAccordion.helpers({
  metricHeaderCollapsed() {
    return Template.instance().metricHeaderCollapsed.get();
  },
  showSnapshots() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    if (testRun) {
      const dataRetention = getDataRetention(this);
      return (
        new Date().getTime() - new Date(testRun.end).getTime() >
        dataRetention * 1000
      );
    }
  },
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
  snapshotMissing() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const snapshot = Snapshots.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
          { testRunId: testRun.testRunId },
          { dashboardUid: this.dashboardUid },
          { dashboardLabel: this.dashboardLabel },
          { status: 'COMPLETE' },
        ],
      });

      if (snapshot) {
        return snapshot.fetch().length === 0;
      }
    }
  },
});

Template.testRunDashboardsAccordion.events({
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

    if (testRun) {
      const dataRetention = getDataRetention(this);
      const showSnapShot =
        new Date().getTime() - new Date(testRun.end).getTime() >
        dataRetention * 1000;

      if (showSnapShot) {
        renderGrafanaSnapshotUrl(this, testRun, (err, grafanaUrl) => {
          if (err) {
            log.error(JSON.stringify(err));
          } else {
            window.open(grafanaUrl, '_blank');
          }
        });
      } else {
        renderGrafanaUrl(this, testRun, false, false, (err, grafanaUrl) => {
          if (err) {
            log.error(JSON.stringify(err));
          } else {
            window.open(grafanaUrl, '_blank');
          }
        });
      }
    }

    // Meteor.call('renderGrafanaUrl', this, testRun, false, false, (err, grafanaUrl) => {
    //   if(grafanaUrl.error){
    //     log.error(JSON.stringify(grafanaUrl.error));
    //   } else {
    //     window.open(grafanaUrl.data, '_blank')
    //   }
    //
    // })
  },
  'click #open-comment-box'(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const graphModalParams = {
      dashboardUid: this.dashboardUid,
      dashboardLabel: this.dashboardLabel,
      grafana: this.grafana,
      snapshotUrl: this.snapshotUrl,
    };

    Modal.show('commentsModal', graphModalParams);
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
  'click #manage-test-run-link': function (event) {
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
});

// Template.commentsModal.onCreated(function() {
//   $.fn.modal.Constructor.prototype.enforceFocus = $.noop;
//
// })
// Template.commentsModal.onRendered(function() {
//   $(this).modal.Constructor.prototype.enforceFocus  = function() {};
//
// })

Template.addKeyMetricsModal.onCreated(function () {
  Session.set('keyMetricPanelId', undefined);
  Session.set('keyMetricPanelType', undefined);

  this.panelWidth = new ReactiveVar(1500);

  Meteor.subscribe('grafanas');
});

Template.addKeyMetricsModal.onRendered(function () {
  const self = this;

  this.autorun(() => {
    const currentWidth = self.$('.key-metrics-preview .grafana-iframe').width();
    if (currentWidth > 0) self.panelWidth.set(currentWidth);
  });
});

Template.addKeyMetricsModal.helpers({
  panelSelected() {
    return Session.get('keyMetricPanelId') !== undefined;
  },
  graphPreviewUrl() {
    if (
      this.dashboardUid !== undefined &&
      this.dashboardLabel !== undefined &&
      Session.get('keyMetricPanelId') !== undefined
    ) {
      const testRun = getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        FlowRouter.current().params.testRunId,
      );

      if (testRun) {
        const applicationDashboard = ApplicationDashboards.findOne({
          $and: [
            { application: testRun.application },
            { testEnvironment: testRun.testEnvironment },
            { dashboardUid: this.dashboardUid },
            { dashboardLabel: this.dashboardLabel },
          ],
        });

        return renderGrafanaPanelSoloUrl(
          testRun,
          applicationDashboard.dashboardLabel,
          applicationDashboard.grafana,
          applicationDashboard.dashboardUid,
          Session.get('keyMetricPanelId'),
        );
      }
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
  setTheme(graphUrl) {
    const user = Meteor.user();

    if (user && user.profile.theme) {
      return graphUrl.replace(
        /theme=(dark|light)/,
        `theme=${user.profile.theme}`,
      );
    }
  },
  hasGraphPreviewUrl() {
    if (
      this.dashboardUid !== undefined &&
      this.dashboardLabel !== undefined &&
      Session.get('keyMetricPanelId') !== undefined
    ) {
      const testRun = getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        FlowRouter.current().params.testRunId,
      );

      if (testRun) {
        const applicationDashboard = ApplicationDashboards.findOne({
          $and: [
            { application: testRun.application },
            { testEnvironment: testRun.testEnvironment },
            { dashboardUid: this.dashboardUid },
            { dashboardLabel: this.dashboardLabel },
          ],
        });

        return !!applicationDashboard;
      }
    }
  },
});

Template.commentsModal.events({
  'click #close-comments-modal'(event) {
    event.preventDefault();

    Session.set('dashboardUid', undefined);
    Session.set('dashboardLabel', undefined);
    Session.set('panelTitle', undefined);
    Session.set('panelId', undefined);

    $('#comment-text').val('');
    $('#modal-comment-text').val('');

    // noinspection JSCheckFunctionSignatures
    Modal.hide('commentsModal');
  },
});
Template.addKeyMetricsModal.events({
  'click button#add-key-metric'(event) {
    event.preventDefault();

    const benchmark = {
      application: this.application,
      testType: this.testType,
      testEnvironment: this.testEnvironment,
      grafana: this.grafana,
      dashboardLabel: this.dashboardLabel,
      dashboardId: this.dashboardId,
      dashboardUid: this.dashboardUid,
      panel: {
        id: Session.get('keyMetricPanelId'),
        title:
          Session.get('keyMetricPanelId') +
          '-' +
          Session.get('keyMetricPanelTitle'),
        type: Session.get('keyMetricPanelType'),
        evaluateType: 'avg',
        excludeRampUpTime: false,
        averageAll: false,
        validateWithDefaultIfNoData: false,
      },
      updateTestRuns: false,
    };

    Meteor.call('insertBenchmark', benchmark, (err) => {
      if (err) {
        window.toastr.clear();
        window.toastr['error'](err.reason, 'Error');
      } else {
        window.toastr.clear();
        window.toastr['success']('Done!', 'Added service level indicator');
      }
      $('#addKeyMetricsModal').modal('hide');
    });
  },
});

const renderGrafanaUrl = (
  tableRow,
  testRun,
  runningTest,
  kioskMode,
  callback,
) => {
  try {
    let applicationDashboard = ApplicationDashboards.findOne({
      $and: [
        // {_id: tableRow._id},
        { grafana: tableRow.grafana },
        { dashboardUid: tableRow.dashboardUid },
        { dashboardLabel: tableRow.dashboardLabel },
      ],
    });
    const grafana = Grafanas.findOne({ label: applicationDashboard.grafana });
    const grafanaDashboard = GrafanaDashboards.findOne({
      $and: [
        { grafana: applicationDashboard.grafana },
        { uid: applicationDashboard.dashboardUid },
      ],
    });

    const start =
      isNaN(testRun.start) ? testRun.start : new Date(testRun.start).getTime();
    let end;

    if (runningTest) {
      end = 'now';
    } else {
      end = isNaN(testRun.end) ? testRun.end : new Date(testRun.end).getTime();
    }

    let result;

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
      let queryParams = `theme=${theme}`;
      if (runningTest) queryParams += '&refresh=10s';
      const kiosk = kioskMode ? '&kiosk' : '';

      result = `${grafana.clientUrl}/d/${grafanaDashboard.uid}/${grafanaDashboard.slug}?orgId=${grafana.orgId}&from=${start}&to=${end}${variables}&${queryParams}${kiosk}`;
    }

    callback(null, result);
  } catch (err) {
    callback(err, null);
  }
};

const renderGrafanaSnapshotUrl = (tableRow, testRun, callback) => {
  try {
    const snapshot = Snapshots.findOne({
      $and: [
        { application: testRun.application },
        { testEnvironment: testRun.testEnvironment },
        { testType: testRun.testType },
        { testRunId: testRun.testRunId },
        { dashboardUid: tableRow.dashboardUid },
        { dashboardLabel: tableRow.dashboardLabel },
      ],
    });

    if (snapshot && snapshot.url) {
      const snapshotUrl = snapshot.url;

      let result;
      const start =
        isNaN(testRun.start) ?
          testRun.start
        : new Date(testRun.start).getTime();
      const end =
        isNaN(testRun.end) ? testRun.end : new Date(testRun.end).getTime();

      let applicationDashboard = ApplicationDashboards.findOne({
        $and: [
          { grafana: tableRow.grafana },
          { dashboardUid: tableRow.dashboardUid },
        ],
      });

      const grafana = Grafanas.findOne({ label: applicationDashboard.grafana });

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
        const queryParams = `fullscreen&theme=${theme}`;

        result = `${snapshotUrl}?orgId=${grafana.orgId}&from=${start}&to=${end}${variables}&${queryParams}&kiosk`;
      }

      callback(null, result);
    } else {
      const err = { message: 'Snapshot not found!' };
      callback(err, null);
    }
  } catch (err) {
    callback(err, null);
  }
};
