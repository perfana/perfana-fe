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

export const DsMetricStatistics = new Mongo.Collection('dsMetricStatistics');

export const DsMetricStatisticsSchema = new SimpleSchema({
  _id: {
    type: String,
  },
  applicationDashboardId: {
    type: String,
  },
  baselineDatetime: {
    type: Date,
  },
  metricName: {
    type: String,
  },
  panelId: {
    type: Number,
  },
  allPassed: {
    type: Boolean,
  },
  nTestRuns: {
    type: Number,
  },
  statistic: {
    type: Object,
  },
  'statistic.n': {
    type: Number,
  },
  'statistic.mean': {
    type: Number,
    decimal: true,
  },
  'statistic.median': {
    type: Number,
  },
  'statistic.max': {
    type: Number,
  },
  'statistic.q01': {
    type: Number,
  },
  'statistic.q10': {
    type: Number,
  },
  'statistic.q25': {
    type: Number,
  },
  'statistic.q50': {
    type: Number,
  },
  'statistic.q75': {
    type: Number,
  },
  'statistic.q90': {
    type: Number,
  },
  'statistic.q99': {
    type: Number,
  },
  'statistic.iqr50': {
    type: Number,
  },
  'statistic.iqr80': {
    type: Number,
  },
  statisticsOverTime: {
    type: Array,
  },
  'statisticsOverTime.$': {
    type: Object,
  },
  'statisticsOverTime.$.n': {
    type: Number,
  },
  'statisticsOverTime.$.mean': {
    type: Number,
    decimal: true,
  },
  'statisticsOverTime.$.median': {
    type: Number,
  },
  'statisticsOverTime.$.max': {
    type: Number,
  },
  'statisticsOverTime.$.q01': {
    type: Number,
  },
  'statisticsOverTime.$.q10': {
    type: Number,
  },
  'statisticsOverTime.$.q25': {
    type: Number,
  },
  'statisticsOverTime.$.q50': {
    type: Number,
  },
  'statisticsOverTime.$.q75': {
    type: Number,
  },
  'statisticsOverTime.$.q90': {
    type: Number,
  },
  'statisticsOverTime.$.q99': {
    type: Number,
  },
  'statisticsOverTime.$.iqr50': {
    type: Number,
  },
  'statisticsOverTime.$.iqr80': {
    type: Number,
  },
  'statisticsOverTime.$.timestep': {
    type: Number,
  },
  testRuns: {
    type: Array,
  },
  'testRuns.$': {
    type: String,
  },
  updatedAt: {
    type: Date,
  },
});

DsMetricStatistics.attachSchema(DsMetricStatisticsSchema);
