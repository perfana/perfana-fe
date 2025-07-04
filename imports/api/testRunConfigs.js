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

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { TestRunConfigs } from '../collections/testrunConfigs';
import { log } from '/both/logger';

if (Meteor.isServer) {
  // Meteor.publish('testRunConfigs', (query) => {
  //   // check(query, Object);
  //   return TestRunConfigs.find(query);
  // });
}

Meteor.methods({
  getTestRunConfig: (query) => {
    check(query, Object);

    if (!Meteor.userId()) {
      throw new Meteor.Error(
        'get.test-run-config.unauthorized',
        'The user needs to be logged in to get to get test run config items',
      );
    }

    const wrap = Meteor.makeAsync(getTestRunConfigFn);
    return wrap(query);
  },
});

const getTestRunConfigFn = (query, callback) => {
  try {
    const testRunConfigs = TestRunConfigs.find(query).fetch();

    callback(null, testRunConfigs);
  } catch (err) {
    log.error('Failed getting test run configs due to: ', err);

    callback(err, null);
  }
};
