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
// noinspection JSJQueryEfficiency,JSUnusedLocalSymbols

import { GrafanaDashboards } from './grafanaDashboards';
import { Grafanas } from './grafanas';
import { Session } from 'meteor/session';
import { Meteor } from 'meteor/meteor';

export const AutoConfigGrafanaDashboards = new Mongo.Collection(
  'autoConfigGrafanaDashboards',
);

const AutoConfigGrafanaDashboardSchema = new SimpleSchema({
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
      custom: () => {
        if (Session.get('profileReadOnly') === true) {
          setTimeout(() => {
            $('select[name="grafana"]').next('div').prop('disabled', true);
            $('select[name="grafana"]')
              .parent()
              .attr(
                'title',
                'This cannot be changed for default Perfana profiles',
              );
            $('select[name="grafana"]').next('div').css('color', 'grey');
          }, 500);
        }
      },
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
      optionsMethod: 'getGrafanaDashboardTemplates',
      optionsMethodParams: function () {
        const defaultGrafana = getDefaultGrafana();
        if (
          AutoForm.getFieldValue(
            this.name.replace('dashboardName', 'grafana'),
          ) ||
          defaultGrafana !== undefined
        ) {
          return {
            grafanaLabel:
              AutoForm.getFieldValue(
                this.name.replace('dashboardName', 'grafana'),
              ) || defaultGrafana,
          };
        }
      },
      custom: () => {
        if (Session.get('profileReadOnly') === true) {
          setTimeout(() => {
            $('select[name="dashboardName"]')
              .next('div')
              .prop('disabled', true);
            $('select[name="dashboardName"]')
              .parent()
              .attr(
                'title',
                'This cannot be changed for default Perfana profiles',
              );
            $('select[name="dashboardName"]').next('div').css('color', 'grey');
            $('select[name="dashboardName"]')
              .next('div')
              .children()
              .addClass('read-only-dropdown');
          }, 500);
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
  // removeTemplatingVariables: {
  //     label: 'Remove templating variables and replace them with values',
  //     type: Boolean,
  //     autoform: {
  //         type: function () {
  //             if (AutoForm.getFieldValue(this.name.replace('removeTemplatingVariables', 'dashboardName'))
  //
  //             ) {
  //                 return ""
  //             } else {
  //
  //                 return "hidden"
  //             }
  //
  //         },
  //     }
  // },
  createSeparateDashboardForVariable: {
    label: 'Create separate dashboard for variable',
    type: String,
    optional: true,
    autoform: {
      type: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace(
              'createSeparateDashboardForVariable',
              'dashboardName',
            ),
          )
        ) {
          return 'universe-select';
        } else {
          return 'hidden';
        }
      },
      create: true,
      createOnBlur: true,
      removeButton: true,
      options: [],
      optionsMethod: 'getDashboardVariables',
      optionsMethodParams: function () {
        const defaultGrafana = getDefaultGrafana();

        if (
          (AutoForm.getFieldValue(
            this.name.replace('createSeparateDashboardForVariable', 'grafana'),
          ) ||
            defaultGrafana !== undefined) &&
          AutoForm.getFieldValue(
            this.name.replace(
              'createSeparateDashboardForVariable',
              'dashboardName',
            ),
          )
        )
          return {
            filter: true,
            grafanaLabel:
              AutoForm.getFieldValue(
                this.name.replace(
                  'createSeparateDashboardForVariable',
                  'grafana',
                ),
              ) || defaultGrafana,
            dashboardName: AutoForm.getFieldValue(
              this.name.replace(
                'createSeparateDashboardForVariable',
                'dashboardName',
              ),
            ),
          };
      },
      uniPlaceholder: 'Type or select from list',
    },
  },

  setHardcodedValueForVariables: {
    label: 'Override variable values',
    type: [Object],
    optional: true,
    autoform: {
      type: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace('setHardcodedValueForVariables', 'dashboardName'),
          )
        ) {
          return '';
        } else {
          return 'hidden';
        }
      },
    },
  },
  'setHardcodedValueForVariables.$.name': {
    type: String,
    optional: true,
    autoform: {
      type: function () {
        if (AutoForm.getFieldValue('dashboardName')) {
          return 'universe-select';
        } else {
          return 'hidden';
        }
      },
      create: true,
      createOnBlur: true,
      options: [],
      optionsMethod: 'getDashboardVariables',
      optionsMethodParams: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace(
              /setHardcodedValueForVariables\.[0-9]+\.name/,
              'grafana',
            ),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace(
              /setHardcodedValueForVariables\.[0-9]+\.name/,
              'dashboardName',
            ),
          )
        )
          return {
            filter: true,
            grafanaLabel: AutoForm.getFieldValue(
              this.name.replace(
                /setHardcodedValueForVariables\.[0-9]+\.name/,
                'grafana',
              ),
            ),
            dashboardName: AutoForm.getFieldValue(
              this.name.replace(
                /setHardcodedValueForVariables\.[0-9]+\.name/,
                'dashboardName',
              ),
            ),
          };
      },
      uniPlaceholder: 'Type or select from list',
    },
  },
  'setHardcodedValueForVariables.$.values': {
    type: [String],
    autoform: {
      type: function () {
        if (AutoForm.getFieldValue(this.name.replace(/values/, 'name'))) {
          return 'text';
        } else {
          return 'hidden';
        }
      },
    },
  },

  matchRegexForVariables: {
    label: 'Filter variable values by regex',
    type: [Object],
    optional: true,
  },
  'matchRegexForVariables.$.name': {
    type: String,
    optional: true,
    autoform: {
      type: function () {
        if (AutoForm.getFieldValue('dashboardName')) {
          return 'universe-select';
        } else {
          return 'hidden';
        }
      },
      create: true,
      createOnBlur: true,
      options: [],
      optionsMethod: 'getDashboardVariablesForAutoConfig',
      optionsMethodParams: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace(
              /matchRegexForVariables\.[0-9]+\.name/,
              'grafana',
            ),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace(
              /matchRegexForVariables\.[0-9]+\.name/,
              'dashboardName',
            ),
          )
        )
          return {
            filter: false,
            grafanaLabel: AutoForm.getFieldValue(
              this.name.replace(
                /matchRegexForVariables\.[0-9]+\.name/,
                'grafana',
              ),
            ),
            dashboardName: AutoForm.getFieldValue(
              this.name.replace(
                /matchRegexForVariables\.[0-9]+\.name/,
                'dashboardName',
              ),
            ),
          };
      },
      uniPlaceholder: 'Type or select from list',
    },
  },
  'matchRegexForVariables.$.regex': {
    type: String,
    autoform: {
      type: function () {
        if (AutoForm.getFieldValue(this.name.replace(/regex/, 'name'))) {
          return 'text';
        } else {
          return 'hidden';
        }
      },
    },
  },
  readOnly: {
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

const getDashboardUid = (grafanaLabel, dashboardName) => {
  const grafanaDashboard = GrafanaDashboards.findOne({
    $and: [{ grafana: grafanaLabel }, { name: dashboardName }],
  });

  if (grafanaDashboard) {
    return grafanaDashboard.uid;
  }
};

AutoConfigGrafanaDashboards.attachSchema(AutoConfigGrafanaDashboardSchema);

if (Meteor.isClient) {
  window.AutoConfigGrafanaDashboards = AutoConfigGrafanaDashboards;
  window.AutoConfigGrafanaDashboardSchema = AutoConfigGrafanaDashboardSchema;

  Meteor.subscribe('grafanas');

  const grafanaDashboardsQuery = {
    $and: [{ tags: { $in: ['perfana-template', 'Perfana-template'] } }],
  };

  Meteor.subscribe('grafanaDashboards', grafanaDashboardsQuery);
}

// eslint-disable-next-line no-unused-vars
const getGrafanas = () => {
  const grafanas = Grafanas.find().fetch();
  return grafanas.map((grafana) => {
    return {
      label: grafana.label,
      value: grafana.label,
    };
  });
};
