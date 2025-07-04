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

export const TestRunConfigs = new Mongo.Collection('testRunConfigs');

const TestRunConfigSchema = new SimpleSchema({
  application: {
    type: String,
    index: 1,
    label: 'System under test',
    optional: true,
  },
  testType: {
    label: 'Workload',
    index: 1,
    type: String,
    optional: true,
  },
  testEnvironment: {
    type: String,
    index: 1,
    optional: true,
  },

  testRunId: {
    type: String,
    index: 1,
    optional: true,
  },
  tags: {
    type: [String],
    optional: true,
  },

  /* key - value pairs */

  key: {
    type: String,
    optional: true,
  },
  value: {
    type: String,
    optional: true,
  },
});

TestRunConfigs.attachSchema(TestRunConfigSchema);

// if (Meteor.isClient) {
//   window.TestRunConfigs = TestRunConfigs;
//   window.TestRunSchema = TestRunConfigSchema;
// }
