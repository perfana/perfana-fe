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

import { CompareResults } from '../collections/compareResults';
import { TestRuns } from '../collections/testruns';
import { getFixedBaselineTestRun, getPreviousTestRun } from '../helpers/utils';
import { Benchmarks } from '../collections/benchmarks';
import { userHasPermission } from '../helpers/checkPermission';
import { log } from '/both/logger';
import _ from 'lodash';

if (Meteor.isServer) {
  Meteor.publish('compareResults', (query) => {
    check(query, Match.OneOf(undefined, null, Object));
    log.debug(
      '######### compareResults subscription query: ' + JSON.stringify(query),
    );
    if (
      query.$and.length === 0 ||
      query.$and.some((obj) => Object.keys(obj).length === 0)
    ) {
      return [];
    } else {
      return CompareResults.find(query, {
        sort: { benchmarkBaselineTestRunOK: 1 },
      });
    }
  });
}

Meteor.methods({
  getTestRunCompareResultsStatus: (testRun) => {
    check(testRun, Object);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'get.compare-result-status.unauthorized',
        'The user is not authorized to get compare result status',
      );
    }

    const wrap = Meteor.makeAsync(getTestRunCompareResultsStatusFn);
    return wrap(testRun);
  },
  createCompareResults: (compareResultsLocal, session) => {
    check(compareResultsLocal, [Object]);
    check(session, Object);

    if (!userHasPermission(Meteor.userId(), session.application)) {
      throw new Meteor.Error(
        'create.comparison.unauthorized',
        'The user is not authorized to create comparisons for this system under test',
      );
    }

    const benchmark =
      session.evaluateResults === true &&
      session.benchmarkOperator &&
      session.benchmarkValue
        ? {
            operator: session.benchmarkOperator,
            value: session.benchmarkValue,
          }
        : undefined;

    compareResultsLocal.forEach((compareResultItem) => {
      delete compareResultItem._id;

      /* get panel type*/

      const baselineTestRun = TestRuns.findOne({
        _id: session.baseline,
      });

      const existingCompareResult = CompareResults.findOne({
        $and: [
          { label: session.label.trim() },
          { application: compareResultItem.application },
          { testEnvironment: compareResultItem.testEnvironment },
          { testType: compareResultItem.testType },
          { testRunId: compareResultItem.testRunId },
          { dashboardUid: compareResultItem.dashboardUid },
          { dashboardLabel: compareResultItem.dashboardLabel },
          { panelTitle: compareResultItem.panelTitle },
          { panelId: parseInt(compareResultItem.panelId) },
        ],
      });

      if (existingCompareResult) {
        CompareResults.remove({
          _id: existingCompareResult._id,
        });
      }

      CompareResults.insert(
        _.extend(compareResultItem, {
          label: session.label,
          averageAll: compareResultItem.averageAll || session.averageAll,
          evaluateType: compareResultItem.evaluateType || session.evaluateType,
          matchPattern: compareResultItem.matchPattern || session.matchPattern,
          excludeRampUpTime:
            compareResultItem.excludeRampUpTime || session.excludeRampUpTime,
          rampUp: baselineTestRun.rampUp,
          benchmark:
            compareResultItem.benchmark &&
            compareResultItem.benchmark.operator &&
            compareResultItem.benchmark.value
              ? compareResultItem.benchmark
              : benchmark,
          adHoc: true,
        }),
      );
    });

    // set test runs status to RE_EVALUATE
    TestRuns.update(
      {
        _id: session.testRunId,
      },
      {
        $set: {
          'status.evaluatingComparisons': 'RE_EVALUATE',
        },
      },
    );
  },
  deleteCompareResultForLabel: (compareResult) => {
    check(compareResult, Object);

    if (!userHasPermission(Meteor.userId(), compareResult.application)) {
      throw new Meteor.Error(
        'delete.compare-result.unauthorized',
        'The user is not authorized to delete compare results for this system under test',
      );
    }

    CompareResults.remove({
      $and: [
        { application: compareResult.application },
        { testEnvironment: compareResult.testEnvironment },
        { testType: compareResult.testType },
        { testRunId: compareResult.testRunId },
        { label: compareResult.label },
      ],
    });
  },
});

const getTestRunCompareResultsStatusFn = (testRun, callback) => {
  try {
    /* check for baseline test runs */

    const evalStatus = testRun.status.evaluatingComparisons;

    if (testRun.status && evalStatus) {
      switch (evalStatus) {
        case 'STARTED':
          callback(null, 'Started');
          break;
        case 'IN_PROGRESS':
          callback(null, 'In progress ...');
          break;
        case 'BATCH_PROCESSING':
          callback(null, 'In progress ... ...');
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
        case 'NO_BASELINES_FOUND':
          callback(null, 'No valid baseline test runs found');
          break;
        case 'BASELINE_TEST_RUN':
          callback(null, 'Test run is baseline: no compare results');
          break;
        case 'NO_AUTO_COMPARE':
          callback(
            null,
            'Using static comparison thresholds to compare test runs is disabled. See System Under Test settings',
          );
          break;
        case 'NOT_CONFIGURED':
          callback(null, 'No comparing thresholds configured');
          break;
        default:
          callback(null, 'Status unknown ' + evalStatus);
      }
    } else {
      const baselineTestRunId = getFixedBaselineTestRun(testRun);
      const previousTestRunId = getPreviousTestRun(testRun, true);

      /* check expected compare results */

      const expectedCompareResults = Benchmarks.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
        ],
      })
        .fetch()
        .filter((benchmark) => {
          return _.has(benchmark.panel, 'benchmark');
        });

      const hasTwoBaselines =
        baselineTestRunId !== undefined && previousTestRunId !== undefined;

      const compareResultsFactor = hasTwoBaselines ? 2 : 1;

      const hasNoBaselines =
        baselineTestRunId === undefined && previousTestRunId === undefined;

      if (hasNoBaselines) {
        callback(null, 'No baseline test runs found');
      } else {
        if (expectedCompareResults.length > 0) {
          const completedCompareResults = CompareResults.find({
            $and: [
              { application: testRun.application },
              { testEnvironment: testRun.testEnvironment },
              { testType: testRun.testType },
              { testRunId: testRun.testRunId },
              { benchmarkId: { $exists: true } },
              { status: 'COMPLETE' },
              { label: { $regex: '.*Service level indicators' } },
            ],
          }).fetch();

          if (
            completedCompareResults.length ===
            expectedCompareResults.length * compareResultsFactor
          ) {
            callback(null, 'Completed');
          } else {
            const completedInErrorCompareResults = CompareResults.find({
              $and: [
                { application: testRun.application },
                { testEnvironment: testRun.testEnvironment },
                { testType: testRun.testType },
                { testRunId: testRun.testRunId },
                { benchmarkId: { $exists: true } },
                {
                  $or: [{ status: 'COMPLETE' }, { status: 'ERROR' }],
                },
                { label: { $regex: '.*Service level indicators' } },
              ],
            }).fetch();

            if (
              completedInErrorCompareResults.length ===
              expectedCompareResults.length * compareResultsFactor
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
    }
  } catch (err) {
    callback(err, null);
  }
};
