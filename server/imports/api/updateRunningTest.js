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

import { createSnapshots } from './createSnapshots';
import { check } from 'meteor/check';
import { TestRuns } from '/imports/collections/testruns';
import { Applications } from '/imports/collections/applications';
import { Meteor } from 'meteor/meteor';
import { log } from '/both/logger';
import { TestRunConfigs } from '/imports/collections/testrunConfigs';
import { createMetricClassifications } from './createMetricClassifications';
import _ from 'lodash';
import { perfanaDsApiPost } from '/imports/helpers/perfana-ds-api';

export const updateRunningTest = function (req, res) {
  const snapshotExpires =
    Meteor.settings.snapshotExpires ? Meteor.settings.snapshotExpires : 7776000;

  try {
    // console.log(JSON.stringify(req.body));

    check(req.body, {
      systemUnderTest: String,
      version: Match.Optional(String),
      workload: String,
      testEnvironment: String,
      start: Match.Optional(String),
      end: Match.Optional(String),
      duration: Match.Optional(String),
      rampUp: Match.Optional(String),
      testRunId: String,
      completed: Boolean,
      CIBuildResultsUrl: Match.Optional(Match.OneOf(undefined, null, String)),
      annotations: Match.Optional(Match.OneOf(undefined, null, String)),
      variables: Match.Optional([Object]),
      abort: Match.Optional(Boolean),
      abortMessage: Match.Optional(String),
      tags: Match.Optional([String]),
      deepLinks: Match.Optional([Object]),
    });

    /* check if application and test testEnvironment already exist, and is not, create them, and sync Grafana dashboards */

    let application = Applications.findOne({ name: req.body.systemUnderTest });

    if (!application) {
      const testTypes = [
        {
          name: req.body.workload,
          baselineTestRun: req.body.testRunId,
          tags: [],
          differenceScoreThreshold: 70,
          autoCompareTestRuns:
            Meteor.settings.autoCompareTestRuns ?
              Meteor.settings.autoCompareTestRuns === true
            : false,
          autoCreateSnapshots:
            Meteor.settings.autoCreateSnapshots ?
              Meteor.settings.autoCreateSnapshots === true
            : false,
          enableAdapt:
            Meteor.settings.enableAdapt ?
              Meteor.settings.enableAdapt === true
            : true,
          runAdapt:
            Meteor.settings.runAdapt ? Meteor.settings.runAdapt === true : true,
          adaptMode: 'BASELINE',
        },
      ];

      const testEnvironments = [
        {
          name: req.body.testEnvironment,
          testTypes: testTypes,
        },
      ];

      Applications.insert({
        name: req.body.systemUnderTest,
        description: req.body.systemUnderTest,
        testEnvironments: testEnvironments,
      });
    } else {
      // set autoCompareTestRuns if not present (backwards compatibility)
      application.testEnvironments.forEach(
        (testEnvironment, testEnvironmentIndex) => {
          testEnvironment.testTypes.forEach((testType, testTypeIndex) => {
            if (testType.autoCreateSnapshots === undefined)
              application.testEnvironments[testEnvironmentIndex].testTypes[
                testTypeIndex
              ].autoCreateSnapshots =
                Meteor.settings.autoCreateSnapshots ?
                  Meteor.settings.autoCreateSnapshots === true
                : false;
            if (testType.autoCompareTestRuns === undefined)
              application.testEnvironments[testEnvironmentIndex].testTypes[
                testTypeIndex
              ].autoCompareTestRuns =
                Meteor.settings.autoCompareTestRuns ?
                  Meteor.settings.autoCompareTestRuns === true
                : false;
            if (testType.enableAdapt === undefined)
              application.testEnvironments[testEnvironmentIndex].testTypes[
                testTypeIndex
              ].enableAdapt =
                Meteor.settings.enableAdapt ?
                  Meteor.settings.enableAdapt === true
                : true;
            if (testType.runAdapt === undefined)
              application.testEnvironments[testEnvironmentIndex].testTypes[
                testTypeIndex
              ].runAdapt =
                Meteor.settings.runAdapt ?
                  Meteor.settings.runAdapt === true
                : true;
            if (testType.adaptMode === undefined)
              application.testEnvironments[testEnvironmentIndex].testTypes[
                testTypeIndex
              ].adaptMode = 'DEFAULT';
          });
        },
      );

      const tstEnvIndex = application.testEnvironments
        .map(function (testEnv) {
          return testEnv.name;
        })
        .indexOf(req.body.testEnvironment);

      if (tstEnvIndex === -1) {
        const testTypes = [
          {
            name: req.body.workload,
            baselineTestRun:
              Meteor.settings.autoSetBaselineTestRun === true ?
                req.body.testRunId
              : undefined,
            tags: [],
            differenceScoreThreshold: 70,
            autoCompareTestRuns:
              Meteor.settings.autoCompareTestRuns ?
                Meteor.settings.autoCompareTestRuns === true
              : false,
            autoCreateSnapshots:
              Meteor.settings.autoCreateSnapshots ?
                Meteor.settings.autoCreateSnapshots === true
              : false,
            enableAdapt:
              Meteor.settings.enableAdapt ?
                Meteor.settings.enableAdapt === true
              : true,
            runAdapt:
              Meteor.settings.runAdapt ?
                Meteor.settings.runAdapt === true
              : true,
            adaptMode: 'BASELINE',
          },
        ];

        Applications.update(
          {
            _id: application._id,
          },
          {
            $push: {
              testEnvironments: {
                name: req.body.testEnvironment,
                testTypes: testTypes,
              },
            },
          },
        );
      } else {
        const testTypeIndex = application.testEnvironments[
          tstEnvIndex
        ].testTypes
          .map(function (testType) {
            return testType.name;
          })
          .indexOf(req.body.workload);

        if (testTypeIndex === -1) {
          application.testEnvironments[tstEnvIndex].testTypes.push({
            name: req.body.workload,
            baselineTestRun: req.body.testRunId,
            tags: [],
            differenceScoreThreshold: 70,
            autoCompareTestRuns:
              Meteor.settings.autoCompareTestRuns ?
                Meteor.settings.autoCompareTestRuns === true
              : false,
            autoCreateSnapshots:
              Meteor.settings.autoCreateSnapshots ?
                Meteor.settings.autoCreateSnapshots === true
              : false,
            enableAdapt:
              Meteor.settings.enableAdapt ?
                Meteor.settings.enableAdapt === true
              : true,
            runAdapt:
              Meteor.settings.runAdapt ?
                Meteor.settings.runAdapt === true
              : true,
            adaptMode: 'BASELINE',
          });

          Applications.update(
            {
              _id: application._id,
            },
            {
              $set: {
                testEnvironments: application.testEnvironments,
              },
            },
          );
        } else {
          if (
            req.body.tags &&
            application.testEnvironments[tstEnvIndex].testTypes[testTypeIndex]
              .tags.length !==
              _.union(
                application.testEnvironments[tstEnvIndex].testTypes[
                  testTypeIndex
                ].tags,
                req.body.tags,
              ).length
          ) {
            application.testEnvironments[tstEnvIndex].testTypes[
              testTypeIndex
            ].tags = _.union(
              application.testEnvironments[tstEnvIndex].testTypes[testTypeIndex]
                .tags,
              req.body.tags,
            );

            Applications.update(
              {
                _id: application._id,
              },
              {
                $set: {
                  testEnvironments: application.testEnvironments,
                },
              },
            );
          }
        }
      }
    }

    application = Applications.findOne({ name: req.body.systemUnderTest });
    const testEnvironmentIndex = application.testEnvironments
      .map((testEnvironment) => {
        return testEnvironment.name;
      })
      .indexOf(req.body.testEnvironment);
    const testTypeIndex = application.testEnvironments[
      testEnvironmentIndex
    ].testTypes
      .map((testType) => {
        return testType.name;
      })
      .indexOf(req.body.workload);

    //TODO deal with duplicate test run Id's!

    const testRun = TestRuns.findOne({
      $and: [
        { testRunId: req.body.testRunId },
        { application: req.body.systemUnderTest },
        { testEnvironment: req.body.testEnvironment },
        { testType: req.body.workload },
      ],
    });

    // In case of duplicate test run id, return 400 error

    const duplicateTestRunIdMessage = {
      message: `Test run id ${req.body.testRunId} already exists for system under test ${req.body.systemUnderTest}. Please use unique test run id`,
    };

    if (testRun && testRun.completed === true) {
      res.status(400).json(duplicateTestRunIdMessage);
    }

    /* If first request for test run, store variables */
    let variables = [];

    /* Filter out any empty variables */

    if (req.body.variables) {
      variables = req.body.variables.filter((variable) => {
        return variable.value && true && variable.value !== '';
      });
    }

    if (!testRun) {
      /* store variables as test run config key-value pairs */
      variables.forEach((variable) => {
        TestRunConfigs.insert({
          application: req.body.systemUnderTest,
          testEnvironment: req.body.testEnvironment,
          testType: req.body.workload,
          testRunId: req.body.testRunId,
          tags: ['Perfana'],
          key: variable.placeholder,
          value: variable.value,
        });
      });
    }

    /* If any running test request arrives after the test has already finished, ignore it! */

    if (!testRun || testRun.completed === false) {
      const plannedDuration =
        req.body.duration ?
          parseInt(req.body.duration) + parseInt(req.body.rampUp)
        : testRun ? getLastTestRunDuration(testRun)
        : -1;

      let duration;

      if (req.body.end) {
        duration = parseInt(
          (
            (new Date(req.body.end).getTime() -
              new Date(req.body.start).getTime()) /
            1000
          ).toString(),
        );
      } else {
        duration =
          testRun ?
            parseInt(
              (
                (new Date().getTime() - new Date(testRun.start).getTime()) /
                1000
              ).toString(),
            )
          : 0;
      }

      const testRunModifier = {
        $setOnInsert: {
          start:
            req.body.start ? new Date(Date.parse(req.body.start)) : new Date(),
          alerts: [],
          abort: false,
        },
        $set: {
          application: req.body.systemUnderTest,
          testType: req.body.workload,
          testEnvironment: req.body.testEnvironment,
          plannedDuration: plannedDuration,
          duration: duration,
          rampUp: req.body.rampUp,
          completed: req.body.completed,
          CIBuildResultsUrl:
            req.body.CIBuildResultsUrl !== null ?
              req.body.CIBuildResultsUrl
            : '',
          applicationRelease: req.body.version,
          annotations:
            req.body.annotations !== null && req.body.annotations !== 'null' ?
              req.body.annotations
            : '',
          variables: variables,
          tags: req.body.tags,
          end: req.body.end ? new Date(Date.parse(req.body.end)) : new Date(),
          expires: snapshotExpires,
          expired: false,
          valid: true,
          adapt: {
            mode: application.testEnvironments[testEnvironmentIndex].testTypes[
              testTypeIndex
            ].adaptMode,
            differencesAccepted:
              (
                application.testEnvironments[testEnvironmentIndex].testTypes[
                  testTypeIndex
                ].adaptMode === 'BASELINE'
              ) ?
                'ACCEPTED'
              : 'TBD',
          },
          reasonsNotValid: [],
          'status.evaluatingChecks': 'STARTED',
          'status.evaluatingComparisons': 'STARTED',
          'status.evaluatingAdapt': 'STARTED',
          'status.lastUpdate': new Date(),
        },
      };

      if (req.body.abort) testRunModifier.$set.abort = req.body.abort;
      if (req.body.abortMessage)
        testRunModifier.$set.abortMessage = req.body.abortMessage;

      TestRuns.upsert(
        {
          testRunId: req.body.testRunId,
        },
        testRunModifier,
      );

      const updatedTestRun = TestRuns.findOne({
        $and: [
          { application: req.body.systemUnderTest },
          { testType: req.body.workload },
          { testEnvironment: req.body.testEnvironment },
          { testRunId: req.body.testRunId },
        ],
      });

      // console.log(JSON.stringify(updatedTestRun));

      if (updatedTestRun.completed === false) {
        // noinspection JSCheckFunctionSignatures
        log.info(
          'Processed running test request for application: ' +
            updatedTestRun.application +
            ', testRunId: ' +
            updatedTestRun.testRunId,
        );
      } else {
        // noinspection JSCheckFunctionSignatures
        log.info(
          'Processed running test request for application: ' +
            updatedTestRun.application +
            ', testRunId: ' +
            updatedTestRun.testRunId,
        );
      }

      res.status(200).json(updatedTestRun);

      /* If the test run is completed, update metric classifications */
      if (updatedTestRun.completed === true) {

        const analyzeTestEndpoint = `/data/analyzeTest/${updatedTestRun.testRunId}?adapt=true`;
        perfanaDsApiPost(analyzeTestEndpoint, {})
          .then((response) => {
            log.info(`Successfully analyzed test run ${updatedTestRun.testRunId}: ${response}`);
          })
          .catch((error) => {
            log.error(`Failed to analyze test run ${updatedTestRun.testRunId}: ${error}`);
          });
          
        createMetricClassifications(updatedTestRun);

        const autoCreateSnapshots =
          application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].autoCreateSnapshots;

        if (autoCreateSnapshots === true) {
          createSnapshots(updatedTestRun, () => {});
        }
      }
    }
  } catch (err) {
    log.error('Failed updating running test due to: ', err);

    // res.status(500).send({ error: err});
    res.status(500).send({
      message: err.message,
      stack: err.stack,
      name: err.name,
    });
  }
};

// export const createSnapshotsAndBenchmarks = (updatedTestRun, callback) =>{
//
//     createSnapshots(updatedTestRun, function (err, testRunIncSnapshots) {
//
//         if (err) {
//
//             log.error('Create snapshot failed', err);
//
//         }
//

/* get test run and continue creating benchmarks */
// testRunIncSnapshots = TestRuns.findOne({
//     $and: [
//         {application: updatedTestRun.application},
//         {testType: updatedTestRun.testType},
//         {testEnvironment: updatedTestRun.testEnvironment},
//         {testRunId: updatedTestRun.testRunId},
//     ]
// });
//
// createBenchmarks(testRunIncSnapshots, function (error, testRun) {
//
//     if (error) {
//
//         console.log(`Failed to create benchmarks for test run ${testRun.testRunId}, error: ${error}`);
//
//         callback();
//
//     } else {
//
//         console.log(`Successfully created benchmarks for test run ${testRun.testRunId}`);
//
//         callback();
//     }
//
// })

//     });
// }

const getLastTestRunDuration = (currentTestRun) => {
  /* get completed test runs */

  const testRuns = TestRuns.find(
    {
      $and: [
        { application: currentTestRun.application },
        { testType: currentTestRun.testType },
        { testEnvironment: currentTestRun.testEnvironment },
        { completed: true },
        { duration: { $exists: true, $ne: null } },
      ],
    },
    { sort: { end: -1 } },
  ).fetch();

  if (testRuns.length > 0) {
    return testRuns[0].duration;
  } else {
    return -1;
  }
};
