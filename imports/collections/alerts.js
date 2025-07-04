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

/* eslint-disable meteor/no-session,no-useless-escape */
// noinspection RegExpRedundantEscape

import { Meteor } from 'meteor/meteor';
import { GrafanaDashboards } from './grafanaDashboards';
import { ApplicationDashboards } from './applicationDashboards';
import _ from 'lodash';

export const Alerts = new Mongo.Collection('alerts');

const AlertSchema = new SimpleSchema({
  application: {
    type: String,
    label: 'System under test',
    autoform: {
      defaultValue: function () {
        return Session.get('application') ? Session.get('application') : '';
      },
      readOnly: function () {
        return Session.get('application') !== null;
      },
    },
  },

  testEnvironment: {
    type: String,
    autoform: {
      defaultValue: function () {
        return Session.get('testEnvironment')
          ? Session.get('testEnvironment')
          : '';
      },
      readOnly: function () {
        return Session.get('testEnvironment') !== null;
      },
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
    },
  },
  dashboardLabel: {
    type: String,
    autoform: {
      type: 'universe-select',
      create: true,
      createOnBlur: true,
      options: [],
      optionsMethod: 'getApplicationBenchmarkDashboardLabels',
      optionsMethodParams: function () {
        if (
          AutoForm.getFieldValue(this.name.replace('dashboardLabel', 'grafana'))
        ) {
          return {
            influxDbOnly: true,
            grafanaLabel: AutoForm.getFieldValue(
              this.name.replace('dashboardLabel', 'grafana'),
            ),
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
        if (
          AutoForm.getFieldValue(
            this.name.replace('dashboardUid', 'grafana'),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace('dashboardUid', 'application'),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace('dashboardUid', 'dashboardLabel'),
          )
        ) {
          return getDashboardUid(
            AutoForm.getFieldValue(
              this.name.replace('dashboardUid', 'grafana'),
            ),
            AutoForm.getFieldValue(
              this.name.replace('dashboardUid', 'application'),
            ),
            AutoForm.getFieldValue(
              this.name.replace('dashboardUid', 'dashboardLabel'),
            ),
          );
        }
      },
    },
  },
  templateId: {
    type: String,
    autoform: {
      defaultValue: 'generic_mean_alert',
      options: [
        { label: 'generic_mean_alert', value: 'generic_mean_alert' },
        {
          label: 'generic_derivative_alert',
          value: 'generic_derivative_alert',
        },
        {
          label: 'generic_compare_fields_alert',
          value: 'generic_compare_fields_alert',
        },
      ],
    },
  },

  panelTitle: {
    type: String,
    autoform: {
      type: 'universe-select',
      create: true,
      createOnBlur: true,
      options: [],
      optionsMethod: 'getDashboardPanels',
      optionsMethodParams: function () {
        if (
          AutoForm.getFieldValue(this.name.replace('panelTitle', 'grafana')) &&
          AutoForm.getFieldValue(
            this.name.replace('panelTitle', 'application'),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace('panelTitle', 'dashboardLabel'),
          )
        )
          return {
            grafanaLabel: AutoForm.getFieldValue(
              this.name.replace('panelTitle', 'grafana'),
            ),
            application: AutoForm.getFieldValue(
              this.name.replace('panelTitle', 'application'),
            ),
            dashboardLabel: AutoForm.getFieldValue(
              this.name.replace('panelTitle', 'dashboardLabel'),
            ),
          };
      },
    },
  },
  panelId: {
    type: Number,
    autoform: {
      type: 'hidden',
      value: function () {
        if (
          AutoForm.getFieldValue(this.name.replace('panelId', 'grafana')) &&
          AutoForm.getFieldValue(
            this.name.replace('panelId', 'dashboardLabel'),
          ) &&
          AutoForm.getFieldValue(this.name.replace('panelId', 'panelTitle'))
        )
          return getPanelId(
            AutoForm.getFieldValue(this.name.replace('panelId', 'panelTitle')),
          );
      },
    },
  },
  panelDb: {
    type: String,
    optional: true,
    autoform: {
      // type: "hidden",
      defaultValue: function () {
        if (
          AutoForm.getFieldValue(this.name.replace('panelDb', 'grafana')) &&
          AutoForm.getFieldValue(this.name.replace('panelDb', 'application')) &&
          AutoForm.getFieldValue(
            this.name.replace('panelDb', 'testEnvironment'),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace('panelDb', 'dashboardUid'),
          ) &&
          AutoForm.getFieldValue(this.name.replace('panelDb', 'panelId'))
        )
          return getDb(
            AutoForm.getFieldValue(this.name.replace('panelDb', 'grafana')),
            AutoForm.getFieldValue(this.name.replace('panelDb', 'application')),
            AutoForm.getFieldValue(
              this.name.replace('panelDb', 'testEnvironment'),
            ),
            AutoForm.getFieldValue(
              this.name.replace('panelDb', 'dashboardUid'),
            ),
            AutoForm.getFieldValue(this.name.replace('panelDb', 'panelId')),
          );
      },
    },
  },

  measurement: {
    type: String,
    optional: true,
    autoform: {
      // type: "hidden",
      defaultValue: function () {
        if (
          AutoForm.getFieldValue(this.name.replace('measurement', 'grafana')) &&
          AutoForm.getFieldValue(
            this.name.replace('measurement', 'application'),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace('measurement', 'testEnvironment'),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace('measurement', 'dashboardUid'),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace('measurement', 'dashboardLabel'),
          ) &&
          AutoForm.getFieldValue(this.name.replace('measurement', 'panelId'))
        )
          return getPanelTarget(
            AutoForm.getFieldValue(this.name.replace('measurement', 'grafana')),
            AutoForm.getFieldValue(
              this.name.replace('measurement', 'application'),
            ),
            AutoForm.getFieldValue(
              this.name.replace('measurement', 'testEnvironment'),
            ),
            AutoForm.getFieldValue(
              this.name.replace('measurement', 'dashboardUid'),
            ),
            AutoForm.getFieldValue(
              this.name.replace('measurement', 'dashboardLabel'),
            ),
            AutoForm.getFieldValue(this.name.replace('measurement', 'panelId')),
            'measurement',
          );
      },
    },
  },

  rp: {
    type: String,
    optional: true,
    autoform: {
      // type: "hidden",
      defaultValue: function () {
        if (
          AutoForm.getFieldValue(this.name.replace('rp', 'grafana')) &&
          AutoForm.getFieldValue(this.name.replace('rp', 'application')) &&
          AutoForm.getFieldValue(this.name.replace('rp', 'testEnvironment')) &&
          AutoForm.getFieldValue(this.name.replace('rp', 'dashboardUid')) &&
          AutoForm.getFieldValue(this.name.replace('rp', 'dashboardLabel')) &&
          AutoForm.getFieldValue(this.name.replace('rp', 'panelId'))
        )
          return getPanelTarget(
            AutoForm.getFieldValue(this.name.replace('rp', 'grafana')),
            AutoForm.getFieldValue(this.name.replace('rp', 'application')),
            AutoForm.getFieldValue(this.name.replace('rp', 'testEnvironment')),
            AutoForm.getFieldValue(this.name.replace('rp', 'dashboardUid')),
            AutoForm.getFieldValue(this.name.replace('rp', 'dashboardLabel')),
            AutoForm.getFieldValue(this.name.replace('rp', 'panelId')),
            'rp',
          );
      },
    },
  },
  field: {
    type: String,
    optional: true,
    autoform: {
      // type: "hidden",
      defaultValue: function () {
        if (
          AutoForm.getFieldValue(this.name.replace('field', 'grafana')) &&
          AutoForm.getFieldValue(this.name.replace('field', 'application')) &&
          AutoForm.getFieldValue(
            this.name.replace('field', 'testEnvironment'),
          ) &&
          AutoForm.getFieldValue(this.name.replace('field', 'dashboardUid')) &&
          AutoForm.getFieldValue(
            this.name.replace('field', 'dashboardLabel'),
          ) &&
          AutoForm.getFieldValue(this.name.replace('field', 'panelId'))
        )
          return getPanelTarget(
            AutoForm.getFieldValue(this.name.replace('field', 'grafana')),
            AutoForm.getFieldValue(this.name.replace('field', 'application')),
            AutoForm.getFieldValue(
              this.name.replace('field', 'testEnvironment'),
            ),
            AutoForm.getFieldValue(this.name.replace('field', 'dashboardUid')),
            AutoForm.getFieldValue(
              this.name.replace('field', 'dashboardLabel'),
            ),
            AutoForm.getFieldValue(this.name.replace('field', 'panelId')),
            'field',
          );
      },
    },
  },
  whereFilter: {
    type: String,
    optional: true,
    autoform: {
      // type: "hidden",
      defaultValue: function () {
        if (
          AutoForm.getFieldValue(this.name.replace('whereFilter', 'grafana')) &&
          AutoForm.getFieldValue(
            this.name.replace('whereFilter', 'application'),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace('whereFilter', 'testEnvironment'),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace('whereFilter', 'dashboardUid'),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace('whereFilter', 'dashboardLabel'),
          ) &&
          AutoForm.getFieldValue(this.name.replace('whereFilter', 'panelId'))
        )
          return getPanelTarget(
            AutoForm.getFieldValue(this.name.replace('whereFilter', 'grafana')),
            AutoForm.getFieldValue(
              this.name.replace('whereFilter', 'application'),
            ),
            AutoForm.getFieldValue(
              this.name.replace('whereFilter', 'testEnvironment'),
            ),
            AutoForm.getFieldValue(
              this.name.replace('whereFilter', 'dashboardUid'),
            ),
            AutoForm.getFieldValue(
              this.name.replace('whereFilter', 'dashboardLabel'),
            ),
            AutoForm.getFieldValue(this.name.replace('whereFilter', 'panelId')),
            'whereFilter',
          );
      },
    },
  },

  alertId: {
    type: String,
    optional: true,
    autoform: {
      defaultValue: function () {
        if (AutoForm.getFieldValue(this.name.replace('alertId', 'panelTitle')))
          return (
            AutoForm.getFieldValue(
              this.name.replace('alertId', 'application'),
            ) +
            '-' +
            AutoForm.getFieldValue(
              this.name.replace('alertId', 'testEnvironment'),
            ) +
            '-' +
            AutoForm.getFieldValue(this.name.replace('alertId', 'panelTitle'))
              .replace(/[0-9]+-(.*)/g, '$1')
              .replace(/ /g, '-')
          );
      },
    },
  },

  alertOperator: {
    type: String,
    label: 'Alert when metric is',
    autoform: {
      options: [
        { label: 'Greater than', value: '>' },
        { label: 'Less than', value: '<' },
        { label: 'Equal to', value: '==' },
        { label: 'Not equal to', value: '!=' },
      ],
    },
  },
  alertValue: {
    type: String,
  },
  period: {
    label: 'Evaluate period',
    type: String,
    autoform: {
      defaultValue: '1m',
    },
  },
  interval: {
    label: 'Evaluate every',
    type: String,
    autoform: {
      defaultValue: '1m',
    },
  },
  enabled: {
    type: Boolean,
    autoform: {
      defaultValue: true,
    },
  },
  errorMessage: {
    type: String,
    optional: true,
    autoform: {
      type: 'hidden',
    },
  },
});

const getDashboardUid = (grafanaLabel, application, dashboardLabel) => {
  const applicationDashboard = ApplicationDashboards.findOne({
    $and: [
      { grafana: grafanaLabel },
      { application: application },
      { dashboardLabel: dashboardLabel },
    ],
  });

  if (applicationDashboard) {
    return applicationDashboard.dashboardUid;
  }
};

const getPanelTarget = (
  grafana,
  application,
  testEnvironment,
  dashboardUid,
  dashboardLabel,
  panelId,
  attribute,
) => {
  const grafanaDashboard = GrafanaDashboards.findOne({
    $and: [{ grafana: grafana }, { uid: dashboardUid }],
  });

  const panelIndex = grafanaDashboard.panels
    .map((panel) => panel.id)
    .indexOf(panelId);

  if (attribute === 'whereFilter') {
    const applicationDashboard = ApplicationDashboards.findOne({
      $and: [
        { grafana: grafana },
        { application: application },
        { dashboardUid: dashboardUid },
        { dashboardLabel: dashboardLabel },
      ],
    });

    _.each(applicationDashboard.variables, (variable) => {
      const placeholder = new RegExp('perfana-' + variable.name, 'g');

      /* if multiple values for variable, concatenate them like {value1,value2,value3} */

      if (variable.values.length > 1) {
        let multipleValues = '(';

        _.each(variable.values, function (value, valueIndex) {
          multipleValues += value;
          if (valueIndex < variable.values.length - 1) multipleValues += '|';
        });

        multipleValues += ')';

        grafanaDashboard.panels[panelIndex].targets[0][attribute] =
          grafanaDashboard.panels[panelIndex].targets[0][attribute].replace(
            placeholder,
            multipleValues,
          );
      } else {
        grafanaDashboard.panels[panelIndex].targets[0][attribute] =
          grafanaDashboard.panels[panelIndex].targets[0][attribute].replace(
            placeholder,
            variable.values[0],
          );
      }
    });

    /* remove dynamic variables */

    const dynamicVariablesPattern = new RegExp(
      '\\"[^\\"]+\\" =~ \\/\\^\\$[^\\$]+\\$\\/( AND )?',
      'g',
    );

    grafanaDashboard.panels[panelIndex].targets[0][attribute] =
      grafanaDashboard.panels[panelIndex].targets[0][attribute].replace(
        dynamicVariablesPattern,
        '',
      );

    /* remove dangling AND */

    grafanaDashboard.panels[panelIndex].targets[0][attribute] =
      grafanaDashboard.panels[panelIndex].targets[0][attribute].replace(
        /(.*) AND $/,
        '$1',
      );

    const tagsPattern = new RegExp('(\"[^\"]+\")', 'g');

    grafanaDashboard.panels[panelIndex].targets[0][attribute] =
      grafanaDashboard.panels[panelIndex].targets[0][attribute].replace(
        tagsPattern,
        'isPresent($1) AND $1',
      );
  }

  if (attribute === 'rp') {
    /* replace default with autogen */
    grafanaDashboard.panels[panelIndex].targets[0][attribute] =
      grafanaDashboard.panels[panelIndex].targets[0][attribute].replace(
        'default',
        'autogen',
      );
  }

  return grafanaDashboard.panels[panelIndex].targets[0][attribute];
};

const getDb = (
  grafana,
  application,
  testEnvironment,
  dashboardUid,
  panelId,
) => {
  const grafanaDashboard = GrafanaDashboards.findOne({
    $and: [{ grafana: grafana }, { uid: dashboardUid }],
  });

  const panelIndex = grafanaDashboard.panels
    .map((panel) => panel.id)
    .indexOf(panelId);

  return grafanaDashboard.panels[panelIndex].datasourceDatabase;
};

const getPanelId = (panelTitle) => {
  return parseInt(panelTitle.replace(/^([0-9]+)-.*/, '$1'));
};

Alerts.attachSchema(AlertSchema);

if (Meteor.isClient) {
  // Meteor.subscribe('grafanaDashboards', grafanaDashboardsQuery);
  // Meteor.subscribe('applicationDashboards');
  window.Alerts = Alerts;
}
