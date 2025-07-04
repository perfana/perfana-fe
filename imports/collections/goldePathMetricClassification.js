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

export const GoldenPathMetricClassification = new Mongo.Collection(
  'goldenPathMetricClassification',
);

const GoldenPathMetricClassificationSchema = new SimpleSchema({
  dashboardUid: {
    type: String,
  },
  dashboardLabel: {
    type: String,
  },
  panelId: {
    type: Number,
  },
  panelTitle: {
    type: String,
  },
  metricClassification: {
    type: String,
  },
  higherIsBetter: {
    type: Boolean,
  },
  metricName: {
    type: String,
    optional: true,
  },
  regex: {
    type: Boolean,
    optional: true,
  },
  ignore: {
    type: Boolean,
    optional: true,
  },
  statistic: {
    type: String,
    optional: true,
  },
  iqrThreshold: {
    type: Number,
    decimal: true,
    optional: true,
  },
  pctThreshold: {
    type: Number,
    decimal: true,
    optional: true,
  },
  absThreshold: {
    type: Number,
    decimal: true,
    optional: true,
  },
  nThreshold: {
    type: Number,
    optional: true,
  },
});

GoldenPathMetricClassification.attachSchema(
  GoldenPathMetricClassificationSchema,
);
