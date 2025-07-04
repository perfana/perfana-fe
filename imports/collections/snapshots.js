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

export const Snapshots = new Mongo.Collection('snapshots');

const SnapshotSchema = new SimpleSchema({
  application: {
    label: 'System under test',
    type: String,
    index: 1,
  },
  testType: {
    type: String,
    index: 1,
  },
  testEnvironment: {
    type: String,
    index: 1,
  },
  testRunId: {
    type: String,
    index: 1,
  },
  url: {
    type: String,
    optional: true,
  },
  deleteUrl: {
    type: String,
    optional: true,
  },
  grafana: {
    type: String,
  },
  dashboardUid: {
    type: String,
  },
  dashboardUrl: {
    type: String,
  },
  loginUrl: {
    type: String,
  },
  snapshotTimeout: {
    type: Number,
  },
  dashboardLabel: {
    type: String,
  },
  expires: {
    type: Number,
    optional: true,
  },
  panels: {
    type: [Object],
    optional: true,
  },
  'panels.$.title': {
    type: String,
  },
  'panels.$.id': {
    type: Number,
  },
  'panels.$.type': {
    type: String,
  },
  'panels.$.repeat': {
    type: String,
    optional: true,
  },
  'panels.$.snapshotData': {
    type: [Object],
    optional: true,
  },
  'panels.$.snapshotData.$.target': {
    type: String,
  },
  'panels.$.snapshotData.$.datapoints': {
    type: [[String]],
    blackbox: true,
  },
  hasChecks: {
    type: Boolean,
  },
  status: {
    type: String,
  },
  message: {
    type: String,
    optional: true,
  },
  updateAt: {
    type: Date,
    optional: true,
  },
});

Snapshots.attachSchema(SnapshotSchema);

if (Meteor.isClient) {
  window.Snapshots = Snapshots;
  window.SnapshotSchema = SnapshotSchema;
}
