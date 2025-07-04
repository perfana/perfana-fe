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
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { GrafanaDashboards } from './grafanaDashboards';
import { Grafanas } from './grafanas';

export const ApplicationDashboards = new Mongo.Collection(
  'applicationDashboards',
);

const ApplicationDashboardsSchema = new SimpleSchema({
  application: {
    type: String,
    index: 1,
    label: 'System under test',
    autoform: {
      // type: "universe-select",
      // create: true,
      // createOnBlur: true,
      // options: [],
      // optionsMethod: "getApplications",
      defaultValue: () => {
        return Session.get('application') ? Session.get('application') : '';
      },
      readOnly: () => {
        return Session.get('application') !== null;
      },
      type: 'hidden',
    },
  },
  testEnvironment: {
    type: String,
    index: 1,
    autoform: {
      defaultValue: () => {
        return Session.get('testEnvironment') ?
            Session.get('testEnvironment')
          : '';
      },
      readOnly: () => {
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
      optionsMethod: 'getGrafanas',
      defaultValue: function () {
        return getDefaultGrafana();
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
      create: false,
      createOnBlur: false,
      options: [],
      optionsPlaceholder: 'Select dashboard',
      optionsMethod: 'getGrafanaDashboards',
      valuesLimit: 100,
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
            systemUnderTest: AutoForm.getFieldValue(
              this.name.replace('dashboardName', 'application'),
            ),
          };
        }
      },
    },
  },
  dashboardId: {
    type: Number,
    optional: true,
    autoform: {
      type: 'hidden',
      // value: function () {
      //
      //     const defaultGrafana =  getDefaultGrafana();
      //
      //     if ((AutoForm.getFieldValue(this.name.replace('dashboardId', 'grafana')) || defaultGrafana !== undefined ) && AutoForm.getFieldValue(this.name.replace('dashboardId', 'dashboardName'))) {
      //         return getDashboard(AutoForm.getFieldValue(this.name.replace('dashboardId', 'grafana')) || defaultGrafana, AutoForm.getFieldValue(this.name.replace('dashboardId', 'dashboardName')), 'id');
      //     }
      // },
    },
  },
  dashboardUid: {
    type: String,
    optional: true,
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
          return getDashboard(
            AutoForm.getFieldValue(
              this.name.replace('dashboardUid', 'grafana'),
            ) || defaultGrafana,
            AutoForm.getFieldValue(
              this.name.replace('dashboardUid', 'dashboardName'),
            ),
            'uid',
          );
        }
      },
    },
  },
  dashboardLabel: {
    type: String,
    index: 1,
    autoform: {
      type: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace('dashboardLabel', 'dashboardName'),
          )
        ) {
          return 'text';
        } else {
          return 'hidden';
        }
      },

      defaultValue: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace('dashboardLabel', 'dashboardName'),
          )
        ) {
          return AutoForm.getFieldValue(
            this.name.replace('dashboardLabel', 'dashboardName'),
          );
        }
      },
    },
  },

  tags: {
    type: [String],
    optional: true,
    autoform: {
      type: 'hidden',
      value: function () {
        const defaultGrafana = getDefaultGrafana();

        if (
          (AutoForm.getFieldValue(this.name.replace('tags', 'grafana')) ||
            defaultGrafana !== undefined) &&
          AutoForm.getFieldValue(this.name.replace('tags', 'dashboardName'))
        ) {
          return getDashboardTags(
            AutoForm.getFieldValue(this.name.replace('tags', 'grafana')) ||
              defaultGrafana,
            AutoForm.getFieldValue(this.name.replace('tags', 'dashboardName')),
          );
        }
      },
    },
  },
  templateDashboardUid: {
    type: String,
    optional: true,
    autoform: {
      type: 'hidden',
      readOnly: true,
    },
  },

  variables: {
    type: [Object],
    optional: true,
    autoform: {
      type: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace('variables', 'dashboardLabel'),
          ) !== undefined
        ) {
          return '';
        } else {
          return 'hidden';
        }
      },
    },
  },

  'variables.$.name': {
    type: String,
    autoform: {
      type: function () {
        if (AutoForm.getFieldValue('snapshotTimeout')) {
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
            this.name.replace(/variables\.[0-9]+\.name/, 'grafana'),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace(/variables\.[0-9]+\.name/, 'dashboardName'),
          )
        )
          return {
            filter: true,
            grafanaLabel: AutoForm.getFieldValue(
              this.name.replace(/variables\.[0-9]+\.name/, 'grafana'),
            ),
            dashboardName: AutoForm.getFieldValue(
              this.name.replace(/variables\.[0-9]+\.name/, 'dashboardName'),
            ),
          };
      },
      uniPlaceholder: 'Type or select from list',
    },
  },
  // "variables.$.values": {
  //     type: [Object],
  //     autoform: {
  //         type: function () {
  //             if( AutoForm.getFieldValue('snapshotTimeout')){
  //                 return "universe-select"
  //             } else {
  //
  //                 return "hidden"
  //             }
  //
  //         },
  //     }
  //
  // },
  'variables.$.values': {
    type: [String],
    autoform: {
      type: function () {
        if (AutoForm.getFieldValue(this.name.replace(/values/, 'name'))) {
          return 'universe-select';
        } else {
          return 'hidden';
        }
      },
      afFieldInput: {
        multiple: true,
        create: true,
        createOnBlur: true,
        optionsMethod: 'getDashboardVariableValuesRealtime',
        optionsMethodParams: function () {
          if (
            !AutoForm.getFieldValue(this.name) &&
            AutoForm.getFieldValue(
              this.name.replace(/variables\.[0-9]+\.values/, 'grafana'),
            ) &&
            AutoForm.getFieldValue(
              this.name.replace(/variables\.[0-9]+\.values/, 'dashboardName'),
            ) &&
            AutoForm.getFieldValue(
              this.name.replace(/variables\.[0-9]+\.values/, 'dashboardUid'),
            ) &&
            AutoForm.getFieldValue(
              this.name.replace(/variables\.[0-9]+\.values/, 'application'),
            ) &&
            AutoForm.getFieldValue(
              this.name.replace(/variables\.[0-9]+\.values/, 'testEnvironment'),
            ) &&
            AutoForm.getFieldValue(this.name.replace(/values/, 'name'))
          )
            return {
              grafanaLabel: AutoForm.getFieldValue(
                this.name.replace(/variables\.[0-9]+\.values/, 'grafana'),
              ),
              dashboardName: AutoForm.getFieldValue(
                this.name.replace(/variables\.[0-9]+\.values/, 'dashboardName'),
              ),
              dashboardUid: AutoForm.getFieldValue(
                this.name.replace(/variables\.[0-9]+\.values/, 'dashboardUid'),
              ),
              application: AutoForm.getFieldValue(
                this.name.replace(/variables\.[0-9]+\.values/, 'application'),
              ),
              testEnvironment: AutoForm.getFieldValue(
                this.name.replace(
                  /variables\.[0-9]+\.values/,
                  'testEnvironment',
                ),
              ),
              variableName: AutoForm.getFieldValue(
                this.name.replace(/values/, 'name'),
              ),
              variables: AutoForm.getFieldValue('variables'),
            };
        },
        uniPlaceholder: 'Type or select from list',
      },
    },
  },
  replacedTemplatingVariables: {
    type: [Object],
    optional: true,
    autoform: {
      type: 'hidden',
    },
  },
  'replacedTemplatingVariables.$.name': {
    type: String,
    autoform: {
      type: 'hidden',
    },
  },
  'replacedTemplatingVariables.$.value': {
    type: [String],
    autoform: {
      type: 'hidden',
    },
  },
  snapshotTimeout: {
    type: Number,
    label: 'Time for taking snapshots (s)',
    autoform: {
      type: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace('snapshotTimeout', 'dashboardLabel'),
          ) !== undefined
        ) {
          return '';
        } else {
          return 'hidden';
        }
      },
      defaultValue: 4,
    },
  },
});

const getDashboard = (grafanaLabel, dashboardName, property) => {
  // return Meteor.call('getGrafanaDashboard', grafanaLabel, dashboardName, property);

  const grafanaDashboard = GrafanaDashboards.findOne({
    $and: [{ grafana: grafanaLabel }, { name: dashboardName }],
  });

  if (grafanaDashboard) {
    return grafanaDashboard[property];
  }
};

const getDashboardTags = (grafanaLabel, dashboardName) => {
  const grafanaDashboard = GrafanaDashboards.findOne({
    $and: [{ grafana: grafanaLabel }, { name: dashboardName }],
  });

  if (grafanaDashboard) {
    return grafanaDashboard.tags;
  }
};

const getDefaultGrafana = () => {
  const grafanas = Grafanas.find({}).fetch();

  if (grafanas.length === 1) {
    return grafanas[0].label;
  } else {
    return undefined;
  }
};

ApplicationDashboards.attachSchema(ApplicationDashboardsSchema);

if (Meteor.isClient) {
  window.ApplicationDashboards = ApplicationDashboards;
  window.ApplicationDashboardsSchema = ApplicationDashboardsSchema;
  // Meteor.subscribe('grafanaDashboards', grafanaDashboardsQuery);
  Meteor.subscribe('grafanas');
  AutoForm.addHooks(
    'addApplicationDashboards',
    {
      before: {
        method: function (doc) {
          if (!doc.variables) {
            doc.variables = [];
          }
          return doc;
        },
      },
      onSuccess: function () {
        window.toastr.clear();
        window.toastr['success']('Done!', 'Added dashboard!');
      },
      onError: function (formType, err) {
        window.toastr.clear();
        window.toastr['error'](err, 'Error');
      },
    },
    false,
  );
  AutoForm.addHooks(
    'editApplicationDashboards',
    {
      onSuccess: function () {
        window.toastr.clear();
        window.toastr['success']('Done!', 'Updated dashboard!');
      },
      onError: function (formType, err) {
        window.toastr.clear();
        window.toastr['error'](err, 'Error');
      },
    },
    false,
  );
}
