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

export const DsMetrics = new Mongo.Collection('dsMetrics');

export const DsMetricsSchema = new SimpleSchema({
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
  },
  dashboardLabel: {
    type: String,
  },
  dashboardUid: {
    type: String,
  },
  data: {
    type: Array,
  },
  'data.$': {
    type: Object,
  },
  'data.$.metricName': {
    type: String,
  },
  'data.$.time': {
    type: Date,
  },
  'data.$.timestep': {
    type: SimpleSchema.Integer,
  },
  'data.$.rampUp': {
    type: Boolean,
  },
  'data.$.value': {
    type: SimpleSchema.Integer,
  },
  error: {
    type: String,
    optional: true, // Set as optional because the provided document has this field set as null
  },
  panelTitle: {
    type: String,
  },
  updatedAt: {
    type: Date,
  },
});

DsMetrics.attachSchema(DsMetricsSchema);
