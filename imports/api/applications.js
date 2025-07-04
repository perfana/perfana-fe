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

import { Applications } from '/imports/collections/applications';
import { TestRuns } from '/imports/collections/testruns';
import { CheckResults } from '/imports/collections/checkResults';
import { CompareResults } from '/imports/collections/compareResults';
import { AbortAlertTags } from '/imports/collections/abortAlertTags';
import { Comments } from '/imports/collections/comments';
import { ApplicationDashboards } from '/imports/collections/applicationDashboards';
import { Notifications } from '/imports/collections/notifications';
import { NotificationsChannels } from '/imports/collections/notificationChannels';
import { Benchmarks } from '/imports/collections/benchmarks';
import { Snapshots } from '/imports/collections/snapshots';
import { userHasPermission } from '../helpers/checkPermission';
import { deleteSnapshotFn } from './testruns';
import { TestRunConfigs } from '../collections/testrunConfigs';
import { GrafanaDashboards } from '../collections/grafanaDashboards';
import { DeepLinks } from '../collections/deeplinks';
import { ReportPanels } from '../collections/reportPanels';
import { DsMetrics } from '../collections/dsMetrics';
import { DsMetricStatistics } from '../collections/dsMetricStatistics';
import { DsPanels } from '../collections/dsPanels';
import { DsAdaptResults } from '../collections/dsAdaptResults';
import { DsCompareConfig } from '../collections/dsCompareConfig';
import { DsControlGroupStatistics } from '../collections/dsControlGroupStatistics';
import { DsControlGroups } from '../collections/dsControlGroups';
import { DsCompareStatistics } from '../collections/dsCompareStatistics';
import { DsAdaptConclusion } from '../collections/dsAdaptConclusion';
import { MetricClassification } from '../collections/metricClassification';
import { log } from '/both/logger';

if (Meteor.isServer) {
  Meteor.publish('applications', () => {
    return Applications.find();
  });
}

Meteor.methods({
  removeSystemUnderTest(removeInfo) {
    check(removeInfo, Object);

    const application = Applications.findOne({
      name: removeInfo.application,
    });

    if (!userHasPermission(Meteor.userId(), application.name)) {
      throw new Meteor.Error(
        'remove.systemUnderTest.unauthorized',
        'The user is not authorized to delete this system under test',
      );
    }

    const wrap = Meteor.makeAsync(removeSystemUnderTestFn);
    return wrap(removeInfo);
  },
  removeSystemUnderTestTestEnvironment(removeInfo) {
    check(removeInfo, Object);

    const application = Applications.findOne({
      name: removeInfo.application,
    });

    if (!userHasPermission(Meteor.userId(), application.name)) {
      throw new Meteor.Error(
        'remove.systemUnderTest.unauthorized',
        'The user is not authorized to remove resources for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(removeSystemUnderTestTestEnvironmentFn);
    return wrap(removeInfo);
  },
  removeSystemUnderTestTestEnvironmentWorkload(removeInfo) {
    check(removeInfo, Object);

    const application = Applications.findOne({
      name: removeInfo.application,
    });

    if (!userHasPermission(Meteor.userId(), application.name)) {
      throw new Meteor.Error(
        'remove.systemUnderTest.unauthorized',
        'The user is not authorized to remove resources for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(
      removeSystemUnderTestTestEnvironmentWorkloadFn,
    );
    return wrap(removeInfo);
  },
  updateSystemUnderTest: (application) => {
    check(application, Object);

    if (!userHasPermission(Meteor.userId(), application.name)) {
      throw new Meteor.Error(
        'update.systemUnderTests.unauthorized',
        'The user is not authorized to update this system under test',
      );
    }

    const wrap = Meteor.makeAsync(updateSystemUnderTestFn);
    return wrap(application);
  },
});

const updateSystemUnderTestFn = (application, callback) => {
  // set autoCompareTestRuns if not present (backwards compatibility)
  application.testEnvironments.forEach(
    (testEnvironment, testEnvironmentIndex) => {
      testEnvironment.testTypes.forEach((testType, testTypeIndex) => {
        if (testType.autoCreateSnapshots === undefined)
          application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].autoCreateSnapshots = Meteor.settings.autoCreateSnapshots
            ? Meteor.settings.autoCreateSnapshots === true
            : false;
        if (testType.autoCompareTestRuns === undefined)
          application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].autoCompareTestRuns = Meteor.settings.autoCompareTestRuns
            ? Meteor.settings.autoCompareTestRuns === true
            : false;
        if (testType.enableAdapt === undefined)
          application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].enableAdapt = Meteor.settings.enableAdapt
            ? Meteor.settings.enableAdapt === true
            : false;
        if (testType.runAdapt === undefined)
          application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].runAdapt = Meteor.settings.runAdapt
            ? Meteor.settings.runAdapt === true
            : false;
        if (testType.adaptMode === undefined)
          application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].adaptMode = 'DEFAULT';
      });
    },
  );

  Applications.update(
    {
      _id: application._id,
    },
    {
      $set: {
        tracingService: application.tracingService,
        pyroscopeApplication: application.pyroscopeApplication,
        pyroscopeProfiler: application.pyroscopeProfiler,
        dynatraceEntities: application.dynatraceEntities,
        testEnvironments: application.testEnvironments,
      },
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
const removeSystemUnderTestTestEnvironmentFn = (removeInfo, callback) => {
  const query = {
    $and: [
      { application: removeInfo.application },
      { testEnvironment: removeInfo.testEnvironment },
    ],
  };

  const testRunIds = TestRuns.find(query)
    .fetch()
    .map((testRun) => testRun.testRunId);

  try {
    TestRuns.remove(query);
    CheckResults.remove(query);
    CompareResults.remove(query);
    Comments.remove(query);
    AbortAlertTags.remove(query);
    ApplicationDashboards.remove(query);
    Notifications.remove(query);
    TestRunConfigs.remove(query);
    Benchmarks.remove(query);
    DsMetrics.remove({
      testRunId: {
        $in: testRunIds,
      },
    });
    DsCompareStatistics.remove({
      testRunId: {
        $in: testRunIds,
      },
    });
    DsAdaptResults.remove({
      testRunId: {
        $in: testRunIds,
      },
    });
    DsControlGroupStatistics.remove({
      controlGroupId: {
        $in: testRunIds,
      },
    });

    DsControlGroups.remove(query);

    DsCompareConfig.remove(query);

    MetricClassification.remove(query);

    DsPanels.remove({
      testRunId: {
        $in: testRunIds,
      },
    });

    DsAdaptConclusion.remove({
      testRunId: {
        $in: testRunIds,
      },
    });

    DsMetricStatistics.remove({
      testRunId: {
        $in: testRunIds,
      },
    });

    const snapshots = Snapshots.find(query).fetch();
    snapshots.forEach((snapshot) => {
      Meteor.call(
        'deleteSnapshot',
        {},
        snapshot.grafana,
        snapshot.dashboardUid,
        snapshot.dashboardLabel,
        snapshot.snapshotDeleteUrl,
        snapshot,
        (error) => {
          if (error) {
            log.error(error);
          }
        },
      );
    });

    const application = Applications.findOne({
      name: removeInfo.application,
    });

    if (application) {
      application.testEnvironments = application.testEnvironments.filter(
        (testEnvironment) => {
          return testEnvironment.name !== removeInfo.testEnvironment;
        },
      );

      /* if this was the last testenvironment, remove application as well */
      if (application.testEnvironments.length === 0) {
        Applications.remove({
          name: application.name,
        });
      } else {
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

    callback(null, true);
  } catch (err) {
    callback(err, null);
  }
};
const removeSystemUnderTestFn = (removeInfo, callback) => {
  const query = {
    application: removeInfo.application,
  };

  const testRunIds = TestRuns.find(query)
    .fetch()
    .map((testRun) => testRun.testRunId);

  try {
    TestRuns.remove(query);
    CheckResults.remove(query);
    CompareResults.remove(query);
    Comments.remove(query);
    AbortAlertTags.remove(query);
    ApplicationDashboards.remove(query);
    GrafanaDashboards.remove({ usedBySUT: removeInfo.application });
    DeepLinks.remove(query);
    ReportPanels.remove(query);
    TestRunConfigs.remove(query);
    Notifications.remove(query);
    NotificationsChannels.remove(query);
    Benchmarks.remove(query);
    DsMetrics.remove({
      testRunId: {
        $in: testRunIds,
      },
    });
    DsCompareStatistics.remove({
      testRunId: {
        $in: testRunIds,
      },
    });
    DsAdaptResults.remove({
      testRunId: {
        $in: testRunIds,
      },
    });
    DsControlGroupStatistics.remove({
      controlGroupId: {
        $in: testRunIds,
      },
    });

    DsControlGroups.remove(query);

    DsCompareConfig.remove(query);

    MetricClassification.remove(query);

    DsPanels.remove({
      testRunId: {
        $in: testRunIds,
      },
    });

    DsAdaptConclusion.remove({
      testRunId: {
        $in: testRunIds,
      },
    });

    DsMetricStatistics.remove({
      testRunId: {
        $in: testRunIds,
      },
    });
    const snapshots = Snapshots.find(query).fetch();
    snapshots.forEach((snapshot) => {
      Meteor.call(
        'deleteSnapshot',
        {},
        snapshot.grafana,
        snapshot.dashboardUid,
        snapshot.dashboardLabel,
        snapshot.snapshotDeleteUrl,
        snapshot,
        (error) => {
          if (error) {
            log.error(error);
          }
        },
      );
    });

    Applications.remove({
      name: removeInfo.application,
    });

    // noinspection JSCheckFunctionSignatures
    log.info(
      `System under test ${removeInfo.application} and all its child resources removed`,
    );

    callback(null, true);
  } catch (err) {
    callback(err, null);
  }
};

const removeSystemUnderTestTestEnvironmentWorkloadFn = (
  removeInfo,
  callback,
) => {
  const query = {
    $and: [
      { application: removeInfo.application },
      { testEnvironment: removeInfo.testEnvironment },
      { testType: removeInfo.testType },
    ],
  };

  const testRunIds = TestRuns.find(query)
    .fetch()
    .map((testRun) => testRun.testRunId);

  try {
    TestRuns.remove(query);
    CheckResults.remove(query);
    CompareResults.remove(query);
    AbortAlertTags.remove(query);
    Notifications.remove(query);
    TestRunConfigs.remove(query);
    Comments.remove(query);
    Benchmarks.remove(query);
    DsMetrics.remove({
      testRunId: {
        $in: testRunIds,
      },
    });
    DsCompareStatistics.remove({
      testRunId: {
        $in: testRunIds,
      },
    });
    DsAdaptResults.remove({
      testRunId: {
        $in: testRunIds,
      },
    });
    DsControlGroupStatistics.remove({
      controlGroupId: {
        $in: testRunIds,
      },
    });

    DsControlGroups.remove(query);

    DsCompareConfig.remove(query);

    MetricClassification.remove(query);

    DsPanels.remove({
      testRunId: {
        $in: testRunIds,
      },
    });

    DsAdaptConclusion.remove({
      testRunId: {
        $in: testRunIds,
      },
    });

    DsMetricStatistics.remove({
      testRunId: {
        $in: testRunIds,
      },
    });

    const snapshots = Snapshots.find(query).fetch();
    snapshots.forEach((snapshot) => {
      deleteSnapshotFn(
        {},
        snapshot.grafana,
        snapshot.dashboardUid,
        snapshot.dashboardLabel,
        snapshot.snapshotDeleteUrl,
        snapshot._id,
        (error) => {
          if (error) {
            log.error(error);
          }
        },
      );
    });

    const application = Applications.findOne({
      name: removeInfo.application,
    });

    if (application) {
      const testEnvironmentIndex = application.testEnvironments
        .map((testEnvironment) => {
          return testEnvironment.name;
        })
        .indexOf(removeInfo.testEnvironment);

      application.testEnvironments[testEnvironmentIndex].testTypes =
        application.testEnvironments[testEnvironmentIndex].testTypes.filter(
          (testType) => {
            return testType.name !== removeInfo.testType;
          },
        );

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

    callback(null, true);
  } catch (err) {
    callback(err, null);
  }
};
