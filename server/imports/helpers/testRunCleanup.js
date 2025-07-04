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
import { Applications } from '/imports/collections/applications';
import { Meteor } from 'meteor/meteor';
import { Configuration } from '/imports/collections/configuration';
import async from 'async';
import { log } from '/both/logger';
import { Snapshots } from '/imports/collections/snapshots';

const expireTestRun = (testRun, callback) => {
  TestRuns.update(
    {
      _id: testRun._id,
    },
    {
      $set: {
        expired: true,
      },
    },
  );

  /* remove snapshots */

  Snapshots.remove({ testRunId: testRun.testRunId });
  /* if test run is used as baseline, remove it */

  const application = Applications.findOne({
    name: testRun.application,
  });

  if (application) {
    const testEnvironmentIndex = application.testEnvironments
      .map((testEnvironment) => {
        return testEnvironment.name;
      })
      .indexOf(testRun.testEnvironment);
    if (testEnvironmentIndex !== -1) {
      const testTypeIndex = application.testEnvironments[
        testEnvironmentIndex
      ].testTypes
        .map((testType) => {
          return testType.name;
        })
        .indexOf(testRun.testType);
      if (testTypeIndex !== -1) {
        if (
          application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].baselineTestRun === testRun.testRunId
        ) {
          delete application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].baselineTestRun;
          delete application._id;

          Applications.update(
            {
              name: application.name,
            },
            {
              $set: application,
            },
          );
        }
      }
    }
  }

  /* delete checkResults and compareResults for this test run*/

  // CheckResults.remove({testRunId: testRun.testRunId });
  // CompareResults.remove({testRunId: testRun.testRunId });

  callback(null, testRun);
};

const bound = Meteor.bindEnvironment((callback) => {
  callback();
});

const testRunQueue = async.queue(
  Meteor.bindEnvironment((testRun, callback) => {
    if (
      testRun.expires !== 0 &&
      new Date().getTime() - new Date(testRun.end).getTime() >
        testRun.expires * 1000
    ) {
      expireTestRun(testRun, (err) => {
        if (err) {
          log.error(`Failed expiring test run ${testRun.testRunId}`);
        } else {
          callback();
        }
      });
    } else {
      callback();
    }
  }),
  5,
);

const testRunCleanUp = () => {
  bound(() => {
    // noinspection JSCheckFunctionSignatures
    log.info(`Starting test run expiry job...`);

    const snapshotExpiresConfig = Configuration.findOne({
      $and: [{ type: 'datasource' }, { key: 'grafanaRetention' }],
    });

    const expiryDate = new Date(
      new Date().getTime() - parseInt(snapshotExpiresConfig.value) * 1000,
    );

    const potentiallyExpiredTestRuns = TestRuns.find({
      $and: [
        {
          end: {
            $lte: expiryDate,
          },
        },
        {
          $or: [{ expired: { $exists: false } }, { expired: false }],
        },
      ],
    }).fetch();

    testRunQueue.drain(() => {
      // noinspection JSCheckFunctionSignatures
      log.info('all expired test runs have been processed');
    });

    testRunQueue.error(function (err) {
      log.warn('Failed to clean up test run: ' + err);
    });

    if (potentiallyExpiredTestRuns.length > 0) {
      testRunQueue.push(potentiallyExpiredTestRuns, (err) => {
        if (err)
          log.error(`Failed adding items to test run clean up queue: ${err}`);
      });
    }
  });
};

// noinspection JSUnusedGlobalSymbols
SyncedCron.add({
  name: 'Test run expiry job',
  schedule: function (parser) {
    // parser is a later.parse object
    return parser.text('every 1 hours');
  },
  job: testRunCleanUp,
});

SyncedCron.start();
