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

// noinspection JSCheckFunctionSignatures

import { ApplicationDashboards } from '/imports/collections/applicationDashboards';
import { check } from 'meteor/check';
import { TestRuns } from '/imports/collections/testruns';
import { Grafanas } from '/imports/collections/grafanas';
import { grafanaCallPost } from '/imports/helpers/grafana/grafana-api-with-api-key';
import { log } from '/both/logger';
import async from 'async';
import _ from 'lodash';

export const sendEvent = function (req, res) {
  // noinspection JSCheckFunctionSignatures
  log.info('event: ' + JSON.stringify(req.body));
  try {
    check(req.body, {
      systemUnderTest: String,
      testEnvironment: String,
      title: String,
      description: String,
      tags: [String],
    });

    const description = req.body.title + ' | ' + req.body.description;

    // ignore Test start and end events
    if (req.body.title !== 'Test end' && req.body.title !== 'Test start') {
      const tags = [
        `system_under_test=${req.body.systemUnderTest}`,
        `test_environment=${req.body.testEnvironment}`,
      ];

      _.each(req.body.tags, function (tag) {
        tags.push(tag);
      });

      const runningTests = TestRuns.find({
        $and: [
          {
            end: {
              $gte: new Date(new Date() - 120 * 1000), // ms
            },
          },
          { completed: false },
        ],
      }).fetch();

      if (runningTests.length === 0) {
        res.status(404).send({
          message: `No running tests found matching the system under test ${req.body.systemUnderTest} and test environment ${req.body.testEnvironment}.`,
        });
      } else {
        // get grafana dashboards for running tests

        _.each(runningTests, function (runningTest) {
          res.status(200).send({
            message:
              'Creating event for test run: ' +
              runningTest.testRunId +
              ', system under test: ' +
              runningTest.application +
              ', test environment: ' +
              runningTest.testEnvironment,
          });

          // log.error('test is running for: ' + runningTest.application)

          if (
            req.body.systemUnderTest === runningTest.application &&
            req.body.testEnvironment === runningTest.testEnvironment
          ) {
            /* If description of event is 'manually aborted', create snapshots and benchmarks */

            if (req.body.description === 'manually aborted') {
              // createSnapshotsAndBenchmarks(runningTest, () =>{
              // createSnapshots(runningTest, () =>{
              //
              // })
            }
            // get all dashboards for the running test

            const dashboards = ApplicationDashboards.find({
              $and: [
                { application: runningTest.application },
                { testEnvironment: runningTest.testEnvironment },
              ],
            }).fetch();

            const sentToDashboardIds = [];
            const annotations = [];

            async.eachLimit(
              dashboards,
              1,
              function (dashboard, callback) {
                const alreadySent =
                  sentToDashboardIds.indexOf(dashboard.dashboardUid) !== -1;

                if (!alreadySent) {
                  const grafana = Grafanas.findOne({
                    label: dashboard.grafana,
                  });
                  const annotationsBody = {
                    dashboardId: dashboard.dashboardId,
                    isRegion: false,
                    tags: _.uniq(tags),
                    text: description,
                  };

                  Meteor.makeAsync(grafanaCallPost)(
                    grafana,
                    '/api/annotations',
                    annotationsBody,
                    function (err, annotationsResponse) {
                      if (err) {
                        callback();
                      } else {
                        if (
                          annotationsResponse.data &&
                          annotationsResponse.data.id
                        ) {
                          annotations.push({
                            grafanaId: grafana._id,
                            id: annotationsResponse.data.id,
                          });
                          sentToDashboardIds.push(dashboard.dashboardUid);
                          callback();
                        } else {
                          callback();
                        }
                      }
                    },
                  );
                } else {
                  callback();
                }
              },
              function (err) {
                if (err) {
                  log.error(err);
                } else {
                  // add events to test run

                  const eventsModifier = {
                    $push: {
                      events: {
                        timestamp: new Date(),
                        title: req.body.title,
                        description: req.body.description,
                        tags: tags,
                        annotations: annotations,
                      },
                    },
                  };

                  log.info('event added for testrun: ' + runningTest.testRunId);

                  TestRuns.update(
                    {
                      $and: [
                        {
                          testRunId: runningTest.testRunId,
                        },
                        {
                          application: runningTest.application,
                        },
                      ],
                    },
                    eventsModifier,
                  );
                }
              },
            );
          }
        });
      }
    } else {
      res.status(200).send({ message: `${req.body.title} event received` });
    }
  } catch (e) {
    log.error('error: ' + e);

    res.status(400).send(e);
  }
};
