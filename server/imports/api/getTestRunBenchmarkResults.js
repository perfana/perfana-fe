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

import { TestRuns } from '/imports/collections/testruns';
import { Benchmarks } from '/imports/collections/benchmarks';
import { Meteor } from 'meteor/meteor';
import { sendTestRunResultNotifications } from '../helpers/sendNotifications';
import _ from 'lodash';

export const getTestRunBenchmarkResults = function (req, res) {
  const evaluationInProgressMessage = {
    message: 'Test run evaluation in progress ...',
  };

  const noChecksConfiguredMessage = {
    message: [
      `No checks have been specified for this test run! Set assertResults property to false or create checks for service level indicators`,
    ],
  };

  const testRunNotFoundMessage = {
    message: ['Test run not found'],
  };

  const testRun = TestRuns.findOne({
    $and: [
      { application: req.params.systemUnderTest },
      { testRunId: req.params.testRunId },
    ],
  });

  if (testRun) {
    const checksConfigured =
      Benchmarks.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
        ],
      })
        .fetch()
        .filter(
          (benchmark) =>
            benchmark.panel.requirement || benchmark.panel.benchmark,
        ).length > 0;

    if (checksConfigured) {
      if (testRun.status) {
        const evalCheck = testRun.status.evaluatingChecks;
        const checkResultsComplete =
          evalCheck === 'COMPLETE' ||
          evalCheck === 'ERROR' ||
          evalCheck === 'NOT_CONFIGURED';

        const evalCompare = testRun.status.evaluatingComparisons;
        const compareResultsComplete =
          evalCompare === 'COMPLETE' ||
          evalCompare === 'ERROR' ||
          evalCompare === 'NOT_CONFIGURED' ||
          evalCompare === 'NO_BASELINES_FOUND' ||
          evalCompare === 'NO_AUTO_COMPARE' ||
          evalCompare === 'NO_PREVIOUS_TEST_RUN_FOUND' ||
          evalCompare === 'BASELINE_TEST_RUN';

        const adaptCheck =
          testRun.status.evaluatingAdapt ?
            testRun.status.evaluatingAdapt
          : 'NOT_CONFIGURED';
        const adaptCheckComplete =
          adaptCheck === 'COMPLETE' ||
          adaptCheck === 'NO_BASELINES_FOUND' ||
          adaptCheck === 'ERROR' ||
          adaptCheck === 'NOT_CONFIGURED';

        if (
          checkResultsComplete &&
          compareResultsComplete &&
          adaptCheckComplete
        ) {
          if (testRun.valid === false && testRun.reasonsNotValid) {
            res.status(500).json({ message: testRun.reasonsNotValid });
          } else {
            if (_.has(testRun, 'consolidatedResult')) {
              // add small delay to allow update of the test run consolidated results
              Meteor.setTimeout(() => {
                const benchmarkResults = getConsolidatedResults(testRun);
                sendTestRunResultNotifications(testRun, benchmarkResults);
                res.status(200).json(benchmarkResults);
              }, 1000);
            } else {
              res.status(202).json(evaluationInProgressMessage);
            }
          }
        } else {
          res.status(202).json(evaluationInProgressMessage);
        }
      } else {
        res.status(202).json(evaluationInProgressMessage);
      }
    } else {
      res.status(404).json(noChecksConfiguredMessage);
    }
  } else {
    res.status(404).json(testRunNotFoundMessage);
  }
};

function getConsolidatedResults(testRun) {
  const consolidatedResult = {};

  if (_.has(testRun.consolidatedResult, 'meetsRequirement')) {
    consolidatedResult.requirements = {};
    consolidatedResult.requirements.result =
      testRun.consolidatedResult.meetsRequirement;
    consolidatedResult.requirements.deeplink = generateDeeplink(testRun);
  }

  if (_.has(testRun.consolidatedResult, 'benchmarkPreviousTestRunOK')) {
    consolidatedResult.benchmarkPreviousTestRun = {};
    consolidatedResult.benchmarkPreviousTestRun.result =
      testRun.consolidatedResult.benchmarkPreviousTestRunOK;
    consolidatedResult.benchmarkPreviousTestRun.deeplink =
      generateDeeplink(testRun);
  }

  if (_.has(testRun.consolidatedResult, 'benchmarkBaselineTestRunOK')) {
    consolidatedResult.benchmarkBaselineTestRun = {};
    consolidatedResult.benchmarkBaselineTestRun.result =
      testRun.consolidatedResult.benchmarkBaselineTestRunOK;
    consolidatedResult.benchmarkBaselineTestRun.deeplink =
      generateDeeplink(testRun);
  }

  if (_.has(testRun.consolidatedResult, 'adaptTestRunOK')) {
    consolidatedResult.adaptTestRunOK = {};
    consolidatedResult.adaptTestRunOK.result =
      testRun.consolidatedResult.adaptTestRunOK;
    consolidatedResult.adaptTestRunOK.deeplink = generateDeeplink(testRun);
  }

  // create notification

  // if(testRun.consolidatedResult.overall === false){
  //
  //     let notification = {
  //         application: testRun.application,
  //         testEnvironment: testRun.testEnvironment,
  //         testType: testRun.testType,
  //         testRunId: testRun.testRunId,
  //         message: `Test run ${testRun.testRunId} has failed checks`,
  //         createdAt: new Date()
  //     }
  //
  //     Meteor.call('insertNotification', notification)
  //
  // }

  return consolidatedResult;
}

function generateDeeplink(testRun) {
  const perfanaUrl =
    Meteor.settings.perfanaUrl ?
      Meteor.settings.perfanaUrl
    : 'http://localhost:4000';

  const url = `${perfanaUrl}/test-run/${testRun.testRunId}?systemUnderTest=${testRun.application}&workload=${testRun.testType}&testEnvironment=${testRun.testEnvironment}`;

  return encodeURI(url);
}
