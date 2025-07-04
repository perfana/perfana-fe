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

import { TestRuns } from '/imports/collections/testruns';
import { Applications } from '/imports/collections/applications';
import { Grafanas } from '/imports/collections/grafanas';
import { GrafanaDashboards } from '/imports/collections/grafanaDashboards';
import { Benchmarks } from '/imports/collections/benchmarks';
import { Snapshots } from '/imports/collections/snapshots';
import { ApplicationDashboards } from '/imports/collections/applicationDashboards';
import { Configuration } from '/imports/collections/configuration';
import {
  checkIfTestRunIsBaseline,
  dynamicSort,
  getDataRetention,
  removeTestRunAsBaseline,
  renderGrafanaServerUrl,
} from '/imports/helpers/utils';
import async from 'async';
import { getQueues } from '../helpers/snapshot-queues';
import _ from 'lodash';

export const createSnapshots = function (testRun) {
  if (testRunSanityCheck(testRun) === true) {
    const environmentDashboards = ApplicationDashboards.find({
      $and: [
        { application: testRun.application },
        { testEnvironment: testRun.testEnvironment },
      ],
    }).fetch();

    /* extend dashboards with property hasBenchmark*/

    const benchmarks = Benchmarks.find({
      $and: [
        { application: testRun.application },
        { testEnvironment: testRun.testEnvironment },
        { testType: testRun.testType },
      ],
    }).fetch();

    environmentDashboards.forEach((dashboard, i) => {
      let hasBenchmark = false;
      benchmarks.forEach((benchmark) => {
        if (benchmark.dashboardUid === dashboard.dashboardUid) {
          hasBenchmark = true;
        }
      });
      _.extend(environmentDashboards[i], { hasBenchmark: hasBenchmark });
    });

    if (environmentDashboards.length > 0) {
      insertSnapshots(
        testRun,
        environmentDashboards.sort(dynamicSort('-hasBenchmark')),
        () => {},
      );
    }
  }
};

const testRunSanityCheck = (testRun) => {
  const reasonsNotValid = testRun.reasonsNotValid;

  // check if test run duration > minimum configured duration

  const minimumTestRunDuration = Configuration.findOne({
    key: 'minimumTestRunDuration',
  });

  if (minimumTestRunDuration.value > testRun.duration) {
    reasonsNotValid.push(
      `Test run duration shorter than configured minimum duration of ${minimumTestRunDuration.value} seconds`,
    );

    TestRuns.update(
      {
        _id: testRun._id,
      },
      {
        $set: {
          valid: false,
          reasonsNotValid: reasonsNotValid,
        },
      },
    );

    if (checkIfTestRunIsBaseline(testRun) === true) {
      removeTestRunAsBaseline(testRun);
    }
  }

  const updatedTestRun = TestRuns.findOne({
    _id: testRun._id,
  });

  return updatedTestRun.valid;
};

export const insertSnapshots = (testRun, dashboards, callback) => {
  const application = Applications.findOne({ name: testRun.application });

  const filteredEnvironment = application.testEnvironments.filter(
    (environment) => environment.name === testRun.testEnvironment,
  );

  const filteredTestType = filteredEnvironment[0].testTypes.filter(
    (testType) => testType.name === testRun.testType,
  );

  const isBaselineTestRun =
    filteredTestType[0].baselineTestRun === testRun.testRunId;

  getQueues().then((queues) => {
    async.each(
      dashboards,
      (dashboard, insertSnapshotCallback) => {
        const retention = getDataRetention(dashboard);

        // Only create snapshot if test run is not older than retention period
        if (
          new Date().getTime() - new Date(testRun.end).getTime() <
          retention * 1000
        ) {
          const grafana = Grafanas.findOne({ label: dashboard.grafana });

          const grafanaDashboard = GrafanaDashboards.findOne({
            $and: [
              { grafana: dashboard.grafana },
              { name: dashboard.dashboardName },
            ],
          });

          const dashboardUrl = renderGrafanaServerUrl(
            testRun,
            dashboard,
            grafana,
            grafanaDashboard,
          );

          const loginUrl =
            grafana.serverUrl ?
              `${grafana.serverUrl}/login`
            : `${grafana.clientUrl}/login`;

          const expires =
            isBaselineTestRun === true ? 0
            : Meteor.settings.snapshotExpires ?
              parseInt(Meteor.settings.snapshotExpires)
            : 7776000;

          const snapshot = {
            application: testRun.application,
            testType: testRun.testType,
            testEnvironment: testRun.testEnvironment,
            testRunId: testRun.testRunId,
            grafana: grafana.label,
            dashboardUid: dashboard.dashboardUid,
            dashboardUrl: dashboardUrl,
            loginUrl: loginUrl,
            snapshotTimeout: dashboard.snapshotTimeout,
            dashboardLabel: dashboard.dashboardLabel,
            expires: expires,
            hasChecks: dashboard.hasBenchmark ? dashboard.hasBenchmark : false,
            status: 'NEW',
            updateAt: new Date(),
          };

          Snapshots.insert(snapshot, (error, id) => {
            if (error) {
              insertSnapshotCallback(error, null);
            } else {
              if (snapshot.hasChecks === true) {
                queues.snapshotWithChecksQueue.add(
                  _.extend(snapshot, { _id: id }),
                  () => {},
                );
              } else {
                queues.snapshotQueue.add(
                  _.extend(snapshot, { _id: id }),
                  () => {},
                );
              }
              insertSnapshotCallback(null, true);
            }
          });
        } else {
          insertSnapshotCallback(null, true);
        }
      },
      (err) => {
        if (err) {
          callback(err, null);
        } else {
          callback(null, dashboards);
        }
      },
    );
  });
};
/// todo: MOVE TO CRUNCHER
