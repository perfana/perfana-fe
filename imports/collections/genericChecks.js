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
// noinspection JSIncompatibleTypesComparison

import { Session } from 'meteor/session';
import { Meteor } from 'meteor/meteor';
import { GrafanaDashboards } from './grafanaDashboards';
import { Grafanas } from './grafanas';
import { getUnit } from '../helpers/units';

export const GenericChecks = new Mongo.Collection('genericChecks');

const GenericChecksSchema = new SimpleSchema({
  profile: {
    type: String,
    autoform: {
      defaultValue: () => {
        return Session.get('profileName') ? Session.get('profileName') : '';
      },
      readonly: () => {
        return Session.get('profileReadOnly') === true;
      },
      custom: () => {
        if (Session.get('profileReadOnly') === true) {
          setTimeout(() => {
            $('select[name="profile"]').prop('disabled', true);
            $('input[name="profile"]').attr(
              'title',
              'This cannot be changed for default Perfana profiles',
            );
            $('input[name="profile"]').attr('style', 'color: grey !important;');
          }, 500);
        }
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
      optionsMethod: 'getGrafanas',
      defaultValue: function () {
        return getDefaultGrafana();
      },
    },
  },
  addForWorkloadsMatchingRegex: {
    type: String,
    autoform: {
      defaultValue: '.*',
    },
  },
  dashboardName: {
    type: String,
    autoform: {
      type: function () {
        const defaultGrafana = getDefaultGrafana();

        if (
          AutoForm.getFieldValue(
            this.name.replace('dashboardName', 'grafana'),
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
      optionsMethod: 'getAutoconfigGrafanaDashboards',
      optionsMethodParams: function () {
        const defaultGrafana = getDefaultGrafana();
        if (
          AutoForm.getFieldValue(
            this.name.replace('dashboardName', 'grafana'),
          ) ||
          defaultGrafana !==
            undefined /*&& AutoForm.getFieldValue(this.name.replace('dashboardName', 'profile'))*/
        ) {
          return {
            grafanaLabel:
              AutoForm.getFieldValue(
                this.name.replace('dashboardName', 'grafana'),
              ) || defaultGrafana,
            profile:
              Session.get(
                'profileName',
              ) /*profile: AutoForm.getFieldValue(this.name.replace('dashboardName', 'profile'))*/,
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
            this.name.replace('dashboardUid', 'dashboardName'),
          )
        ) {
          return getDashboardUid(
            AutoForm.getFieldValue(
              this.name.replace('dashboardUid', 'grafana'),
            ) || defaultGrafana,
            AutoForm.getFieldValue(
              this.name.replace('dashboardUid', 'dashboardName'),
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
            this.name.replace('panel', 'dashboardName'),
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
            this.name.replace('panel.title', 'dashboardName'),
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
      optionsMethod: 'getTemplateDashboardPanels',
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
            forKpi: true,
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
        if (
          AutoForm.getFieldValue(this.name.replace('panel.id', 'panel.title'))
        )
          return parseInt(
            AutoForm.getFieldValue(
              this.name.replace('panel.id', 'panel.title'),
            ).replace(/^([0-9]+)-.*/, '$1'),
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
    label: 'Evaluate',
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

  checkId: {
    type: String,
    autoform: {
      type: 'hidden',
      //     value: function () {
      //     if (AutoForm.getFieldValue(this.name.replace('checkId', 'profile')) && AutoForm.getFieldValue(this.name.replace('checkId', 'grafana')) && AutoForm.getFieldValue(this.name.replace('checkId', 'dashboardUid')) && AutoForm.getFieldValue(this.name.replace('checkId', 'panel.id'))) {
      //         return AutoForm.getFieldValue(this.name.replace('checkId', 'profile')) + '-' + AutoForm.getFieldValue(this.name.replace('checkId', 'grafana')) + '-' + AutoForm.getFieldValue(this.name.replace('checkId', 'dashboardUid')) + '-' + AutoForm.getFieldValue(this.name.replace('checkId', 'panel.id'));
      //     }
      // },
    },
    optional: true,
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

  //TODO: workaround until perfana-scheduler is updated
  updateTestRuns: {
    label: 'Update existing test runs',
    type: String,
    autoform: {
      defaultValue: 'false',
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

const getDashboardUid = (grafanaLabel, dashboardName) => {
  const grafanaDashboard = GrafanaDashboards.findOne({
    $and: [
      { grafana: grafanaLabel },
      { name: dashboardName },
      { tags: { $in: ['perfana-template', 'Perfana-template'] } },
    ],
  });

  if (grafanaDashboard) {
    return grafanaDashboard.uid;
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
      return grafanaDashboard.panels[panelIndex].yAxesFormat ?
          getUnit(grafanaDashboard.panels[panelIndex].yAxesFormat).id
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
      return (
        evaluateType === 'fit' ? '%'
        : grafanaDashboard.panels[panelIndex].yAxesFormat === 'percentunit' ?
          'Percent unit (0.0-1.0)'
        : grafanaDashboard.panels[panelIndex].yAxesFormat ?
          getUnit(grafanaDashboard.panels[panelIndex].yAxesFormat).name
        : ''
      );
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

GenericChecks.attachSchema(GenericChecksSchema);

if (Meteor.isClient) {
  window.GenericChecks = GenericChecks;
  window.GenericChecksSchema = GenericChecksSchema;
  Meteor.subscribe('grafanas');

  const query = {
    $and: [
      {
        tags: {
          $not: { $elemMatch: { $regex: 'perfana-template', $options: 'i' } },
        },
      },
      { usedBySUT: { $exists: false } },
    ],
  };
  Meteor.subscribe('grafanaDashboards', query);
}
