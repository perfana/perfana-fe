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

import { TestRuns } from '../collections/testruns';
import { Snapshots } from '../collections/snapshots';
import { ApplicationDashboards } from '../collections/applicationDashboards';
import { log } from '/both/logger';
import async from 'async';

if (Meteor.isServer) {
  Meteor.publish('snapshots', (query, component) => {
    check(query, Match.OneOf(undefined, null, Object));
    check(component, String);

    log.debug(
      '######### snapshot subscription query from component ' +
        component +
        ': ' +
        JSON.stringify(query),
    );

    return Snapshots.find(query);
  });
}

Meteor.methods({
  getTestRunSnapshotsStatus: (testRun) => {
    check(testRun, Object);

    const wrap = Meteor.makeAsync(getTestRunSnapshotsStatusFn);
    return wrap(testRun);
  },

  persistTestRunReport: (testRun) => {
    check(testRun, Object);

    const wrap = Meteor.makeAsync(persistTestRunReportFn);
    return wrap(testRun);
  },
});

const persistTestRunReportFn = (testRun, callback) => {
  const snapshots = Snapshots.find({
    $and: [
      { application: testRun.application },
      { testEnvironment: testRun.testEnvironment },
      { testType: testRun.testType },
      { testRunId: testRun.testRunId },
    ],
  }).fetch();

  if (snapshots) {
    async.each(
      snapshots,
      (snapshot, updateSnapshotCallback) => {
        Meteor.call('updateSnapshot', testRun, snapshot, 0, (error) => {
          // set expiry to 0

          if (error) {
            log.error('Error updating snapshot: ' + error);
            updateSnapshotCallback(error);
          } else {
            updateSnapshotCallback();
          }
        });
      },
      (err) => {
        if (err) {
          callback(err, null);
        } else {
          TestRuns.update(
            {
              _id: testRun._id,
            },
            {
              $set: { expires: 0 },
            },
          );

          callback(null, true);
        }
      },
    );
  }
};

const getTestRunSnapshotsStatusFn = (testRun, callback) => {
  try {
    if (testRun.status && testRun.status.creatingSnapshots) {
      switch (testRun.status.creatingSnapshots) {
        case 'STARTED':
          callback(null, 'Started');
          break;
        case 'IN_PROGRESS':
          callback(null, 'In progress ...');
          break;
        case 'COMPLETE':
          callback(null, 'Completed');
          break;
        case 'ERROR':
          callback(null, 'Completed, with errors');
          break;
        case 'NO_DASHBOARDS_FOUND':
          callback(null, 'No dashboards found for this test run');
          break;
        default:
          callback(null, 'Status unknown');
      }
    } else {
      /* check expected check results */

      const expectedSnapshots = ApplicationDashboards.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
        ],
      }).fetch();

      if (expectedSnapshots.length > 0) {
        const completedSnapshots = Snapshots.find({
          $and: [
            { application: testRun.application },
            { testEnvironment: testRun.testEnvironment },
            { testType: testRun.testType },
            { testRunId: testRun.testRunId },
            { status: 'COMPLETE' },
          ],
        }).fetch();

        if (completedSnapshots.length === expectedSnapshots.length) {
          callback(null, 'Completed');
        } else {
          const completedIncErrorSnapshots = Snapshots.find({
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

          if (completedIncErrorSnapshots.length === expectedSnapshots) {
            callback(null, 'Completed, with errors');
          } else {
            callback(null, 'In progress ...');
          }
        }
      } else {
        callback(null, 'No dashboards configured');
      }
    }
  } catch (err) {
    callback(err, null);
  }
};
