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

/* eslint-disable meteor/no-session */
import { Grafanas } from './grafanas';
import { ApplicationDashboards } from './applicationDashboards';

export const ReportPanels = new Mongo.Collection('reportPanels');

const ReportPanelsSchema = new SimpleSchema({
  application: {
    type: String,
    index: 1,
    label: 'System under test',
    autoform: {
      defaultValue: function () {
        return Session.get('application') ? Session.get('application') : '';
      },
      readOnly: function () {
        return Session.get('application') !== null;
      },
      type: 'hidden',
    },
  },
  testType: {
    type: String,
    index: 1,
    label: 'Workload',
    autoform: {
      defaultValue: function () {
        return Session.get('testType') ? Session.get('testType') : '';
      },
      readOnly: function () {
        return Session.get('testType') !== null;
      },
      type: 'hidden',
    },
  },
  testEnvironment: {
    type: String,
    index: 1,
    autoform: {
      defaultValue: function () {
        return Session.get('testEnvironment')
          ? Session.get('testEnvironment')
          : '';
      },
      readOnly: function () {
        return Session.get('testEnvironment') !== null;
      },
      type: 'hidden',
    },
  },
  grafana: {
    type: String,
    autoform: {
      type: 'universe-select',
      create: true,
      createOnBlur: true,
      options: [],
      optionsMethod: 'getBenchmarkGrafanas',
      optionsMethodParams: function () {
        return {
          application: Session.get('application'),
          testEnvironment: Session.get('testEnvironment'),
        };
      },
      defaultValue: function () {
        return getDefaultGrafana();
      },
    },
  },
  dashboardLabel: {
    type: String,
    autoform: {
      type: function () {
        const defaultGrafana = getDefaultGrafana();

        if (
          AutoForm.getFieldValue(
            this.name.replace('dashboardLabel', 'grafana'),
          ) ||
          defaultGrafana !== undefined
        ) {
          return 'universe-select';
        } else {
          return 'hidden';
        }
      },
      create: true,
      createOnBlur: true,
      options: [],
      optionsMethod: 'getApplicationBenchmarkDashboardLabels',
      optionsMethodParams: function () {
        const defaultGrafana = getDefaultGrafana();

        if (
          AutoForm.getFieldValue(
            this.name.replace('dashboardLabel', 'grafana'),
          ) ||
          defaultGrafana !== undefined
        ) {
          return {
            grafanaLabel:
              AutoForm.getFieldValue(
                this.name.replace('dashboardLabel', 'grafana'),
              ) || defaultGrafana,
            application: Session.get('application'),
            testEnvironment: Session.get('testEnvironment'),
          };
        }
      },
    },
  },
  dashboardUid: {
    type: String,
    autoform: {
      type: 'hidden',
      value: function () {
        const defaultGrafana = getDefaultGrafana();

        if (
          (AutoForm.getFieldValue(
            this.name.replace('dashboardUid', 'grafana'),
          ) ||
            defaultGrafana !== undefined) &&
          AutoForm.getFieldValue(
            this.name.replace('dashboardUid', 'dashboardLabel'),
          )
        ) {
          return getDashboardUid(
            AutoForm.getFieldValue(
              this.name.replace('dashboardUid', 'grafana'),
            ) || defaultGrafana,
            AutoForm.getFieldValue(
              this.name.replace('dashboardUid', 'dashboardLabel'),
            ),
          );
        }
      },
    },
  },
  panel: {
    type: Object,
    label: 'Metric',
    autoform: {
      type: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace('panel', 'dashboardLabel'),
          ) !== undefined
        ) {
          return '';
        } else {
          return 'hidden';
        }
      },
    },
  },
  'panel.title': {
    type: String,
    autoform: {
      type: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace('panel.title', 'dashboardLabel'),
          ) !== undefined
        ) {
          return 'universe-select';
        } else {
          return 'hidden';
        }
      },
      create: true,
      createOnBlur: true,
      options: [],
      optionsMethod: 'getDashboardPanels',
      optionsMethodParams: function () {
        const defaultGrafana = getDefaultGrafana();

        if (
          (AutoForm.getFieldValue(
            this.name.replace('panel.title', 'grafana'),
          ) ||
            defaultGrafana !== undefined) &&
          AutoForm.getFieldValue(
            this.name.replace('panel.title', 'dashboardUid'),
          )
        )
          return {
            grafanaLabel:
              AutoForm.getFieldValue(
                this.name.replace('panel.title', 'grafana'),
              ) || defaultGrafana,
            dashboardUid: AutoForm.getFieldValue(
              this.name.replace('panel.title', 'dashboardUid'),
            ),
          };
      },
    },
  },
  'panel.id': {
    type: Number,
    autoform: {
      type: 'hidden',
      value: function () {
        const defaultGrafana = getDefaultGrafana();

        if (
          (AutoForm.getFieldValue(this.name.replace('panel.id', 'grafana')) ||
            defaultGrafana !== undefined) &&
          AutoForm.getFieldValue(
            this.name.replace('panel.id', 'dashboardLabel'),
          ) &&
          AutoForm.getFieldValue(this.name.replace('panel.id', 'panel.title'))
        )
          return getPanelId(
            AutoForm.getFieldValue(
              this.name.replace('panel.id', 'panel.title'),
            ),
          );
      },
    },
  },
  'panel.annotation': {
    type: String,
    optional: true,
    autoform: {
      type: function () {
        if (AutoForm.getFieldValue('panel.title') !== undefined) {
          return '';
        } else {
          return 'hidden';
        }
      },
    },
  },
  index: {
    type: Number,
    optional: true,
    autoform: {
      type: 'hidden',
    },
  },
  genericReportPanelId: {
    type: String,
    optional: true,
    autoform: {
      type: 'hidden',
    },
  },
});

const getDashboardUid = (grafanaLabel, dashboardLabel) => {
  const applicationDashboard = ApplicationDashboards.findOne({
    $and: [{ grafana: grafanaLabel }, { dashboardLabel: dashboardLabel }],
  });

  if (applicationDashboard) {
    return applicationDashboard.dashboardUid;
  }
};

const getPanelId = (panelTitle) => {
  return parseInt(panelTitle.replace(/^([0-9]+)-.*/, '$1'));
};

const getDefaultGrafana = () => {
  const grafanas = Grafanas.find({}).fetch();

  if (grafanas.length === 1) {
    return grafanas[0].label;
  } else {
    return undefined;
  }
};

ReportPanels.attachSchema(ReportPanelsSchema);

if (Meteor.isClient) {
  // Meteor.subscribe('reportPanels');
  window.ReportPanels = ReportPanels;
  window.ReportPanelsSchema = ReportPanelsSchema;
  Meteor.subscribe('grafanas');
}
