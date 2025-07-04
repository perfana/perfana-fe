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

export const DsChangepoints = new Mongo.Collection('dsChangepoints');

NullType = new SimpleSchema({
  null: { type: String, allowedValues: [null] },
});

export const ChangepointsSchema = new SimpleSchema({
  application: {
    type: String,
  },
  testType: {
    type: String,
  },
  testEnvironment: {
    type: String,
  },
  testRunId: {
    type: String,
  },
  applicationDashboardId: {
    type: Match.OneOf(String, null),
    optional: true,
  },
  panelTitle: {
    type: Match.OneOf(String, null),
    optional: true,
  },
  dashboardLabel: {
    type: Match.OneOf(String, null),
    optional: true,
  },
  dashboardUid: {
    type: Match.OneOf(String, null),
    optional: true,
  },
  panelId: {
    type: Match.OneOf(Number, null),
    optional: true,
  },
  metricName: {
    type: Match.OneOf(String, null),
    optional: true,
  },
});

DsChangepoints.attachSchema(ChangepointsSchema);
