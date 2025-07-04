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
import { check, Match } from 'meteor/check';

import { CheckResults } from '../collections/checkResults';
import { Benchmarks } from '../collections/benchmarks';
import { userHasPermission } from '../helpers/checkPermission';
import { log } from '/both/logger';

if (Meteor.isServer) {
  Meteor.publish('checkResults', (query, component) => {
    check(query, Match.OneOf(undefined, null, Object));
    check(component, String);
    log.debug(
      '######### checkResults subscription query from component ' +
        component +
        ': ' +
        JSON.stringify(query),
    );

    if (
      query.$and.length === 0 ||
      query.$and.some((obj) => Object.keys(obj).length === 0)
    ) {
      return [];
    } else {
      return CheckResults.find(query, {
        sort: { meetsRequirement: 1 },
        limit: 50,
      });
    }
  });
}

Meteor.methods({
  getTestRunCheckResultsStatus: (testRun) => {
    check(testRun, Object);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'get.check-result-status.unauthorized',
        'The user is not authorized to get check result status',
      );
    }

    const wrap = Meteor.makeAsync(getTestRunCheckResultsStatusFn);
    return wrap(testRun);
  },
});
/* eslint-disable */
const getTestRunCheckResultsStatusFn = (testRun, callback) => {
  try {
    if (testRun && testRun.status && testRun.status.evaluatingChecks) {
      switch (testRun.status.evaluatingChecks) {
        case 'STARTED':
          callback(null, 'Started');
          break;
        case 'IN_PROGRESS':
          callback(null, 'In progress ...');
          break;
        case 'BATCH_PROCESSING':
          callback(null, 'In progress ...');
          break;
        case 'RE_EVALUATE':
          callback(null, 'Re-evaluating ...');
          break;
        case 'REFRESH':
          callback(null, 'Refreshing ...');
          break;
        case 'COMPLETE':
          callback(null, 'Completed');
          break;
        case 'ERROR':
          callback(null, 'Completed, with errors');
          break;
        case 'NOT_CONFIGURED':
          callback(null, 'No checks configured');
          break;
        default:
          callback(null, 'Status unknown');
      }
      /* eslint-enable */
    } else {
      /* check expected check results */

      const expectedCheckResults = Benchmarks.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
        ],
      }).fetch();

      if (expectedCheckResults.length > 0) {
        const completedCheckResults = CheckResults.find({
          $and: [
            { application: testRun.application },
            { testEnvironment: testRun.testEnvironment },
            { testType: testRun.testType },
            { testRunId: testRun.testRunId },
            { status: 'COMPLETE' },
          ],
        }).fetch();

        if (completedCheckResults.length === expectedCheckResults.length) {
          callback(null, 'Completed');
        } else {
          const completedInErrorCheckResults = CheckResults.find({
            $and: [
              { application: testRun.application },
              { testEnvironment: testRun.testEnvironment },
              { testType: testRun.testType },
              { testRunId: testRun.testRunId },
              {
                $or: [{ status: 'COMPLETE' }, { status: 'ERROR' }],
              },
            ],
          }).fetch();

          if (
            completedInErrorCheckResults.length === expectedCheckResults.length
          ) {
            callback(null, 'Completed, with errors');
          } else {
            callback(null, 'In progress ...');
          }
        }
      } else {
        callback(null, 'Not configured');
      }
    }
  } catch (err) {
    callback(err, null);
  }
};
