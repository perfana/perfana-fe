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

export const DsPanels = new Mongo.Collection('dsPanels');

export const PanelSchema = new SimpleSchema({
  _id: {
    type: String,
  },
  applicationDashboardId: {
    type: String,
  },
  panelId: {
    type: SimpleSchema.Integer,
  },
  testRunId: {
    type: String,
  },
  benchmarkId: {
    type: String,
    optional: true,
  },
  dashboardLabel: {
    type: String,
  },
  dashboardUid: {
    type: String,
  },
  dataSourceType: {
    type: String,
  },
  errors: {
    type: String,
    optional: true,
  },
  panel: {
    type: Object,
  },
  'panel.id': {
    type: SimpleSchema.Integer,
  },
  // ... continue to define all properties under the `panel` object.
  panelTitle: {
    type: String,
  },
  queryVariables: {
    type: Object,
  },
  'queryVariables.service': {
    type: String,
  },
  // ... continue to define all properties under the `queryVariables` object
  requests: {
    type: Array,
  },
  'requests.$': {
    type: Object,
  },
  // ... continue to define all properties for actual objects in the `requests` array
  updatedAt: {
    type: Date,
  },
  warnings: {
    type: String,
    optional: true,
  },
});

DsPanels.attachSchema(PanelSchema);
