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

export const DsCompareConfig = new Mongo.Collection('dsCompareConfig', {
  idGeneration: 'MONGO',
});

NullType = new SimpleSchema({
  null: { type: String, allowedValues: [null] },
});

const DsCompareConfigSchema = new SimpleSchema({
  application: {
    type: Match.OneOf(String, null),
    optional: true,
  },
  testEnvironment: {
    type: Match.OneOf(String, null),
    optional: true,
  },
  testType: {
    type: Match.OneOf(String, null),
    optional: true,
  },
  dashboardUid: {
    type: Match.OneOf(String, null),
    optional: true,
  },
  dashboardLabel: {
    type: Match.OneOf(String, null),
    optional: true,
  },
  applicationDashboardId: {
    type: Match.OneOf(String, null),
    optional: true,
  },
  panelId: {
    type: Match.OneOf(Number, null),
    optional: true,
  },
  panelTitle: {
    type: Match.OneOf(String, null),
    optional: true,
  },
  metricName: {
    type: Match.OneOf(String, null),
    optional: true,
  },
  regex: {
    type: Match.OneOf(Boolean, null),
    optional: true,
  },
  ignore: {
    type: Object,
    optional: true,
  },
  'ignore.value': {
    type: Boolean,
  },
  'ignore.source': {
    type: String,
  },
  statistic: {
    type: Object,
    optional: true,
  },
  'statistic.value': {
    type: String,
  },
  'statistic.source': {
    type: String,
  },
  iqrThreshold: {
    type: Object,
    optional: true,
  },
  'iqrThreshold.value': {
    type: Number,
    decimal: true,
  },
  'iqrThreshold.source': {
    type: String,
  },
  pctThreshold: {
    type: Object,
    optional: true,
  },
  'pctThreshold.value': {
    type: Number,
    decimal: true,
  },
  'pctThreshold.source': {
    type: String,
  },
  absThreshold: {
    type: Object,
    optional: true,
    blackbox: true,
  },
  'absThreshold.value': {
    type: Match.OneOf(Number, null),
    decimal: true,
  },
  'absThreshold.source': {
    type: String,
  },
  nThreshold: {
    type: Object,
    optional: true,
  },
  'nThreshold.value': {
    type: Number,
  },
  'nThreshold.source': {
    type: String,
  },
});

DsCompareConfig.attachSchema(DsCompareConfigSchema);
