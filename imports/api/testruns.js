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

// noinspection JSUnusedLocalSymbols

import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { ReactiveVar } from 'meteor/reactive-var';
import _ from 'lodash';
import { TestRuns } from '/imports/collections/testruns';
import { TestRunConfigs } from '/imports/collections/testrunConfigs';
import { Applications } from '/imports/collections/applications';
import { Snapshots } from '/imports/collections/snapshots';
import { CheckResults } from '/imports/collections/checkResults';
import { CompareResults } from '/imports/collections/compareResults';
import { Grafanas } from '/imports/collections/grafanas';
import { Teams } from '/imports/collections/teams';
import {
  grafanaCall,
  grafanaCallDelete,
  grafanaCallPost,
} from '../helpers/grafana/grafana-api-with-api-key';
import { insertSnapshots } from '/server/imports/api/createSnapshots';
// import {
//     writeCheckResultPointsForAllTestRuns,
//     writeTrendPointsForAllTestRuns,
//     writeTrendPointsForTestRun
// } from '../../server/imports/helpers/influx'
import { Benchmarks } from '../collections/benchmarks';
import { dynamicSort, getDataRetention } from '../helpers/utils';
import { ApplicationDashboards } from '../collections/applicationDashboards';
import { userHasPermission } from '../helpers/checkPermission';
import { log } from '/both/logger';
import async from 'async';
import { getQueues } from '/server/imports/helpers/snapshot-queues';
import { GenericChecks } from '../collections/genericChecks';
import { DsMetrics } from '../collections/dsMetrics';
import { DsMetricStatistics } from '../collections/dsMetricStatistics';
import { DsPanels } from '../collections/dsPanels';
import { DsCompareStatistics } from '../collections/dsCompareStatistics';
import { DsAdaptResults } from '../collections/dsAdaptResults';
import { BatchProcessEvents } from '../collections/batchProcessEvents';
import { DsControlGroupStatistics } from '../collections/dsControlGroupStatistics';
import { DsAdaptConclusion } from '../collections/dsAdaptConclusion';
import { DsAdaptTrackedResults } from '../collections/dsAdaptTrackedResults';
import { DsTrackedDifferences } from '../collections/dsTrackedDifferences';
import { DsChangepoints } from '../collections/dsChangePoints';
import { callBatchProcess } from '../helpers/perfana-ds-api';

if (Meteor.isServer) {
  const currentTime = new ReactiveVar(new Date().valueOf());

  Meteor.setInterval(() => {
    currentTime.set(new Date().valueOf());
  }, 5000); // ms

  Meteor.publish('testRunKeyMetrics', (query) => {
    check(query, Match.OneOf(undefined, null, Object));
    return TestRuns.find(query);
  });

  Meteor.publish('applicationTestRuns', (application) => {
    check(application, String);
    return TestRuns.find({ application: application });
  });

  Meteor.publish('testRuns', (component, limit, query, team) => {
    check(component, String);
    check(limit, Number);
    check(query, Match.OneOf(undefined, null, Object));
    check(team, Match.OneOf(undefined, null, String));
    log.debug(
      '######### testRuns subscription query from component ' +
        component +
        ': ' +
        JSON.stringify(query) +
        ', limit: ' +
        limit,
    );

    if (team) {
      const testRunTeam = Teams.findOne({ name: team });
      const applicationNames = Applications.find({ team: testRunTeam._id })
        .fetch()
        .map((application) => {
          return application.name;
        });

      query.$and.push({ application: { $in: applicationNames } });
    }
    if (query && query.$and && query.$and.length > 0) {
      return TestRuns.find(query, {
        sort: { end: -1 },
        limit:
          Meteor.settings.testRunsSubscriptionLimit ?
            Meteor.settings.testRunsSubscriptionLimit
          : limit,
      });
    } else {
      return TestRuns.find(
        {},
        {
          sort: { end: -1 },
          limit:
            Meteor.settings.testRunsSubscriptionLimit ?
              Meteor.settings.testRunsSubscriptionLimit
            : limit,
        },
      );
    }
  });

  Meteor.publish('runningTests', () =>
    TestRuns.find(
      {
        $and: [
          {
            end: {
              $gte: new Date(currentTime.get() - 30 * 1000), // ms
            },
          },
          { completed: false },
        ],
      },
      { sort: { end: -1 } },
    ),
  );

  Meteor.publish('testRunTypeAheadValues', (query, field) => {
    check(query, Match.OneOf(undefined, null, String));
    check(field, String);

    const fields = {};
    fields[field] = 1;
    // return only id and categories field for all your things
    return TestRuns.find(query, { fields: fields });
  });
}

Meteor.methods({
  deleteTestRunReportComparison: (testRun, compareResultLabel) => {
    check(testRun, Object);
    check(compareResultLabel, String);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'update.test-run-report.unauthorized',
        'The user is not authorized to update test run report for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(deleteTestRunReportComparisonFn);
    return wrap(testRun, compareResultLabel);
  },
  addTestRunReportComparison: (
    testRun,
    compareResultLabel,
    baselineTestRunId,
  ) => {
    check(testRun, Object);
    check(compareResultLabel, String);
    check(baselineTestRunId, String);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'update.test-run-report.unauthorized',
        'The user is not authorized to update test run report for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(addTestRunReportComparisonsFn);
    return wrap(testRun, compareResultLabel, baselineTestRunId);
  },
  updateTestRunTags: (testRun, tags) => {
    check(testRun, Object);
    check(tags, [String]);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'update.test-run-tags.unauthorized',
        'The user is not authorized to update test run tags for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(updateTestRunTagsFn);
    return wrap(testRun, tags);
  },
  deleteTestRunAlertOrEvent: (testRun, annotationIds) => {
    check(testRun, Object);
    check(annotationIds, [String]);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'update.test-run-tags.unauthorized',
        'The user is not authorized to update test run tags for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(deleteTestRunAlertOrEventFn);
    return wrap(testRun, annotationIds);
  },
  getTestRunVariables: (application, testEnvironment, testType) => {
    check(application, String);
    check(testEnvironment, String);
    check(testType, String);

    if (!userHasPermission(Meteor.userId(), application)) {
      throw new Meteor.Error(
        'get.test-run-variables.unauthorized',
        'The user is not authorized to get test run variables for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(getTestRunVariablesFn);
    return wrap(application, testEnvironment, testType);
  },
  updateTestRunTimestamp: (testRun, timestampType, timestamp) => {
    check(testRun, Object);
    check(timestampType, String);
    check(timestamp, String);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'update.test-run-tags.unauthorized',
        'The user is not authorized to update test run timestamps for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(updateTestRunTimestampFn);
    return wrap(testRun, timestampType, timestamp);
  },
  getTestRunsCount: (query) => {
    check(query, Object);

    const wrap = Meteor.makeAsync(getTestRunsCountFn);
    return wrap(query);
  },
  getTestRuns: (query) => {
    check(query, Object);

    const wrap = Meteor.makeAsync(getTestRunsFn);
    return wrap(query);
  },
  getTestRun: (application, testRunId) => {
    check(application, Match.OneOf(undefined, null, String));
    check(testRunId, Match.OneOf(undefined, null, String));

    if (application && testRunId) {
      return TestRuns.findOne({
        $and: [{ application: application }, { testRunId: testRunId }],
      });
    } else {
      return undefined;
    }
  },
  setTestRunAsBaseline: (testRun) => {
    check(testRun, Object);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'update.set-test-run-baseline.unauthorized',
        'The user is not authorized to set a baseline for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(setTestRunAsBaselineFn);
    return wrap(testRun);
  },
  updateTestRun: (testRun, testRunId) => {
    check(testRun, Object);
    check(testRunId, String);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'update.set-test-run-baseline.unauthorized',
        'The user is not authorized to update test runs for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(updateTestRunFn);
    return wrap(testRun, testRunId);
  },
  removeTestRunReport: (testRun) => {
    check(testRun, Object);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'update.set-test-run-baseline.unauthorized',
        'The user is not authorized to remove a test run report for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(removeTestRunReportFn);
    return wrap(testRun);
  },
  updateTestRunReportAnnotations: (testRun) => {
    check(testRun, Object);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'update.set-test-run-baseline.unauthorized',
        'The user is not authorized to update a test run report for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(updateTestRunReportAnnotationsFn);
    return wrap(testRun);
  },
  updateTestRunApplicationRelease: (testRun) => {
    check(testRun, Object);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'update.set-test-run-baseline.unauthorized',
        'The user is not authorized to update a test run report for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(updateTestRunApplicationReleaseFn);
    return wrap(testRun);
  },
  updateTestRunReportComparisonAnnotations: (testRun) => {
    check(testRun, Object);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'update.set-test-run-baseline.unauthorized',
        'The user is not authorized to update a test run report for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(updateTestRunReportComparisonAnnotationsFn);
    return wrap(testRun);
  },
  updateSnapshot: (testRun, snapshot, expires) => {
    check(testRun, Object);
    check(snapshot, Object);
    check(expires, Number);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'update.snapshot.unauthorized',
        'The user is not authorized to update snapshots for this system under test',
      );
    }

    const storedSnapshot = Snapshots.findOne({
      $and: [
        { application: testRun.application },
        { testEnvironment: testRun.testEnvironment },
        { testType: testRun.testType },
        { testRunId: testRun.testRunId },
        { dashboardUid: snapshot.dashboardUid },
        { dashboardLabel: snapshot.dashboardLabel },
      ],
    });

    const wrap = Meteor.makeAsync(updateSnapshotFn);
    return wrap(storedSnapshot, expires);
  },

  updateTestRunAbort: (testRun) => {
    check(testRun, Object);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'update.test-run.unauthorized',
        'The user is not authorized to abort test runs for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(updateTestRunAbortFn);
    return wrap(testRun);
  },
  updateTestRunAnnotations: (testRun) => {
    check(testRun, Object);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'update.test-run.unauthorized',
        'The user is not authorized to update test runs for this system under test',
      );
    }

    TestRuns.update(
      {
        $and: [
          {
            testRunId: testRun.testRunId,
          },
          {
            application: testRun.application,
          },
        ],
      },
      {
        $set: {
          annotations: testRun.annotations,
        },
      },
    );

    // writeTrendPointsForTestRun(testRun);
  },

  deleteTestRun: (id) => {
    check(id, String);

    const testRun = TestRuns.findOne({ _id: id });

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'delete.test-run.unauthorized',
        'The user is not authorized to delete test runs for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(deleteTestRunFn);

    return wrap(testRun);
  },
  markTestRunAsValid: (id) => {
    check(id, String);

    const testRun = TestRuns.findOne({ _id: id });

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'delete.test-run.unauthorized',
        'The user is not authorized to delete test runs for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(markTestRunAsValidFn);

    return wrap(testRun);
  },

  updateSnapshots: (selectedTestRuns, applicationDashboardIds) => {
    check(selectedTestRuns, Array);
    check(applicationDashboardIds, Array);

    const wrap = Meteor.makeAsync(updateSnapshotsFn);

    return wrap(selectedTestRuns, applicationDashboardIds);
  },
  batchEvaluateSelectedTestRuns: (testRunsIds, type) => {
    check(testRunsIds, Array);
    check(type, String);
    const wrap = Meteor.makeAsync(batchEvaluateSelectedTestRunsFn);

    return wrap(testRunsIds, type);
  },

  createSnapshots: (testRun) => {
    check(testRun, Object);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'create.snapshot.unauthorized',
        'The user is not authorized to create snapshots for this system under test',
      );
    }

    const applicationDashboards = ApplicationDashboards.find({
      $and: [
        { application: testRun.application },
        { testEnvironment: testRun.testEnvironment },
      ],
    }).fetch();

    const snaphots = Snapshots.find({
      $and: [
        { application: testRun.application },
        { testEnvironment: testRun.testEnvironment },
        { testType: testRun.testType },
        { testRunId: testRun.testRunId },
      ],
    }).fetch();

    const missingApplicationDashboards = [];

    applicationDashboards.forEach((applicationDashboard) => {
      const existingSnapshot = snaphots.filter((snapshot) => {
        return (
          applicationDashboard.grafana === snapshot.grafana &&
          applicationDashboard.dashboardUid === snapshot.dashboardUid &&
          applicationDashboard.dashboardLabel === snapshot.dashboardLabel
        );
      });

      if (existingSnapshot.length === 0) {
        const benchmarks = Benchmarks.find({
          $and: [
            { application: applicationDashboard.application },
            { testEnvironment: applicationDashboard.testEnvironment },
            { testType: testRun.testType },
            { grafana: applicationDashboard.grafana },
            { dashboardUid: applicationDashboard.dashboardUid },
            { dashboardLabel: applicationDashboard.dashboardLabel },
          ],
        }).fetch();

        if (benchmarks.length > 0)
          _.extend(applicationDashboard, { hasBenchmark: true });

        missingApplicationDashboards.push(applicationDashboard);
      }
    });

    const wrap = Meteor.makeAsync(insertSnapshots);

    return wrap(
      testRun,
      missingApplicationDashboards.sort(dynamicSort('-hasBenchmark')),
    );
  },
  deleteSnapshot: (
    testRun,
    grafanaLabel,
    dashboardUid,
    dashboardLabel,
    snapshotDeleteUrl,
    snapshot,
  ) => {
    check(testRun, Object);
    check(grafanaLabel, String);
    check(dashboardUid, String);
    check(dashboardLabel, String);
    check(
      snapshotDeleteUrl,
      Match.Optional(Match.OneOf(undefined, null, String)),
    );
    check(snapshot, Object);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'delete.snapshot.unauthorized',
        'The user is not authorized to delete snapshots for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(deleteSnapshotFn);

    return wrap(
      testRun,
      grafanaLabel,
      dashboardUid,
      dashboardLabel,
      snapshotDeleteUrl,
      snapshot,
    );
  },
  deleteAllSnapshots: (testRun) => {
    check(testRun, Object);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'delete.snapshot.unauthorized',
        'The user is not authorized to delete snapshots for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(deleteAllSnapshotsFn);

    return wrap(testRun);
  },
  updateSnapshotStatus: (snapshot) => {
    check(snapshot, Object);

    if (!userHasPermission(Meteor.userId(), snapshot.application)) {
      throw new Meteor.Error(
        'update.snapshot.unauthorized',
        'The user is not authorized to update snapshots for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(updateSnapshotStatusFn);

    return wrap(snapshot);
  },

  getTypeaheadValues: (queryParam, queryFieldParam, additionalQueryItems) => {
    check(queryParam, String);
    check(queryFieldParam, String);
    check(additionalQueryItems, [Object]);

    const query = queryFieldParam === 'team' ? '.*' : queryParam;

    const queryRegex = new RegExp(query, 'i');

    const completeQuery = { $and: [] };

    let distinctQuery = {};

    const queryField =
      queryFieldParam === 'team' ? 'application' : queryFieldParam;

    distinctQuery[queryField] = { $regex: queryRegex };

    completeQuery.$and.push(distinctQuery);

    _.each(additionalQueryItems, (additionalQueryItem) => {
      distinctQuery = {};
      distinctQuery[additionalQueryItem.queryField] = additionalQueryItem.query;
      completeQuery.$and.push(distinctQuery);
    });

    const distinct = Meteor.makeAsync(
      TestRuns.rawCollection().distinct,
      TestRuns.rawCollection(),
    );

    if (queryFieldParam === 'team') {
      const applicationNames = distinct(queryField, completeQuery, {
        sort: { name: 1 },
      });

      return Applications.find(
        {
          $and: [
            { name: { $in: applicationNames.data } },
            { team: queryParam },
          ],
        },
        { sort: { name: 1 } },
      )
        .fetch()
        .map((t) => t.name);
    } else {
      return distinct(queryField, completeQuery, { sort: { name: 1 } });
    }
  },
  getBaselineTestRuns: (params) => {
    check(params, Match.OneOf(undefined, null, Object));
    if (params.params !== null) {
      const testRuns = TestRuns.find(
        {
          $and: [
            { application: params.params.application },
            { testEnvironment: params.params.testEnvironment },
            { testType: params.params.testType },
          ],
        },
        { sort: { end: -1 } },
      );

      return testRuns.map((t) => ({
        label: t.testRunId,
        value: t.testRunId,
      }));
    } else {
      return [];
    }
  },
  // createTrendGraphs: (application, testType, testEnvironment) => {
  //
  //     const wrap = Meteor.makeAsync(writeTrendPointsForAllTestRuns);
  //
  //     return wrap(application, testType, testEnvironment);
  //
  // },
  // testRunSelector(session) {
  //     check(session, Object)
  //
  //     let valueInSeconds, targetDate;
  //     let query = {$and: []};
  //
  //     if (session.application) query.$and.push({application: session.application }) ;
  //     if (session.testEnvironment) query.$and.push({testEnvironment: session.testEnvironment }) ;
  //     if (session.testType) query.$and.push({testType: session.testType }) ;
  // if (session.recentInterval){
  //     valueInSeconds = periods.filter(period => period.value == session.recentInterval)
  //     targetDate = new Date(new Date().getTime() - parseInt(valueInSeconds[0].valueInSeconds) * 1000);
  //     query.$and.push({start: {'$gt': targetDate} }) ;
  // } else{
  //     valueInSeconds = periods.filter(period => period.value == 'Last 3 months')
  //     targetDate = new Date(new Date().getTime() - parseInt(valueInSeconds[0].valueInSeconds) * 1000);
  //     query.$and.push({start: {'$gt': targetDate} }) ;
  // }

  //     return query
  //
  // },
  testRunUpdateViewedBy: (testRun, user) => {
    check(testRun, Object);
    check(user, Object);

    // if (!userHasPermission(Meteor.userId(), testRun.application)) {
    //     throw new Meteor.Error('update.test-run.unauthorized',
    //         'The user is not authorized to update test runs for this system under test');
    // }

    TestRuns.update(
      {
        _id: testRun._id,
      },
      {
        $push: {
          viewedBy: user._id,
        },
      },
    );
  },
  testRunsUpdateViewedBy: (testRuns, user) => {
    check(testRuns, [Object]);
    check(user, Object);

    // if (!userHasPermission(Meteor.userId(), testRun.application)) {
    //     throw new Meteor.Error('update.test-run.unauthorized',
    //         'The user is not authorized to update test runs for this system under test');
    // }

    try {
      const testRunIds = testRuns.map((testRun) => testRun.testRunId);

      TestRuns.update(
        {
          testRunId: { $in: testRunIds },
        },
        {
          $push: {
            viewedBy: user._id,
          },
        },
        { multi: true },
      );
    } catch (error) {
      throw new Meteor.Error('500', `${error}`);
    }
  },
  getDistinctApplicationsForProfile: (selectedProfileName) => {
    check(selectedProfileName, String);

    const genericCheckIds = GenericChecks.find({ profile: selectedProfileName })
      .fetch()
      .map((genericCheckId) => genericCheckId.checkId);

    const distinct = Meteor.makeAsync(
      Benchmarks.rawCollection().distinct,
      Benchmarks.rawCollection(),
    );
    return distinct('application', {
      genericCheckId: { $in: genericCheckIds },
    });
  },
});

const markTestRunAsValidFn = (testRun, callback) => {
  try {
    TestRuns.update(
      {
        _id: testRun._id,
      },
      {
        $set: {
          valid: true,
        },
      },
    );

    callback(null, true);
  } catch (err) {
    callback(err, null);
  }
};

const updateTestRunAbortFn = (testRun, callback) => {
  try {
    TestRuns.update(
      {
        $and: [
          {
            testRunId: testRun.testRunId,
          },
          {
            application: testRun.application,
          },
        ],
      },
      {
        $set: {
          abort: testRun.abort,
          abortMessage: testRun.abortMessage,
        },
      },
    );

    callback(null, true);
  } catch (err) {
    callback(err, null);
  }
};

const deleteTestRunFn = (testRun, callback) => {
  /* if test run is part of test runs being benchmarked, update the trend graphs */

  TestRuns.remove({ _id: testRun._id });

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
    const testTypeIndex = application.testEnvironments[
      testEnvironmentIndex
    ].testTypes
      .map((testType) => {
        return testType.name;
      })
      .indexOf(testRun.testType);
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

  /* delete checkResults and compareResults for this test run*/

  Snapshots.remove({
    $and: [
      { application: testRun.application },
      { testRunId: testRun.testRunId },
    ],
  });
  CheckResults.remove({
    $and: [
      { application: testRun.application },
      { testRunId: testRun.testRunId },
    ],
  });
  CompareResults.remove({
    $and: [
      { application: testRun.application },
      { testRunId: testRun.testRunId },
    ],
  });

  TestRunConfigs.remove({
    $and: [
      { application: testRun.application },
      { testRunId: testRun.testRunId },
    ],
  });

  DsMetrics.remove({
    testRunId: testRun.testRunId,
  });
  DsCompareStatistics.remove({
    testRunId: testRun.testRunId,
  });
  DsAdaptResults.remove({
    testRunId: testRun.testRunId,
  });
  DsAdaptTrackedResults.remove({
    testRunId: testRun.testRunId,
  });
  DsTrackedDifferences.remove({
    testRunId: testRun.testRunId,
  });
  DsChangepoints.remove({
    testRunId: testRun.testRunId,
  });

  DsControlGroupStatistics.remove({
    testRunId: testRun.testRunId,
  });

  // DsControlGroupStatistics.remove({
  //     controlGroupId: {
  //         $in: testRunIds
  //     }
  // });
  //
  // DsControlGroups.remove(query);

  DsPanels.remove({
    testRunId: testRun.testRunId,
  });

  DsAdaptConclusion.remove({
    testRunId: testRun.testRunId,
  });

  DsMetricStatistics.remove({
    testRunId: testRun.testRunId,
  });

  DsMetrics.remove({
    testRunId: testRun.testRunId,
  });
  DsMetricStatistics.remove({
    testRunId: testRun.testRunId,
  });
  DsPanels.remove({
    testRunId: testRun.testRunId,
  });

  callback(null, testRun);
};

const addTestRunReportComparisonsFn = (
  testRun,
  compareResultLabel,
  baselineTestRunId,
  callback,
) => {
  try {
    TestRuns.update(
      {
        _id: testRun._id,
      },
      {
        $push: {
          reportComparisons: {
            compareResultLabel: compareResultLabel,
            baselineTestRunId: baselineTestRunId,
          },
        },
      },
    );

    callback(null, true);
  } catch (err) {
    callback(err, null);
  }
};

const deleteTestRunReportComparisonFn = (
  testRun,
  compareResultLabel,
  callback,
) => {
  try {
    TestRuns.update(
      {
        _id: testRun._id,
      },
      {
        $pull: {
          reportComparisons: { compareResultLabel: compareResultLabel },
        },
      },
    );

    callback(null, true);
  } catch (err) {
    callback(err, null);
  }
};
const updateTestRunTagsFn = (testRun, tags, callback) => {
  try {
    TestRuns.update(
      {
        _id: testRun._id,
      },
      {
        $set: {
          tags: tags,
        },
      },
    );

    const application = Applications.findOne({
      name: testRun.application,
    });

    if (application) {
      application.testEnvironments.forEach(
        (testEnvironment, testEnvironmentIndex) => {
          if (testEnvironment.name === testRun.testEnvironment) {
            testEnvironment.testTypes.forEach((testType, testTypeIndex) => {
              if (testType.name === testRun.testType) {
                tags.forEach((tag) => {
                  if (testType.tags.indexOf(tag) === -1)
                    application.testEnvironments[
                      testEnvironmentIndex
                    ].testTypes[testTypeIndex].tags.push(tag);
                });
              }
            });
          }
        },
      );

      Applications.update(
        {
          name: application.name,
        },
        {
          $set: {
            testEnvironments: application.testEnvironments,
          },
        },
      );
    }

    callback(null, true);
  } catch (err) {
    callback(err, null);
  }
};
const deleteTestRunAlertOrEventFn = (testRun, annotations, callback) => {
  try {
    TestRuns.update(
      {
        _id: testRun._id,
      },
      {
        $set: testRun,
      },
    );

    // remove annotations from Grafana

    annotations.forEach((annotation) => {
      const grafanaInstance = Grafanas.findOne({ _id: annotation.grafanaId });

      if (grafanaInstance)
        Meteor.makeAsync(grafanaCallDelete)(
          grafanaInstance,
          '/api/annotations/' + annotation.id,
        );
    });

    callback(null, true);
  } catch (err) {
    callback(err, null);
  }
};
const getTestRunVariablesFn = (
  application,
  testEnvironment,
  testType,
  callback,
) => {
  try {
    const variables = [
      'perfana-system-under-test',
      'perfana-test-environment',
      'perfana-workload',
      'perfana-test-run-id',
      'perfana-previous-test-run-id',
      'perfana-baseline-test-run-id',
      'perfana-build-result-url',
      'perfana-start-epoch-milliseconds',
      'perfana-start-epoch-seconds',
      'perfana-end-epoch-milliseconds',
      'perfana-end-epoch-seconds',
      'perfana-start-elasticsearch',
      'perfana-end-elasticsearch',
      'perfana-start-dynatrace',
      'perfana-end-dynatrace',
    ];

    const distinct = Meteor.makeAsync(
      TestRunConfigs.rawCollection().distinct,
      TestRunConfigs.rawCollection(),
    );
    const distinctKeys = distinct('key', {
      $and: [
        { application: application },
        { testType: testType },
        { testEnvironment: testEnvironment },
      ],
    });

    distinctKeys.data.forEach((key) => {
      variables.push(key);
    });

    callback(null, variables);
  } catch (err) {
    callback(err, null);
  }
};

const getTestRunsFn = (query, callback) => {
  const testRuns = TestRuns.find(query).fetch();
  callback(null, testRuns);
};

const getTestRunsCountFn = (query, callback) => {
  const testRunsCount = TestRuns.find(query).count();
  callback(null, testRunsCount);
};

const updateTestRunTimestampFn = (
  testRun,
  timestampType,
  timestamp,
  callback,
) => {
  const start = timestampType === 'start' ? timestamp : testRun.start;
  const end = timestampType === 'end' ? timestamp : testRun.end;

  // calculate duration
  const duration = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 1000,
  );

  let rampUp = testRun.rampUp;

  // if changing start, modify rampUp if necessary
  if (
    timestampType === 'start' &&
    new Date(timestamp).getTime() > new Date(testRun.start).getTime()
  ) {
    rampUp =
      (
        rampUp -
          Math.round(
            (new Date(timestamp).getTime() -
              new Date(testRun.start).getTime()) /
              1000,
          ) >
        0
      ) ?
        rampUp -
        Math.round(
          (new Date(timestamp).getTime() - new Date(start).getTime()) / 1000,
        )
      : 0;
  } else if (testRun.rampUp > duration) {
    rampUp = duration;
  }

  const modifier =
    timestampType === 'start' ?
      {
        start: timestamp,
        duration: duration,
        rampUp: rampUp,
      }
    : {
        end: timestamp,
        duration: duration,
        rampUp: rampUp,
      };

  try {
    TestRuns.update(
      {
        _id: testRun._id,
      },
      {
        $set: modifier,
      },
    );

    callback(null, true);
  } catch (err) {
    callback(err, null);
  }
};

const removeTestRunReportFn = (testRun, callback) => {
  try {
    TestRuns.update(
      {
        _id: testRun._id,
      },
      {
        $unset: {
          reportAnnotations: '',
          reportRequirements: '',
          reportComparisons: '',
        },
      },
    );

    callback(null, true);
  } catch (err) {
    callback(err, null);
  }
};
const updateTestRunReportAnnotationsFn = (testRun, callback) => {
  try {
    TestRuns.update(
      {
        _id: testRun._id,
      },
      {
        $set: {
          reportAnnotations: testRun.reportAnnotations,
        },
      },
    );

    callback(null, true);
  } catch (err) {
    callback(err, null);
  }
};
const updateTestRunApplicationReleaseFn = (testRun, callback) => {
  try {
    TestRuns.update(
      {
        _id: testRun._id,
      },
      {
        $set: {
          applicationRelease: testRun.applicationRelease,
        },
      },
    );

    callback(null, true);
  } catch (err) {
    callback(err, null);
  }
};
const updateTestRunReportComparisonAnnotationsFn = (testRun, callback) => {
  try {
    TestRuns.update(
      {
        _id: testRun._id,
      },
      {
        $set: {
          reportComparisons: testRun.reportComparisons,
        },
      },
    );

    callback(null, true);
  } catch (err) {
    callback(err, null);
  }
};

const setTestRunAsBaselineFn = (testRun, callback) => {
  try {
    const application = Applications.findOne({
      name: testRun.application,
    });

    let adaptEnabled = false;

    if (application) {
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
          });
        },
      );

      _.each(
        application.testEnvironments,
        (testEnvironment, testEnvironmentIndex) => {
          _.each(testEnvironment.testTypes, (testType, testTypeIndex) => {
            if (
              testEnvironment.name === testRun.testEnvironment &&
              testType.name === testRun.testType
            ) {
              application.testEnvironments[testEnvironmentIndex].testTypes[
                testTypeIndex
              ].baselineTestRun = testRun.testRunId;
              adaptEnabled =
                application.testEnvironments[testEnvironmentIndex].testTypes[
                  testTypeIndex
                ].runAdapt;
            }
          });
        },
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

      const upsertData = {
        application: testRun.application,
        testType: testRun.testType,
        testEnvironment: testRun.testEnvironment,
        testRunId: testRun.testRunId,
        applicationDashboardId: null,
        panelTitle: null,
        dashboardLabel: null,
        dashboardUid: null,
        panelId: null,
        metricName: null,
      };

      //  to prevnt  trackedDifferences from being created for the new baseline test run
      TestRuns.update(
        {
          $and: [
            { application: testRun.application },
            { testRunId: testRun.testRunId },
          ],
        },
        {
          $set: {
            'adapt.differencesAccepted': 'ACCEPTED',
          },
        },
      );

      DsChangepoints.upsert(
        {
          application: upsertData.application,
          testType: upsertData.testType,
          testEnvironment: upsertData.testEnvironment,
        },
        {
          $set: upsertData,
        },
      );

      const testRunIds = TestRuns.find({
        $and: [
          { application: testRun.application },
          { testType: testRun.testType },
          { testEnvironment: testRun.testEnvironment },
          { expired: false },
          {
            end: {
              $gte: new Date(testRun.end),
            },
          },
        ],
      })
        .fetch()
        .map((testRun) => testRun.testRunId);

      callBatchProcess('RE_EVALUATE', testRunIds, adaptEnabled)
        .then(() => callback(null, true))
        .catch((err) => callback(err, null));
    } else {
      callback(null, testRun);
    }
  } catch (err) {
    callback(err, null);
  }
};

const batchEvaluateSelectedTestRunsFn = (ids, type, callback) => {
  try {
    let adaptEnabled;

    let testRuns = TestRuns.find(
      {
        _id: { $in: ids },
      },
      { sort: { end: 1 } },
    ).fetch();

    let testRunIds = testRuns.map((testRun) => testRun.testRunId);

    // get application for test run
    const application = Applications.findOne({
      name: testRuns[0].application,
    });

    // check if adapt is enabled for application
    const testEnvironmentIndex = application.testEnvironments
      .map((testEnvironment) => {
        return testEnvironment.name;
      })
      .indexOf(testRuns[0].testEnvironment);

    let testTypeIndex;

    if (testEnvironmentIndex !== -1) {
      testTypeIndex = application.testEnvironments[
        testEnvironmentIndex
      ].testTypes
        .map((testType) => {
          return testType.name;
        })
        .indexOf(testRuns[0].testType);
    }

    if (
      testEnvironmentIndex !== -1 &&
      testTypeIndex !== -1 &&
      application.testEnvironments[testEnvironmentIndex].testTypes[
        testTypeIndex
      ].runAdapt
    ) {
      adaptEnabled =
        application.testEnvironments[testEnvironmentIndex].testTypes[
          testTypeIndex
        ].runAdapt;
    } else {
      adaptEnabled = false;
    }

    // if type is REFRESH, filter test runs that are past the retention period
    if (type === 'REFRESH') {
      // get application dashboards for test run
      const applicationDashboards = ApplicationDashboards.find({
        application: testRuns[0].application,
        testEnvironment: testRuns[0].testEnvironment,
      }).fetch();

      // get retention period for each application dashboard and filter test run ids if any of the application dashboards are past the retention period
      testRuns = testRuns.filter((testRun) => {
        return (
          applicationDashboards.filter((applicationDashboard) => {
            const retention = getDataRetention(applicationDashboard);
            return (
              new Date().getTime() - new Date(testRun.end).getTime() <
              retention * 1000
            );
          }).length === applicationDashboards.length
        );
      });

      testRunIds = testRuns.map((testRun) => testRun.testRunId);
    }

    if (testRunIds.length > 0) {
      // reset test runs with invalid status
      TestRuns.update(
        {
          $and: [{ testRunId: { $in: testRunIds } }, { valid: false }],
        },
        {
          $set: {
            valid: true,
            reasonsNotValid: [],
          },
        },
        { multi: true },
      );

      callBatchProcess(type, testRunIds, adaptEnabled)
        .then(() => callback(null, true))
        .catch((err) => callback(err, null));
    } else {
      callback(
        {
          message:
            'Cannot refresh test runs data, one or more dashboards are past the retention period',
        },
        null,
      );
    }
  } catch (err) {
    callback(err, null);
  }
};

const updateSnapshotsFn = (
  selectTestRuns,
  applicationDashboardIds,
  callback,
) => {
  try {
    const testRuns = TestRuns.find({
      _id: { $in: selectTestRuns },
    }).fetch();

    testRuns.forEach((testRun) => {
      const applicationDashboards = ApplicationDashboards.find({
        _id: { $in: applicationDashboardIds },
      })
        .fetch()
        .filter((dashboard) => {
          const retention = getDataRetention(dashboard);
          return (
            new Date().getTime() - new Date(testRun.end).getTime() <
            retention * 1000
          );
        });

      applicationDashboards.forEach((applicationDashboard) => {
        const snapshot = Snapshots.findOne({
          $and: [
            { application: testRun.application },
            { testEnvironment: testRun.testEnvironment },
            { testType: testRun.testType },
            { testRunId: testRun.testRunId },
            { dashboardUid: applicationDashboard.dashboardUid },
            { dashboardLabel: applicationDashboard.dashboardLabel },
          ],
        });

        if (snapshot) {
          updateSnapshotStatusFn(snapshot, (error, result) => {
            if (error) {
              log.error(error);
            } else {
              // noinspection JSCheckFunctionSignatures
              log.info('Updated snapshot status: ' + result);
            }
          });
        }
      });
    });

    callback(null, true);
  } catch (e) {
    callback(e, null);
  }
};

const updateSnapshotFn = (snapshot, expires, callback) => {
  let count = 0;
  const maxTries = 3;

  if (!snapshot.url) {
    const err = 'No snapshot url found!';
    callback(err, null);
  } else {
    /* get snapshot */

    const snapshotKey = snapshot.url.split('/').reverse()[0];

    let grafana = Grafanas.findOne({ label: snapshot.grafana });

    // log.error('grafana snapshot host: ' + grafana.clientUrl);

    let storedSnapshot;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        storedSnapshot = Meteor.wrapAsync(grafanaCall)(
          grafana,
          '/api/snapshots/' + snapshotKey,
        );
        count = 0;
        break;
      } catch (error) {
        if (++count === maxTries) {
          log.error('Cannot get snapshot, error: ' + error);
          callback(error, null);
          count = 0;
          return;
        }

        log.error('Cannot get snapshot, retrying ...');
      }
    }

    /*  set expires from settings */

    const snapshotWithExpires = {
      name: storedSnapshot.dashboard.title,
      dashboard: storedSnapshot.dashboard,
      expires: expires,
    };

    // if grafana snapshot instance has been specified, use it

    if (Grafanas.findOne({ snapshotInstance: true })) {
      grafana = Grafanas.findOne({ snapshotInstance: true });
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        // eslint-disable-next-line no-unused-vars
        const snaphotResponse = Meteor.wrapAsync(grafanaCallPost)(
          grafana,
          '/api/snapshots/',
          snapshotWithExpires,
        );
        count = 0;
        break;
      } catch (error) {
        if (++count === maxTries) {
          log.error('Cannot post snapshot, error: ' + error);
          callback(error, null);
          count = 0;
          return;
        }

        log.error('Cannot post snapshot, retrying ...');
      }
    }

    Snapshots.update(
      {
        _id: snapshot._id,
      },
      {
        $set: {
          expires: expires,
          // eslint-disable-next-line no-undef
          url: snaphotResponse.url,
          // eslint-disable-next-line no-undef
          deleteUrl: snaphotResponse.deleteUrl,
        },
      },
    );

    callback(null, true);
  }
};

const updateSnapshotStatusFn = (snapshot, callback) => {
  // remove check results and compareResults
  CheckResults.remove({
    $and: [
      { application: snapshot.application },
      { testEnvironment: snapshot.testEnvironment },
      { testType: snapshot.testType },
      { testRunId: snapshot.testRunId },
      { dashboardUid: snapshot.dashboardUid },
    ],
  });

  CompareResults.remove({
    $and: [
      { application: snapshot.application },
      { testEnvironment: snapshot.testEnvironment },
      { testType: snapshot.testType },
      { testRunId: snapshot.testRunId },
      { dashboardUid: snapshot.dashboardUid },
      {
        $or: [
          { label: { $regex: 'Compared to previous test run.*' } },
          { label: { $regex: 'Compared to fixed baseline.*' } },
        ],
      },
    ],
  });

  Snapshots.update(
    {
      _id: snapshot._id,
    },
    {
      $set: {
        status: 'NEW',
      },
    },
  );

  getQueues().then((queues) => {
    if (snapshot.hasChecks === true) {
      queues.snapshotWithChecksQueue.add(snapshot, () => {});
    } else {
      queues.snapshotQueue.add(snapshot, () => {});
    }

    callback(null, true);
  });
};

export const deleteAllSnapshotsFn = (testRun, callback) => {
  // remove check results and compareResults
  CheckResults.remove({
    $and: [
      { application: testRun.application },
      { testEnvironment: testRun.testEnvironment },
      { testType: testRun.testType },
      { testRunId: testRun.testRunId },
    ],
  });

  CompareResults.remove({
    $and: [
      { application: testRun.application },
      { testEnvironment: testRun.testEnvironment },
      { testType: testRun.testType },
      { testRunId: testRun.testRunId },
      {
        $or: [
          { label: { $regex: 'Compared to previous test run.*' } },
          { label: { $regex: 'Compared to fixed baseline.*' } },
        ],
      },
    ],
  });

  const snapshots = Snapshots.find({
    $and: [
      { application: testRun.application },
      { testEnvironment: testRun.testEnvironment },
      { testType: testRun.testType },
      { testRunId: testRun.testRunId },
    ],
  }).fetch();

  async.eachLimit(
    snapshots,
    5,
    (snapshot, snapshotCallback) => {
      Snapshots.remove({ _id: snapshot._id });

      if (snapshot.deleteUrl) {
        let count = 0;
        const maxTries = 3;

        const grafana = Grafanas.findOne({ label: snapshot.grafana });

        const deleteKey = snapshot.deleteUrl.split('/')[5];

        // eslint-disable-next-line no-constant-condition
        while (true) {
          try {
            // eslint-disable-next-line no-unused-vars
            const deleteSnapshot = Meteor.makeAsync(grafanaCall)(
              grafana,
              '/api/snapshots-delete/' + deleteKey,
            );

            log.error('deleted snapshot with deleteKey: ' + deleteKey);
            count = 0;
            break;
          } catch (error) {
            if (++count === maxTries) {
              log.error('Cannot delete snapshot, error: ' + error);
              break;
            }

            log.error('Cannot  delete snapshot, retrying ...');
          }
        }

        snapshotCallback();
      } else {
        snapshotCallback();
      }
    },
    (err) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, true);
      }
    },
  );
};
export const deleteSnapshotFn = (
  testRun,
  grafanaLabel,
  dashboardUid,
  dashboardLabel,
  snapshotDeleteUrl,
  snapshot,
  callback,
) => {
  // remove check results and compareResults
  CheckResults.remove({
    $and: [
      { application: snapshot.application },
      { testEnvironment: snapshot.testEnvironment },
      { testType: snapshot.testType },
      { testRunId: snapshot.testRunId },
      { dashboardUid: snapshot.dashboardUid },
    ],
  });

  CompareResults.remove({
    $and: [
      { application: snapshot.application },
      { testEnvironment: snapshot.testEnvironment },
      { testType: snapshot.testType },
      { testRunId: snapshot.testRunId },
      { dashboardUid: snapshot.dashboardUid },
      {
        $or: [
          { label: { $regex: 'Compared to previous test run.*' } },
          { label: { $regex: 'Compared to fixed baseline.*' } },
        ],
      },
    ],
  });

  Snapshots.remove({ _id: snapshot._id });

  if (snapshotDeleteUrl) {
    let count = 0;
    const maxTries = 3;

    const grafana = Grafanas.findOne({ label: grafanaLabel });

    const deleteKey = snapshotDeleteUrl.split('/')[5];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        // eslint-disable-next-line no-unused-vars
        const deleteSnapshot = Meteor.makeAsync(grafanaCall)(
          grafana,
          '/api/snapshots-delete/' + deleteKey,
        );

        log.error('deleted snapshot with deleteKey: ' + deleteKey);
        count = 0;
        break;
      } catch (error) {
        if (++count === maxTries) {
          log.error('Cannot delete snapshot, error: ' + error);
          break;
        }

        log.error('Cannot  delete snapshot, retrying ...');
      }
    }

    callback(null, true);
  } else {
    callback(null, true);
  }
};

const updateTestRunFn = (testRun, testRunId, callback) => {
  const modifier = {};
  if (testRun.$set) modifier.$set = testRun.$set;
  if (testRun.$unset) modifier.$unset = testRun.$unset;

  TestRuns.update(
    {
      _id: testRunId,
    },
    modifier,
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    },
  );
};
