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
// noinspection RedundantIfStatementJS,JSIncompatibleTypesComparison

import { Meteor } from 'meteor/meteor';
import { GrafanaDashboards } from './grafanaDashboards';
import { ApplicationDashboards } from './applicationDashboards';
import { Grafanas } from './grafanas';
import { getUnit } from '../helpers/units';

export const Benchmarks = new Mongo.Collection('benchmarks');

export const BenchmarkSchema = new SimpleSchema({
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
    label: 'Dashboard',
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

  dashboardId: {
    type: Number,
    autoform: {
      type: 'hidden',
      value: function () {
        const defaultGrafana = getDefaultGrafana();

        if (
          (AutoForm.getFieldValue(
            this.name.replace('dashboardId', 'grafana'),
          ) ||
            defaultGrafana !==
              undefined) /*&& AutoForm.getFieldValue(this.name.replace('dashboardId', 'application'))*/ &&
          AutoForm.getFieldValue(
            this.name.replace('dashboardId', 'dashboardLabel'),
          )
        ) {
          return getDashboardId(
            AutoForm.getFieldValue(
              this.name.replace('dashboardId', 'grafana'),
            ) || defaultGrafana,
            AutoForm.getFieldValue(
              this.name.replace('dashboardId', 'application'),
            ),
            AutoForm.getFieldValue(
              this.name.replace('dashboardId', 'dashboardLabel'),
            ),
            AutoForm.getFieldValue(
              this.name.replace('dashboardId', 'testEnvironment'),
            ),
          );
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
            defaultGrafana !==
              undefined) /*&& AutoForm.getFieldValue(this.name.replace('dashboardUid', 'application'))*/ &&
          AutoForm.getFieldValue(
            this.name.replace('dashboardUid', 'dashboardLabel'),
          ) !== undefined
        ) {
          return getDashboardUid(
            AutoForm.getFieldValue(
              this.name.replace('dashboardUid', 'grafana'),
            ) || defaultGrafana,
            AutoForm.getFieldValue(
              this.name.replace('dashboardUid', 'application'),
            ),
            AutoForm.getFieldValue(
              this.name.replace('dashboardUid', 'dashboardLabel'),
            ),
            AutoForm.getFieldValue(
              this.name.replace('dashboardUid', 'testEnvironment'),
            ),
          );
        }
      },
    },
  },
  applicationDashboardId: {
    type: String,
    autoform: {
      type: 'hidden',
      value: function () {
        const defaultGrafana = getDefaultGrafana();

        if (
          (AutoForm.getFieldValue(
            this.name.replace('applicationDashboardId', 'grafana'),
          ) ||
            defaultGrafana !== undefined) &&
          AutoForm.getFieldValue(
            this.name.replace('applicationDashboardId', 'dashboardLabel'),
          ) !== undefined
        ) {
          return getApplicationDashboardId(
            AutoForm.getFieldValue(
              this.name.replace('applicationDashboardId', 'grafana'),
            ) || defaultGrafana,
            AutoForm.getFieldValue(
              this.name.replace('applicationDashboardId', 'application'),
            ),
            AutoForm.getFieldValue(
              this.name.replace('applicationDashboardId', 'dashboardLabel'),
            ),
            AutoForm.getFieldValue(
              this.name.replace('applicationDashboardId', 'testEnvironment'),
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
            this.name.replace('panel.title', 'application'),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace('panel.title', 'dashboardUid'),
          )
        )
          return {
            forKpi: true,
            grafanaLabel:
              AutoForm.getFieldValue(
                this.name.replace('panel.title', 'grafana'),
              ) || defaultGrafana,
            application: AutoForm.getFieldValue(
              this.name.replace('panel.title', 'application'),
            ),
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
  'panel.type': {
    type: String,
    autoform: {
      type: 'hidden',
      value: function () {
        const defaultGrafana = getDefaultGrafana();

        if (
          (AutoForm.getFieldValue(this.name.replace('panel.type', 'grafana')) ||
            defaultGrafana !== undefined) &&
          AutoForm.getFieldValue(
            this.name.replace('panel.type', 'dashboardUid'),
          ) &&
          AutoForm.getFieldValue(this.name.replace('panel.type', 'panel.id'))
        )
          return getPanelType(
            AutoForm.getFieldValue(
              this.name.replace('panel.type', 'grafana'),
            ) || defaultGrafana !== undefined,
            AutoForm.getFieldValue(
              this.name.replace('panel.type', 'dashboardUid'),
            ),
            AutoForm.getFieldValue(this.name.replace('panel.type', 'panel.id')),
          );
      },
    },
  },
  'panel.description': {
    type: String,
    optional: true,
    autoform: {
      type: 'hidden',
      value: function () {
        const defaultGrafana = getDefaultGrafana();

        if (
          (AutoForm.getFieldValue(
            this.name.replace('panel.description', 'grafana'),
          ) ||
            defaultGrafana !== undefined) &&
          AutoForm.getFieldValue(
            this.name.replace('panel.description', 'dashboardUid'),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace('panel.description', 'panel.id'),
          )
        )
          return getPanelDescription(
            AutoForm.getFieldValue(
              this.name.replace('panel.description', 'grafana'),
            ) || defaultGrafana,
            AutoForm.getFieldValue(
              this.name.replace('panel.description', 'dashboardUid'),
            ),
            AutoForm.getFieldValue(
              this.name.replace('panel.description', 'panel.id'),
            ),
          );
      },
    },
  },
  'panel.yAxesFormat': {
    type: String,
    optional: true,
    autoform: {
      type: 'hidden',
      value: function () {
        const defaultGrafana = getDefaultGrafana();

        if (
          (AutoForm.getFieldValue(
            this.name.replace('panel.yAxesFormat', 'grafana'),
          ) ||
            defaultGrafana !== undefined) &&
          AutoForm.getFieldValue(
            this.name.replace('panel.yAxesFormat', 'dashboardUid'),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace('panel.yAxesFormat', 'panel.id'),
          )
        )
          return getPanelFormat(
            AutoForm.getFieldValue(
              this.name.replace('panel.yAxesFormat', 'grafana'),
            ) || defaultGrafana,
            AutoForm.getFieldValue(
              this.name.replace('panel.yAxesFormat', 'dashboardUid'),
            ),
            AutoForm.getFieldValue(
              this.name.replace('panel.yAxesFormat', 'panel.id'),
            ),
          );
      },
    },
  },

  'panel.evaluateType': {
    type: String,
    label: 'Aggregation',
    autoform: {
      type: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace('panel.evaluateType', 'panel.title'),
          ) !== undefined
        ) {
          return '';
        } else {
          return 'hidden';
        }
      },
      defaultValue: 'avg',
      options: [
        { label: 'Average', value: 'avg' },
        { label: 'Maximum', value: 'max' },
        { label: 'Minimum', value: 'min' },
        { label: 'Last value', value: 'last' },
        { label: 'Slope', value: 'fit' },
      ],
    },
  },

  'panel.requirement': {
    type: Object,
    label: 'Service Level Objective',
    optional: true,
    autoform: {
      type: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace('panel.requirement', 'panel.title'),
          ) !== undefined
        ) {
          return '';
        } else {
          return 'hidden';
        }
      },
    },
  },
  'panel.requirement.operator': {
    type: String,
    label: 'Metric value should be',
    autoform: {
      type: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace('panel.requirement.operator', 'panel.title'),
          ) !== undefined
        ) {
          return '';
        } else {
          return 'hidden';
        }
      },
      options: [
        { label: 'Greater than', value: 'gt' },
        { label: 'Less than', value: 'lt' },
      ],
    },
    optional: true,
  },
  'panel.requirement.value': {
    type: Number,
    decimal: true,
    optional: true,
    autoform: {
      optional: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace(
              'panel.requirement.value',
              'panel.requirement.operator',
            ),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace(
              'panel.requirement.value',
              'panel.requirement.operator',
            ),
          ) !== undefined
        ) {
          return false;
        } else {
          return true;
        }
      },
      type: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace(
              'panel.requirement.value',
              'panel.requirement.operator',
            ),
          ) !== undefined
        ) {
          return '';
        } else {
          return 'hidden';
        }
      },
      placeholder: function () {
        const defaultGrafana = getDefaultGrafana();

        if (
          (AutoForm.getFieldValue(
            this.name.replace('panel.requirement.value', 'grafana'),
          ) ||
            defaultGrafana !== undefined) &&
          AutoForm.getFieldValue(
            this.name.replace('panel.requirement.value', 'dashboardUid'),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace('panel.requirement.value', 'panel.id'),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace('panel.requirement.value', 'panel.evaluateType'),
          )
        )
          return getPlaceholderPanelFormat(
            AutoForm.getFieldValue(
              this.name.replace('panel.requirement.value', 'grafana'),
            ) || defaultGrafana,
            AutoForm.getFieldValue(
              this.name.replace('panel.requirement.value', 'dashboardUid'),
            ),
            AutoForm.getFieldValue(
              this.name.replace('panel.requirement.value', 'panel.id'),
            ),
            AutoForm.getFieldValue(
              this.name.replace(
                'panel.requirement.value',
                'panel.evaluateType',
              ),
            ),
          );
      },
    },
  },
  'panel.benchmark': {
    type: Object,
    label: 'Comparison',
    optional: true,
    autoform: {
      type: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace('panel.benchmark', 'panel.title'),
          ) !== undefined
        ) {
          return '';
        } else {
          return 'hidden';
        }
      },
    },
  },

  'panel.benchmark.operator': {
    type: String,
    label: 'Allow',
    autoform: {
      type: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace('panel.benchmark.operator', 'panel.title'),
          ) !== undefined
        ) {
          return '';
        } else {
          return 'hidden';
        }
      },
      options: [
        { label: 'positive', value: 'pst' },
        { label: 'negative', value: 'ngt' },
        { label: 'positive (%)', value: 'pst-pct' },
        { label: 'negative (%)', value: 'ngt-pct' },
      ],
    },
    optional: true,
  },
  'panel.benchmark.value': {
    autoform: {
      optional: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace(
              'panel.benchmark.value',
              'panel.benchmark.operator',
            ),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace(
              'panel.benchmark.value',
              'panel.benchmark.operator',
            ),
          ) !== undefined
        ) {
          return false;
        } else {
          return true;
        }
      },
      type: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace(
              'panel.benchmark.value',
              'panel.benchmark.operator',
            ),
          ) !== undefined
        ) {
          return '';
        } else {
          return 'hidden';
        }
      },
      label: function () {
        if (
          AutoForm.getFieldValue('panel.benchmark.operator') === 'pst-pct' ||
          AutoForm.getFieldValue('panel.benchmark.operator') === 'ngt-pct'
        ) {
          return 'relative deviation of';
        } else {
          return 'deviation of';
        }
      },
      placeholder: function () {
        if (
          AutoForm.getFieldValue('panel.benchmark.operator') === 'pst-pct' ||
          AutoForm.getFieldValue('panel.benchmark.operator') === 'ngt-pct'
        ) {
          return '%';
        } else {
          const defaultGrafana = getDefaultGrafana();

          if (
            (AutoForm.getFieldValue(
              this.name.replace('panel.benchmark.value', 'grafana'),
            ) ||
              defaultGrafana !== undefined) &&
            AutoForm.getFieldValue(
              this.name.replace('panel.benchmark.value', 'dashboardUid'),
            ) &&
            AutoForm.getFieldValue(
              this.name.replace('panel.benchmark.value', 'panel.id'),
            ) &&
            AutoForm.getFieldValue(
              this.name.replace('panel.benchmark.value', 'panel.evaluateType'),
            )
          )
            return getPlaceholderPanelFormat(
              AutoForm.getFieldValue(
                this.name.replace('panel.benchmark.value', 'grafana'),
              ) || defaultGrafana,
              AutoForm.getFieldValue(
                this.name.replace('panel.benchmark.value', 'dashboardUid'),
              ),
              AutoForm.getFieldValue(
                this.name.replace('panel.benchmark.value', 'panel.id'),
              ),
              AutoForm.getFieldValue(
                this.name.replace(
                  'panel.benchmark.value',
                  'panel.evaluateType',
                ),
              ),
            );
        }
      },
    },
    type: Number,
    decimal: true,
    optional: true,
  },
  'panel.benchmark.absoluteFailureThreshold': {
    label: 'Fail only if absolute deviation exceeds',
    type: Number,
    decimal: true,
    optional: true,
    autoform: {
      type: function () {
        if (
          AutoForm.getFieldValue('panel.benchmark.operator') === 'pst-pct' ||
          AutoForm.getFieldValue('panel.benchmark.operator') === 'ngt-pct'
        ) {
          return '';
        } else {
          return 'hidden';
        }
      },
      placeholder: function () {
        const defaultGrafana = getDefaultGrafana();

        if (
          (AutoForm.getFieldValue(
            this.name.replace(
              'panel.benchmark.absoluteFailureThreshold',
              'grafana',
            ),
          ) ||
            defaultGrafana !== undefined) &&
          AutoForm.getFieldValue(
            this.name.replace(
              'panel.benchmark.absoluteFailureThreshold',
              'dashboardUid',
            ),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace(
              'panel.benchmark.absoluteFailureThreshold',
              'panel.evaluateType',
            ),
          )
        )
          return getPlaceholderPanelFormat(
            AutoForm.getFieldValue(
              this.name.replace(
                'panel.benchmark.absoluteFailureThreshold',
                'grafana',
              ),
            ) || defaultGrafana !== undefined,
            AutoForm.getFieldValue(
              this.name.replace(
                'panel.benchmark.absoluteFailureThreshold',
                'dashboardUid',
              ),
            ),
            AutoForm.getFieldValue(
              this.name.replace(
                'panel.benchmark.absoluteFailureThreshold',
                'panel.evaluateType',
              ),
            ),
          );
      },
    },
  },

  genericCheckId: {
    type: String,
    optional: true,
    autoform: {
      type: 'hidden',
    },
  },
  valid: {
    type: Boolean,
    optional: true,
    autoform: {
      type: 'hidden',
      defaultValue: true,
    },
  },
  reasonNotValid: {
    type: String,
    optional: true,
    autoform: {
      type: 'hidden',
      defaultValue: '',
    },
  },
  'panel.excludeRampUpTime': {
    type: Boolean,
    label: 'Exclude ramp up time when evaluating test run',
    autoform: {
      type: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace(
              'panel.excludeRampUpTime',
              'panel.benchmark.operator',
            ),
          ) !== undefined ||
          AutoForm.getFieldValue(
            this.name.replace(
              'panel.excludeRampUpTime',
              'panel.requirement.operator',
            ),
          ) !== undefined
        ) {
          return '';
        } else {
          return 'hidden';
        }
      },
      defaultValue: true,
    },
  },
  'panel.averageAll': {
    type: Boolean,
    label: 'Average all metric series when comparing test runs',
    optional: true,
    autoform: {
      type: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace('panel.averageAll', 'panel.benchmark.operator'),
          ) !== undefined
        ) {
          return '';
        } else {
          return 'hidden';
        }
      },
      defaultValue: false,
    },
  },

  'panel.matchPattern': {
    label: 'Only apply to series matching regex pattern',
    type: String,
    optional: true,
    autoform: {
      type: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace('panel.matchPattern', 'panel.benchmark.operator'),
          ) !== undefined ||
          AutoForm.getFieldValue(
            this.name.replace(
              'panel.matchPattern',
              'panel.requirement.operator',
            ),
          ) !== undefined
        ) {
          return '';
        } else {
          return 'hidden';
        }
      },
    },
  },

  'panel.validateWithDefaultIfNoData': {
    label: 'Evaluate default value if no data available',
    type: Boolean,
    optional: true,
    autoform: {
      type: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace(
              'panel.validateWithDefaultIfNoData',
              'panel.benchmark.operator',
            ),
          ) !== undefined ||
          AutoForm.getFieldValue(
            this.name.replace(
              'panel.validateWithDefaultIfNoData',
              'panel.requirement.operator',
            ),
          ) !== undefined
        ) {
          return '';
        } else {
          return 'hidden';
        }
      },
      defaultValue: false,
    },
  },
  'panel.validateWithDefaultIfNoDataValue': {
    label: 'Default value',
    type: Number,
    optional: true,
    autoform: {
      type: function () {
        if (
          AutoForm.getFieldValue('panel.validateWithDefaultIfNoData') === true
        ) {
          return '';
        } else {
          return 'hidden';
        }
      },
      placeholder: function () {
        const defaultGrafana = getDefaultGrafana();

        if (
          (AutoForm.getFieldValue(
            this.name.replace(
              'panel.validateWithDefaultIfNoDataValue',
              'grafana',
            ),
          ) ||
            defaultGrafana !== undefined) &&
          AutoForm.getFieldValue(
            this.name.replace(
              'panel.validateWithDefaultIfNoDataValue',
              'dashboardUid',
            ),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace(
              'panel.validateWithDefaultIfNoDataValue',
              'panel.id',
            ),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace(
              'panel.validateWithDefaultIfNoDataValue',
              'panel.evaluateType',
            ),
          )
        )
          return getPlaceholderPanelFormat(
            AutoForm.getFieldValue(
              this.name.replace(
                'panel.validateWithDefaultIfNoDataValue',
                'grafana',
              ),
            ) || defaultGrafana !== undefined,
            AutoForm.getFieldValue(
              this.name.replace(
                'panel.validateWithDefaultIfNoDataValue',
                'dashboardUid',
              ),
            ),
            AutoForm.getFieldValue(
              this.name.replace(
                'panel.validateWithDefaultIfNoDataValue',
                'panel.id',
              ),
            ),
            AutoForm.getFieldValue(
              this.name.replace(
                'validateWithDefaultIfNoDataValue',
                'panel.evaluateType',
              ),
            ),
          );
      },
    },
  },
  updateTestRuns: {
    label: 'Update existing test runs',
    type: Boolean,
    optional: true,
    autoform: {
      defaultValue: false,
      type: 'hidden',
    },
  },
});

const getDefaultGrafana = () => {
  const grafanas = Grafanas.find({}).fetch();

  if (grafanas.length === 1) {
    return grafanas[0].label;
  } else {
    return undefined;
  }
};

const getDashboardId = (
  grafanaLabel,
  application,
  dashboardLabel,
  testEnvironment,
) => {
  const applicationDashboard = ApplicationDashboards.findOne({
    $and: [
      { grafana: grafanaLabel },
      { application: application },
      { testEnvironment: testEnvironment },
      { dashboardLabel: dashboardLabel },
    ],
  });

  if (applicationDashboard) {
    return applicationDashboard.dashboardId;
  }
};

const getDashboardUid = (
  grafanaLabel,
  application,
  dashboardLabel,
  testEnvironment,
) => {
  const applicationDashboard = ApplicationDashboards.findOne({
    $and: [
      { grafana: grafanaLabel },
      { application: application },
      { testEnvironment: testEnvironment },
      { dashboardLabel: dashboardLabel },
    ],
  });

  if (applicationDashboard) {
    return applicationDashboard.dashboardUid;
  }
};

const getApplicationDashboardId = (
  grafanaLabel,
  application,
  dashboardLabel,
  testEnvironment,
) => {
  const applicationDashboard = ApplicationDashboards.findOne({
    $and: [
      { grafana: grafanaLabel },
      { application: application },
      { testEnvironment: testEnvironment },
      { dashboardLabel: dashboardLabel },
    ],
  });

  if (applicationDashboard) {
    return applicationDashboard._id;
  }
};

const getPanelDescription = (grafanaLabel, dashboardUid, panelId) => {
  const grafanaDashboard = GrafanaDashboards.findOne({
    $and: [{ grafana: grafanaLabel }, { uid: dashboardUid }],
  });

  if (grafanaDashboard) {
    const panelIndex = grafanaDashboard.panels
      .map((panel) => {
        return panel.id;
      })
      .indexOf(panelId);
    if (panelIndex !== -1)
      return grafanaDashboard.panels[panelIndex].description;
  }
};

const getPanelFormat = (grafanaLabel, dashboardUid, panelId) => {
  const grafanaDashboard = GrafanaDashboards.findOne({
    $and: [{ grafana: grafanaLabel }, { uid: dashboardUid }],
  });

  if (grafanaDashboard) {
    const panelIndex = grafanaDashboard.panels
      .map((panel) => {
        return panel.id;
      })
      .indexOf(panelId);
    if (panelIndex !== -1)
      return grafanaDashboard.panels[panelIndex].yAxesFormat
        ? getUnit(grafanaDashboard.panels[panelIndex].yAxesFormat).id
        : undefined;
  }
};
const getPlaceholderPanelFormat = (
  grafanaLabel,
  dashboardUid,
  panelId,
  evaluateType,
) => {
  const grafanaDashboard = GrafanaDashboards.findOne({
    $and: [{ grafana: grafanaLabel }, { uid: dashboardUid }],
  });

  if (grafanaDashboard) {
    const panelIndex = grafanaDashboard.panels
      .map((panel) => {
        return panel.id;
      })
      .indexOf(panelId);
    if (panelIndex !== -1)
      return evaluateType === 'fit'
        ? '%'
        : grafanaDashboard.panels[panelIndex].yAxesFormat === 'percentunit'
          ? 'Percent unit (0.0-1.0)'
          : grafanaDashboard.panels[panelIndex].yAxesFormat
            ? getUnit(grafanaDashboard.panels[panelIndex].yAxesFormat).name
            : '';
  }
};

const getPanelType = (grafanaLabel, dashboardUid, panelId) => {
  const grafanaDashboard = GrafanaDashboards.findOne({
    $and: [{ grafana: grafanaLabel }, { uid: dashboardUid }],
  });

  if (grafanaDashboard) {
    const panelIndex = grafanaDashboard.panels
      .map((panel) => {
        return panel.id;
      })
      .indexOf(panelId);
    if (panelIndex !== -1) return grafanaDashboard.panels[panelIndex].type;
  }
};

const getPanelId = (panelTitle) => {
  return parseInt(panelTitle.replace(/^([0-9]+)-.*/, '$1'));
};

Benchmarks.attachSchema(BenchmarkSchema);

if (Meteor.isClient) {
  // Meteor.subscribe('grafanaDashboards', grafanaDashboardsQuery);
  Meteor.subscribe('grafanas');
  window.Benchmarks = Benchmarks;
  window.BenchmarkSchema = BenchmarkSchema;

  // noinspection JSCheckFunctionSignatures
  AutoForm.addHooks(['editBenchmarks', 'addBenchmarks'], {
    onSuccess: function (formType) {
      let doc;

      if (formType === 'method') {
        doc = this.insertDoc;
      } else {
        doc = this.updateDoc.$set;
      }
      return doc;
    },
  }, false);
}
