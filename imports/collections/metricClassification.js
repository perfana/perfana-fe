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
import { Session } from 'meteor/session';

export const MetricClassification = new Mongo.Collection(
  'metricClassification',
  { idGeneration: 'MONGO' },
);

const metricClassificationSchema = new SimpleSchema({
  application: {
    type: String,
    optional: true,
    autoform: {
      defaultValue: () => Session.get('application') || '',
      readOnly: () => Session.get('application') !== null,
      type: 'hidden',
    },
  },
  testEnvironment: {
    type: String,
    optional: true,
    autoform: {
      defaultValue: () => Session.get('testEnvironment') || '',
      readOnly: () => Session.get('testEnvironment') !== null,
      type: 'hidden',
    },
  },
  testType: {
    type: String,
    optional: true,
    autoform: {
      defaultValue: () => Session.get('testType') || '',
      readOnly: () => Session.get('testType') !== null,
      type: 'hidden',
    },
  },
  dashboardUid: {
    type: String,
    optional: true,
  },
  dashboardLabel: {
    type: String,
    optional: true,
  },
  applicationDashboardId: {
    type: String,
    optional: true,
  },
  panelId: {
    type: Number,
    optional: true,
  },
  panelTitle: {
    type: String,
    optional: true,
  },
  metricName: {
    type: String,
    optional: true,
  },
  regex: {
    type: Boolean,
    optional: true,
  },
  higherIsBetter: {
    type: Boolean,
    optional: true,
  },
  metricClassification: {
    type: String,
    optional: true,
  },
});

MetricClassification.attachSchema(metricClassificationSchema);
