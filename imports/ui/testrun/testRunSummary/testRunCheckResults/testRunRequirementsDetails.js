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

// noinspection HtmlUnknownAttribute

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';
import {
  dynamicSort,
  getTestRun,
  renderGrafanaUrl,
  replaceDynamicVariableValues,
  slugify,
} from '/imports/helpers/utils';

import './testRunRequirementsDetails.html';
import './testRunRequirementsDetails.less';

import { Grafanas } from '/imports/collections/grafanas';
import { ApplicationDashboards } from '/imports/collections/applicationDashboards';
import { GrafanaDashboards } from '/imports/collections/grafanaDashboards';
import { Applications } from '/imports/collections/applications';
import { Benchmarks } from '/imports/collections/benchmarks';
import { getUnit } from '/imports/helpers/units';
import { ReactiveVar } from 'meteor/reactive-var';
import { $ } from 'meteor/jquery';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import _ from 'lodash';

Template.testRunRequirementsDetails.onCreated(function applicationOnCreated() {
  this.state = new ReactiveDict();

  let applicationDashboardQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
    ],
  };

  let benchmarksQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
    ],
  };

  Meteor.subscribe('grafanas');
  Meteor.subscribe('benchmarks', benchmarksQuery);
  Meteor.subscribe('applicationDashboards', applicationDashboardQuery);

  const grafanaDashboardsQuery = {
    $and: [{ usedBySUT: Session.get('application') }],
  };

  Meteor.subscribe('grafanaDashboards', grafanaDashboardsQuery);

  let query = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
    ],
  };

  Meteor.subscribe('testRuns', 'testRunRequirementDetails', 50, query, () => {
    let testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      /* expand dashboards that have failed requirements */

      let hasFailedRequirement;

      _.each(testRun.benchmarks.dashboards, (benchmarkDashboard) => {
        hasFailedRequirement =
          _.has(benchmarkDashboard, 'meetsRequirement') &&
          benchmarkDashboard['meetsRequirement'] === false;
      });
    }
  });
});

Template.testRunRequirementsDetails.helpers({
  testRun() {
    return getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
  },
  hasMeetsRequirement() {
    return _.has(this, 'meetsRequirement');
  },
});

Template.requirementDashboard.onCreated(function () {
  this.dashboardHeaderCollapsed = new ReactiveVar(true);
});

Template.requirementDashboard.helpers({
  hasMeetsRequirement() {
    return _.has(this, 'meetsRequirement');
  },
  hasSnapshotUrl() {
    return _.has(this, 'snapshotUrl');
  },
  dashboardHeaderCollapsed() {
    return Template.instance().dashboardHeaderCollapsed.get();
  },
});

Template.requirementDashboard.events({
  'click div .view-benchmark-modal'(event, template) {
    event.preventDefault();

    let graphModalParams = {
      panelId:
        template.$(event.target).attr('panel-id') ?
          template.$(event.target).attr('panel-id')
        : template.$(event.target).children('.fa-eye').attr('panel-id'),
      dashboardId:
        template.$(event.target).attr('dashboard-id') ?
          template.$(event.target).attr('dashboard-id')
        : template.$(event.target).children('.fa-eye').attr('dashboard-id'),
      grafana:
        template.$(event.target).attr('grafana') ?
          template.$(event.target).attr('grafana')
        : template.$(event.target).children('.fa-eye').attr('grafana'),
      snapshotUrl:
        template.$(event.target).attr('snapshot-url') ?
          template.$(event.target).attr('snapshot-url')
        : template.$(event.target).children('.fa-eye').attr('snapshot-url'),
    };

    Modal.show('requirementGraphModal', graphModalParams);

    // $(".grafana-iframe").bind("load",function(){
    //     $(this).contents().find('.graph-legend-alias [title="Home"]').click();
    // });
  },
  'click div .dashboard-link'(event) {
    let dashboardUrl = $(event.target).attr('dashboard-url');
    window.open(dashboardUrl, '_blank');
  },
  'shown.bs.collapse .dashboard-collapse'() {
    Template.instance().dashboardHeaderCollapsed.set(false);
  },
  'hide.bs.collapse .dashboard-collapse'() {
    Template.instance().dashboardHeaderCollapsed.set(true);
  },
});

Template.requirementPanelContent.onCreated(function () {
  this.metricHeaderCollapsed = new ReactiveVar(this.data.metricHeaderCollapsed);
  this.showFilter = new ReactiveVar(false);
  this.selectedMetricName = new ReactiveVar(
    this.data.panel.requirementsCheck.targets.length > 0 ?
      this.data.panel.requirementsCheck.targets.sort(
        dynamicSort('-meetsRequirement'),
      )[this.data.panel.requirementsCheck.targets.length - 1].target
    : '',
  );

  Template.instance().showFilter.set(
    this.data.panel.requirementsCheck ?
      this.data.panel.requirementsCheck.targets.length > 10
    : this.data.panel.targets.length > 10,
  );
});

Template.requirementPanelContent.onRendered(function () {
  if (this.data.panel) {
    let targets =
      this.data.panel.requirementsCheck ?
        this.data.panel.requirementsCheck.targets
      : this.data.panel.targets;

    targets = targets.filter((target) => _.has(target, 'meetsRequirement'));

    let hasFailedRequirement = false;

    _.each(targets, (target) => {
      if (
        _.has(target, 'meetsRequirement') &&
        target['meetsRequirement'] === false
      )
        hasFailedRequirement = true;
    });

    // let dashboardLabelSlug = slugify(this.data.dashboardLabel);
    // let selector = `#panel-accordion-${dashboardLabelSlug}-${this.data.panel.panelId}-${this.data.panel.evaluateType}.panel-collapse.collapse`
    //
    //
    // if(hasFailedRequirement){
    //
    //     $(selector).collapse('show');
    //
    // }
  }
});

Template.requirementPanelContent.helpers({
  statusError() {
    return this.panel.requirementsCheck ?
        this.panel.requirementsCheck.status === 'ERROR'
      : this.panel.status === 'ERROR';
  },
  userHasPermission() {
    const user = Meteor.user();

    if (user) {
      const application = Applications.findOne({
        name: Session.get('application'),
      });

      if (application && application.team) {
        return (
          user.profile.memberOf.teams
            .map((team) => {
              return team;
            })
            .indexOf(application.team) !== -1 ||
          Roles.userHasRole(user._id, 'admin') ||
          Roles.userHasRole(user._id, 'super-admin')
        );
      } else {
        return (
          Roles.userHasRole(user._id, 'admin') ||
          Roles.userHasRole(user._id, 'super-admin')
        );
      }
    }
  },

  matchPattern() {
    const benchmark = Benchmarks.findOne({ _id: this.panel.benchmarkId });
    if (benchmark)
      return (
        benchmark.panel.matchPattern !== undefined &&
        this.panel.matchPattern !== undefined
      );
  },

  benchmark() {
    return Benchmarks.findOne({ _id: this.panel.benchmarkId });
  },
  requirementValue() {
    return this.panel.requirement.value;
  },
  panelTargets() {
    let panelTargets;
    if (this.panel && this.panel.requirementsCheck) {
      panelTargets = this.panel.requirementsCheck.targets;
    } else if (this.panel) {
      panelTargets = this.panel.targets;
    }
    return panelTargets.map((target) => {
      // Add dashboardLabel and panelTitle properties to target
      return Object.assign({}, target, {
        dashboardLabel: this.panel.dashboardLabel,
        panelTitle: this.panel.panelTitle.split('-').slice(1).join('-'),
        applicationDashboardIdPanelIdMetricName: `${this.panel.applicationDashboardId}${this.panel.panelId}${target.target}`,
      });
    });
  },
  selectedMetricName() {
    return Template.instance().selectedMetricName.get();
  },
  rowClass() {
    if (Template.instance().selectedMetricName.get()) {
      return function (item) {
        if (item.target === this.templateData.selectedMetricName) {
          return 'profile-selected';
        }
      };
    }
  },
  fields() {
    return [
      { key: 'target', label: 'Series' },
      {
        key: 'value',
        label: 'Value',
        cellClass: 'align-right-column',
        headerClass: 'align-right-column',
        // label: (value, object, key) =>  {
        //
        //     // const aggregation = this.panel.evaluateType.charAt(0).toUpperCase() + this.panel.evaluateType.slice(1);
        //     // return (this.panel.panelYAxesFormat !== '') ? `${aggregation} (${this.panel.panelYAxesFormat})` : '${aggregation}' ;
        //     return this.panel.panelYAxesFormat;
        //
        // }
        fn: (value) => {
          const rawValue = parseFloat(value);
          const parsedValue =
            (
              this.panel.panelYAxesFormat &&
              this.panel.panelYAxesFormat === 'percentunit'
            ) ?
              Math.round(rawValue * 10000) / 100
            : Math.round(rawValue * 100) / 100 || rawValue;

          const unit = getUnit(this.panel.panelYAxesFormat);

          if (
            this.panel.panelYAxesFormat &&
            this.panel.evaluateType !== 'fit'
          ) {
            return `${parsedValue} ${unit.format}`;
          } else {
            return `${parsedValue}`;
          }
        },
      },
      {
        key: 'meetsRequirement',
        label: 'Result',
        cellClass: 'align-center-column',
        headerClass: 'align-center-column',
        fn: (value, object) => {
          return new Spacebars.SafeString(requirementResult(object));
        },
      },
      {
        key: 'meetsRequirement',
        label: '',
        hidden: true,
        sortOrder: 0,
        sortDirection: 'descending',
        fn: (value, object) => {
          let result;
          result = object.meetsRequirement;
          let sortIndex;
          switch (result) {
            case true:
              sortIndex = 1;
              break;
            case false:
              sortIndex = 2;
              break;
            default:
              sortIndex = 0;
          }

          return sortIndex;
        },
      },
      {
        key: '_id',
        sortable: false,
        label: '',
        fn: (value, object) => {
          return new Spacebars.SafeString(
            `<i class="fa fa-bar-chart-o" id="open-trends" trend-metric-id="${object.applicationDashboardIdPanelIdMetricName}" trend-metric="${object.dashboardLabel} ${object.panelTitle} ${object.target}" data-tippy-content="View trend"></i>`,
          );
        },
      },
    ];
  },
  showFilter() {
    return Template.instance().showFilter.get();
  },
  metricNameFilter() {
    return slugify(
      `${this.comparisonType}-${this.panel.dashboardLabel}-${this.panel.panelTitle}`,
    );
  },
  settings() {
    return {
      rowsPerPage: 10,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      filters: [
        slugify(
          `${this.comparisonType}-${this.panel.dashboardLabel}-${this.panel.panelTitle}`,
        ),
      ],
    };
  },

  dashboardUrl() {
    const grafanaLabel = this.grafana;
    const dashboardUid = this.dashboardUid;

    let testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    let applicationDashboards = ApplicationDashboards.find({
      $and: [
        { application: FlowRouter.current().queryParams.systemUnderTest },
        { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
      ],
    }).fetch();

    /* Filter dashboard */

    let filteredDashboard = applicationDashboards.filter(
      (dashboard) =>
        dashboard.grafana === grafanaLabel &&
        dashboard.dashboardUid === dashboardUid,
    );

    let grafana = Grafanas.findOne({ label: filteredDashboard[0].grafana });

    let grafanaDashboard = GrafanaDashboards.findOne({
      $and: [
        { grafana: grafanaLabel },
        { name: filteredDashboard[0].dashboardName },
      ],
    });

    return renderGrafanaUrl(
      testRun,
      filteredDashboard[0],
      grafana,
      grafanaDashboard,
      true,
    );
  },
  metricHeaderCollapsed() {
    return Template.instance().metricHeaderCollapsed.get();
  },
});

Template.requirementPanelContent.events({
  'mouseenter .reactive-table tbody tr td i'(event) {
    event.preventDefault();

    tippy('[data-tippy-content]', {
      theme: 'light-border',
    });
  },
  'shown.bs.collapse .metric-collapse'(event) {
    event.stopPropagation();
    Template.instance().metricHeaderCollapsed.set(false);
  },
  'hide.bs.collapse .metric-collapse'(event) {
    event.stopPropagation();
    Template.instance().metricHeaderCollapsed.set(true);
  },

  'click .reactive-table tbody tr'(event) {
    // 'mouseenter .reactive-table tbody tr': function(event, template) {

    event.preventDefault();

    switch (event.target.id) {
      case 'open-trends':
        let encodedTrendMetric = encodeURIComponent(
          $(event.target).attr('trend-metric'),
        );
        let encodedTrendMetricId = encodeURIComponent(
          $(event.target).attr('trend-metric-id'),
        );

        const queryParams = {
          systemUnderTest: FlowRouter.current().queryParams.systemUnderTest,
          testEnvironment: FlowRouter.current().queryParams.testEnvironment,
          workload: FlowRouter.current().queryParams.workload,
          tab: 'trends',
          trendMetric: encodedTrendMetric,
          trendMetricId: encodedTrendMetricId,
        };

        let baseUrl = Meteor.absoluteUrl().slice(0, -1);
        let url = baseUrl + FlowRouter.path('testRuns', null, queryParams);

        window.open(url, '_blank');

        break;
      default:
        Template.instance().selectedMetricName.set(this.target);

        break;
    }
  },
});

Template.requirementGraphModal.helpers({
  url() {
    const grafanaLabel = this.grafana;
    const dashboardId = parseInt(this.dashboardId);

    let testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    /* Filter dashboard */

    let filteredDashboard = testRun.benchmarks.dashboards.filter(
      (dashboard) =>
        dashboard.grafana === grafanaLabel &&
        dashboard.dashboardId === dashboardId,
    );

    let grafana = Grafanas.findOne({ label: filteredDashboard[0].grafana });

    return renderGrafanaSnapshotPanelUrl(
      this.snapshotUrl,
      this.panelId,
      testRun,
      filteredDashboard[0],
      grafana,
    );
  },
});

const renderGrafanaSnapshotPanelUrl = (
  snapshotUrl,
  panelId,
  testRun,
  dashboard,
  grafana,
) => {
  let result;
  const start = new Date(testRun.start).getTime();
  const end = new Date(testRun.end).getTime();

  if (testRun && dashboard) {
    let variables = `&var-system_under_test=${testRun.application}&var-test_environment=${testRun.testEnvironment}`;
    if (dashboard.variables) {
      if (testRun.variables && testRun.variables.length > 0)
        dashboard = replaceDynamicVariableValues(dashboard, testRun);

      for (let v in dashboard.variables) {
        for (let l in dashboard.variables[v].values) {
          if (dashboard.variables[v])
            variables +=
              '&var-' +
              dashboard.variables[v].name +
              '=' +
              dashboard.variables[v].values[l];
        }
      }
    }

    let theme =
      Meteor.user().profile.theme ? Meteor.user().profile.theme : 'light';

    result = `${snapshotUrl}?orgId=${grafana.orgId}&panelId=${panelId}&viewPanel=${panelId}&fullscreen&from=${start}&to=${end}${variables}&theme=${theme}&kiosk`;
  }

  return result;
};
const requirementResult = (object) => {
  let result;

  result = object.meetsRequirement;

  let HTML;
  switch (result) {
    case true:
      HTML =
        '<i class="fa fa-check" style="color: green;" aria-hidden="true"></i>';
      break;
    case false:
      HTML =
        '<i class="fa fa-exclamation-circle" style="color: red;" aria-hidden="true"></i>';
      break;
    default:
      HTML =
        '<i class="fa fa-minus" style="color: lightgrey;" aria-hidden="true"></i>';
  }

  if (object.isArtificial) {
    HTML += `<i class="fa fa-info-circle reactive-table-icon" style="margin-left: 10px;" aria-hidden="true"   data-tippy-content="No data available, using default value from Service Level Indicator configuration"></i>`;
  }
  return HTML;
};
