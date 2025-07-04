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

import { GrafanaDashboards } from './grafanaDashboards';

export const GrafanaDashboardsTemplatingValues = new Mongo.Collection(
  'grafanaDashboardsTemplatingValues',
);

const GrafanaDashboardsTemplatingValuesSchema = new SimpleSchema({
  grafana: {
    type: String,
    autoform: {
      type: 'universe-select',
      create: true,
      createOnBlur: true,
      options: [],
      optionsMethod: 'getGrafanas',
      optionsMethodParams: function () {
        return {};
      },
    },
  },
  dashboardName: {
    type: String,
    autoform: {
      type: 'universe-select',
      create: true,
      createOnBlur: true,
      options: [],
      optionsMethod: 'getGrafanaDashboards',
      optionsMethodParams: function () {
        if (
          AutoForm.getFieldValue(this.name.replace('dashboardName', 'grafana'))
        ) {
          return {
            grafanaLabel: AutoForm.getFieldValue(
              this.name.replace('dashboardName', 'grafana'),
            ),
            systemUnderTest: AutoForm.getFieldValue(
              this.name.replace('dashboardName', 'application'),
            ),
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
            this.name.replace('dashboardUid', 'dashboardName'),
          )
        ) {
          return getDashboardUid(
            AutoForm.getFieldValue(
              this.name.replace('dashboardUid', 'grafana'),
            ),
            AutoForm.getFieldValue(
              this.name.replace('dashboardUid', 'dashboardName'),
            ),
          );
        }
      },
    },
  },
  variableName: {
    type: String,
    autoform: {
      value: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace('dashboardUid', 'grafana'),
          ) &&
          AutoForm.getFieldValue(
            this.name.replace('dashboardUid', 'dashboardName'),
          )
        ) {
          return getDashboardTemplatingVariables(
            AutoForm.getFieldValue(
              this.name.replace('dashboardUid', 'grafana'),
            ),
            AutoForm.getFieldValue(
              this.name.replace('dashboardUid', 'dashboardName'),
            ),
          );
        }
      },
    },
  },
  variableValue: {
    type: String,
  },
  updated: {
    type: Date,
  },
});

const getDashboardUid = (grafanaLabel, dashboardName) => {
  const grafanaDashboard = GrafanaDashboards.findOne({
    $and: [{ grafana: grafanaLabel }, { name: dashboardName }],
  });

  if (grafanaDashboard) {
    return grafanaDashboard.uid;
  }
};

const getDashboardTemplatingVariables = (grafanaLabel, dashboardName) => {
  const grafanaDashboard = GrafanaDashboards.findOne({
    $and: [{ grafana: grafanaLabel }, { name: dashboardName }],
  });

  if (grafanaDashboard) {
    return grafanaDashboard.variables.map((v) => ({
      label: v.name,
      value: v.name,
    }));
  }
};

GrafanaDashboardsTemplatingValues.attachSchema(
  GrafanaDashboardsTemplatingValuesSchema,
);

if (Meteor.isClient) {
  window.GrafanaDashboardsTemplatingValues = GrafanaDashboardsTemplatingValues;
  window.GrafanaDashboardsTemplatingValuesSchema =
    GrafanaDashboardsTemplatingValuesSchema;
}
