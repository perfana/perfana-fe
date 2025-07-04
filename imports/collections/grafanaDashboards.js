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

export const GrafanaDashboards = new Mongo.Collection('grafanaDashboards');

const GrafanaDashboardSchema = new SimpleSchema({
  updated: {
    type: Date,
  },
  grafana: {
    type: String,
  },

  id: {
    type: Number,
  },
  datasourceType: {
    type: String,
  },
  uid: {
    type: String,
    index: 1,
  },
  slug: {
    type: String,
  },
  name: {
    type: String,
  },
  uri: {
    type: String,
  },

  templatingVariables: {
    type: [Object],
    optional: true,
  },
  'templatingVariables.$.name': {
    type: String,
    optional: true,
  },
  'templatingVariables.$.query': {
    type: String,
    optional: true,
  },
  'templatingVariables.$.type': {
    type: String,
    optional: true,
  },
  'templatingVariables.$.datasource': {
    type: Object,
    optional: true,
  },
  'templatingVariables.$.regex': {
    type: String,
    optional: true,
  },
  panels: {
    type: [Object],
  },

  'panels.$.id': {
    type: Number,
  },
  'panels.$.title': {
    type: String,
  },
  'panels.$.type': {
    type: String,
  },
  'panels.$.datasourceId': {
    type: Number,
    optional: true,
  },
  'panels.$.datasourceType': {
    type: String,
    optional: true,
  },
  'panels.$.datasourceDatabase': {
    type: String,
    optional: true,
  },
  'panels.$.minTimeInterval': {
    type: String,
    optional: true,
  },
  'panels.$.yAxesFormat': {
    type: String,
    optional: true,
  },
  'panels.$.description': {
    type: String,
    optional: true,
  },
  'panels.$.repeat': {
    type: String,
    optional: true,
  },
  'panels.$.targets': {
    type: [Object],
    optional: true,
  },
  'panels.$.targets.$.query': {
    type: String,
    optional: true,
  } /*,
    "panels.$.targets.$.alias": {
        type: String,
        optional: true

    }*/,
  'panels.$.targets.$.rp': {
    type: String,
    optional: true,
  },
  'panels.$.targets.$.measurement': {
    type: String,
    optional: true,
  },
  'panels.$.targets.$.field': {
    type: String,
    optional: true,
  },
  'panels.$.targets.$.whereFilter': {
    type: String,
    optional: true,
  },
  'panels.$.targets.$.groupBy': {
    type: [String],
    optional: true,
  },
  'panels.$.targets.$.legendFormat': {
    type: String,
    optional: true,
  },
  variables: {
    type: [Object],
    optional: true,
  },
  'variables.$.name': {
    type: String,
    optional: true,
  },
  tags: {
    type: [String],
    optional: true,
  },
  usedBySUT: {
    type: [String],
    optional: true,
    index: true,
    sparse: true,
  },
});

GrafanaDashboards.attachSchema(GrafanaDashboardSchema);

if (Meteor.isClient) {
  window.GrafanaDashboards = GrafanaDashboards;
  window.GrafanaDashboardSchema = GrafanaDashboardSchema;
}
