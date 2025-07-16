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
import { log } from '/both/logger';
import { ApplicationDashboards } from '../collections/applicationDashboards';
import { GrafanaDashboards } from '../collections/grafanaDashboards';
import { DsMetricStatistics } from '../collections/dsMetricStatistics';
import { DsMetrics } from '../collections/dsMetrics';
import { DsPanels } from '../collections/dsPanels';
import { DsAdaptResults } from '../collections/dsAdaptResults';
import { DsTrackedDifferences } from '../collections/dsTrackedDifferences';
import { DsAdaptTrackedResults } from '../collections/dsAdaptTrackedResults';
import { DsControlGroupStatistics } from '../collections/dsControlGroupStatistics';
import { DsChangepoints } from '../collections/dsChangePoints';
import { PendingDsCompareConfigChanges } from '../collections/pendingDsCompareConfigChanges';
import { DsCompareConfig } from '../collections/dsCompareConfig';
import { MetricClassification } from '../collections/metricClassification';
import { TestRuns } from '../collections/testruns';
import yaml from 'js-yaml';
import { supportedPanelTypes } from '/both/grafanaConfig';
import { DsAdaptConclusion } from '../collections/dsAdaptConclusion';
import { userHasPermission } from '../helpers/checkPermission';
import async from 'async';
import { setDefaultDsCompareConfig } from '/both/setDefaultDsCompareConfig';
import { publishComposite } from 'meteor/reywood:publish-composite';
import { Applications } from '../collections/applications';
import _ from 'lodash';
import { BatchProcessEvents } from '../collections/batchProcessEvents';
import { DsControlGroups } from '../collections/dsControlGroups';
import { callBatchProcess } from '../helpers/perfana-ds-api';

if (Meteor.isServer) {
  Meteor.publish('metricClassification', (query) => {
    check(query, Match.OneOf(undefined, null, Object));
    return MetricClassification.find(query);
  });

  Meteor.publish('dsCompareConfig', (query) => {
    check(query, Match.OneOf(undefined, null, Object));
    return DsCompareConfig.find(query);
  });

  Meteor.publish('dsMetricComparisons', (query) => {
    check(query, Match.OneOf(undefined, null, Object));
    return DsMetricComparisons.find(query);
  });

  Meteor.publish('dsControlGroups', (query) => {
    check(query, Match.OneOf(undefined, null, Object));
    return DsControlGroups.find(query);
  });

  Meteor.publish(
    'dsControlGroupStatistics',
    (controlGroupId, panelId, applicationDashboardId, metricName) => {
      check(controlGroupId, String);
      check(panelId, Number);
      check(applicationDashboardId, String);
      check(metricName, String);
      return DsControlGroupStatistics.find({
        $and: [
          { controlGroupId: controlGroupId },
          { panelId: panelId },
          { applicationDashboardId: applicationDashboardId },
          { metricName: metricName },
        ],
      });
    },
  );

  Meteor.publish('dsAdaptResults', (query) => {
    check(query, Match.OneOf(undefined, null, Object));
    return DsAdaptResults.find(query);
  });

  Meteor.publish('pendingDsCompareConfigChanges', (query) => {
    check(query, Match.OneOf(undefined, null, Object));
    return PendingDsCompareConfigChanges.find(query);
  });

  Meteor.publish('dsAdaptResultsForTrackedRegressions', (query, limit) => {
    check(query, Match.OneOf(undefined, null, Object));
    check(limit, Number);
    const dsAdaptResults = DsAdaptResults.find(query, {
      sort: { testRunId: -1 },
      limit: limit,
    }).fetch();
    dsAdaptResults.forEach((dsAdaptResult, index) => {
      const testRun = TestRuns.findOne({
        testRunId: dsAdaptResult.testRunId,
        application: dsAdaptResult.application,
      });
      if (testRun) {
        dsAdaptResults[index].updateTestRunTimestamp = testRun.start;
      }
    });
  });

  Meteor.publish('dsAdaptConclusion', (testRunId) => {
    check(testRunId, String);
    return DsAdaptConclusion.find({ testRunId: testRunId });
  });

  Meteor.publish('dsTrackedDifferences', (testRunId) => {
    check(testRunId, String);
    return DsTrackedDifferences.find({
      $and: [{ testRunId: testRunId }, { latest: true }],
    });
  });

  publishComposite('dsAdaptTrackedResults', (testRunId) => {
    check(testRunId, String);
    return {
      find() {
        return DsAdaptTrackedResults.find({ testRunId: testRunId });
      },
      children: [
        {
          find(trackedResult) {
            return DsTrackedDifferences.find({
              _id: trackedResult.trackedDifferenceId,
            });
          },
        },
      ],
    };
  });

  Meteor.publish(
    'dsMetrics',
    (testRunIds, panelIds, applicationDashboardId) => {
      check(testRunIds, [String]);
      check(panelIds, [Number]);
      check(applicationDashboardId, String);
      return DsMetrics.find({
        $and: [
          { testRunId: { $in: testRunIds } },
          { panelId: { $in: panelIds } },
          { applicationDashboardId: applicationDashboardId },
        ],
      });
    },
  );

  Meteor.publish('dsPanelsDescription', (testRunIds, panelDescription) => {
    check(testRunIds, [String]);
    check(panelDescription, String);
    return DsPanels.find({
      $and: [
        { testRunId: { $in: testRunIds } },
        { 'panel.description': panelDescription },
      ],
    });
  });
  Meteor.publish('dsChangepoints', (query) => {
    check(query, Match.OneOf(undefined, null, Object));
    return DsChangepoints.find(query);
  });

  Meteor.publish('dsPanels', (query) => {
    check(query, Match.OneOf(undefined, null, Object));
    return DsPanels.find(query);
  });
}

Meteor.methods({
  getDsMetricsTrends: (query) => {
    check(query, Object);

    if (!userHasPermission(Meteor.userId(), query.application)) {
      throw new Meteor.Error(
        'get.check-result-status.unauthorized',
        'The user is not authorized to get trends',
      );
    }

    const wrap = Meteor.makeAsync(getDsMetricsTrendsFn);
    return wrap(query);
  },
  getDsMetricStatisticsTrends: (
    query,
    adapt,
    application,
    testEnvironment,
    testType,
    periodTimestamp,
  ) => {
    check(query, Object);
    check(adapt, Boolean);
    check(application, String);
    check(testEnvironment, String);
    check(testType, String);
    check(periodTimestamp, Date);

    if (!userHasPermission(Meteor.userId(), query.application)) {
      throw new Meteor.Error(
        'get.check-result-status.unauthorized',
        'The user is not authorized to get trends',
      );
    }

    const wrap = Meteor.makeAsync(getDsMetricStatisticsTrendsFn);
    return wrap(
      query,
      adapt,
      application,
      testEnvironment,
      testType,
      periodTimestamp,
    );
  },
  getDsTrackedRegressions: (
    dsTrackedDifferencesQuery,
    testRunQuery,
    testRunId,
    dsPanelQuery,
  ) => {
    check(dsTrackedDifferencesQuery, Object);
    check(testRunQuery, Object);
    check(dsPanelQuery, Object);
    check(testRunId, String);

    if (
      !userHasPermission(Meteor.userId(), dsTrackedDifferencesQuery.application)
    ) {
      throw new Meteor.Error(
        'get.check-result-status.unauthorized',
        'The user is not authorized to get tracked regressions',
      );
    }

    const wrap = Meteor.makeAsync(getDsTrackedRegressionsFn);
    return wrap(
      dsTrackedDifferencesQuery,
      testRunQuery,
      testRunId,
      dsPanelQuery,
    );
  },
  getDsMetrics: (dsMetricsQuery, dsPanelQuery, dsAdaptResultQuery, testRun) => {
    check(dsMetricsQuery, Object);
    check(dsPanelQuery, Object);
    check(dsAdaptResultQuery, Object);
    check(testRun, Object);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'get.check-result-status.unauthorized',
        'The user is not authorized to get tracked regressions',
      );
    }

    const wrap = Meteor.makeAsync(getDsMetricsFn);
    return wrap(dsMetricsQuery, dsPanelQuery, dsAdaptResultQuery, testRun);
  },
  getTestRunAdaptStatus: (testRun) => {
    check(testRun, Object);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'get.check-result-status.unauthorized',
        'The user is not authorized to get check result status',
      );
    }

    const wrap = Meteor.makeAsync(getTestRunAdaptStatusFn);
    return wrap(testRun);
  },
  resolveRegression: (testRun, status, reEvaluate) => {
    check(testRun, Object);
    check(status, String);
    check(reEvaluate, Boolean);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'get.check-result-status.unauthorized',
        'The user is not authorized to get check result status',
      );
    }

    const wrap = Meteor.makeAsync(resolveRegressionFn);
    return wrap(testRun, status, reEvaluate);
  },
  processPendingDsCompareConfigChanges: (testRun, includeControlGroup) => {
    check(testRun, Object);
    check(includeControlGroup, Boolean);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'get.check-result-status.unauthorized',
        'The user is not authorized to get check result status',
      );
    }

    const wrap = Meteor.makeAsync(processPendingDsCompareConfigChangesFn);
    return wrap(testRun, includeControlGroup);
  },
  getDsCompareStatistics: (metric) => {
    check(metric, Object);
    const wrap = Meteor.makeAsync(getDsCompareStatisticsFn);
    return wrap(metric);
  },
  resetControlGroup: (testRunId) => {
    check(testRunId, String);

    const wrap = Meteor.makeAsync(resetControlGroupFn);
    return wrap(testRunId);
  },
  getMetricClassificationsYaml: (applicationDashboardId) => {
    check(applicationDashboardId, String);

    const wrap = Meteor.makeAsync(getMetricClassificationsYamlFn);
    return wrap(applicationDashboardId);
  },
  getMetricGenericChecksYaml: (applicationDashboardId) => {
    check(applicationDashboardId, String);

    const wrap = Meteor.makeAsync(getMetricGenericChecksYamlFn);
    return wrap(applicationDashboardId);
  },
  getDsCompareConfigById: (id) => {
    check(id, String);

    const wrap = Meteor.makeAsync(getDsCompareConfigByIdFn);
    return wrap(id);
  },
  updateDsTrackedDifferenceDetails: (testRunId, status) => {
    check(testRunId, String);
    check(status, String);

    const wrap = Meteor.makeAsync(updateDsTrackedDifferenceDetailsFn);
    return wrap(testRunId, status);
  },
  getUnresolvedRegression: (application, testEnvironment, testType) => {
    check(application, String);
    check(testEnvironment, String);
    check(testType, String);

    const wrap = Meteor.makeAsync(getUnresolvedRegressionFn);
    return wrap(application, testEnvironment, testType);
  },
  getMetricClassification: (query) => {
    check(query, Object);

    const wrap = Meteor.makeAsync(getMetricClassificationFn);
    return wrap(query);
  },
  updateMetricClassification: (metricClassification, testRunId) => {
    check(metricClassification, Object);
    check(testRunId, String);

    const wrap = Meteor.makeAsync(updateMetricClassificationFn);
    return wrap(metricClassification, testRunId);
  },

  updateDsCompareConfig: (dsCompareConfig, testRunId, source) => {
    check(dsCompareConfig, Object);
    check(testRunId, String);
    check(source, String);

    const wrap = Meteor.makeAsync(updateDsCompareConfigFn);
    return wrap(dsCompareConfig, testRunId, source);
  },
});
const getDsCompareStatisticsFn = (metric, callback) => {
  try {
    const checkConfig = completeConfig(metric);

    const dsCompareStatistics = DsAdaptResults.findOne({
      $and: [
        { testRunId: metric.testRunId },
        { applicationDashboardId: metric.applicationDashboardId },
        { panelId: metric.panelId },
        { metricName: metric.metricName },
      ],
    });

    const dsPanel = DsPanels.findOne({
      $and: [
        { testRunId: metric.testRunId },
        { applicationDashboardId: metric.applicationDashboardId },
        { panelId: metric.panelId },
      ],
    });

    callback(null, {
      dsCompareStatistics: dsCompareStatistics,
      statistic: checkConfig.statistic,
      panel: dsPanel.panel,
    });
  } catch (error) {
    callback(error, null);
  }
};

const resetControlGroupFn = (testRunId, callback) => {
  try {
    const testRun = TestRuns.findOne({ testRunId: testRunId });

    const upsertData = {
      application: testRun.application,
      testType: testRun.testType,
      testEnvironment: testRun.testEnvironment,
      testRunId: testRunId,
      applicationDashboardId: null,
      panelTitle: null,
      dashboardLabel: null,
      dashboardUid: null,
      panelId: null,
      metricName: null,
    };

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

    const testRunsToUpdate = TestRuns.find(
      {
        $and: [
          { application: testRun.application },
          { testType: testRun.testType },
          { testEnvironment: testRun.testEnvironment },
          {
            end: {
              $gte: testRun.end,
            },
          },
        ],
      },
      { sort: { end: 1 } },
    ).fetch();

    const testRunIds = testRunsToUpdate.map((testRun) => testRun.testRunId);

    const application = Applications.findOne({ name: testRun.application });

    const testEnvironmentIndex = application.testEnvironments.findIndex(
      (te) => te.name === testRun.testEnvironment,
    );
    const testTypeIndex = application.testEnvironments[
      testEnvironmentIndex
    ].testTypes.findIndex((tt) => tt.name === testRun.testType);
    application.testEnvironments[testEnvironmentIndex].testTypes[
      testTypeIndex
    ].adaptMode = 'BASELINE';

    Applications.update(
      {
        name: testRun.application,
      },
      {
        $set: {
          testEnvironments: application.testEnvironments,
        },
      },
    );

    callBatchProcess('RE_EVALUATE', testRunIds, true)
      .then(() => callback(null, true))
      .catch((err) => callback(err, null));
  } catch (error) {
    callback(error, null);
  }
};

const getMetricClassificationsYamlFn = (id, callback) => {
  try {
    const applicationDashboard = ApplicationDashboards.findOne({
      _id: id,
    });

    const grafanaDashboard = GrafanaDashboards.findOne({
      uid: applicationDashboard.dashboardUid,
    });

    const grafanaJson = JSON.parse(grafanaDashboard.grafanaJson);

    const data = [];

    grafanaJson.dashboard.panels.forEach((panel) => {
      const panelData = {
        dashboardUid: applicationDashboard.dashboardUid,
        panelId: panel.id,
        panelTitle: panel.title,
        metricClassification: 'UNKNOWN',
        higherIsBetter: false,
      };

      data.push(panelData);
    });

    // Convert JavaScript object to YAML
    // noinspection JSCheckFunctionSignatures
    const yamlData = yaml.dump(data);

    // Convert string to Buffer
    const bufferData = Buffer.from(yamlData, 'utf8');

    // eslint-disable-next-line no-undef
    callback(null, Uint8Array.from(bufferData));
  } catch (error) {
    callback(error, null);
  }
};
const getMetricGenericChecksYamlFn = (id, callback) => {
  try {
    const applicationDashboard = ApplicationDashboards.findOne({
      _id: id,
    });

    const grafanaDashboard = GrafanaDashboards.findOne({
      uid: applicationDashboard.dashboardUid,
    });

    const grafanaJson = JSON.parse(grafanaDashboard.grafanaJson);

    const data = [];

    grafanaJson.dashboard.panels.forEach((panel) => {
      if (supportedPanelTypes.indexOf(panel.type) !== -1) {
        const panelData = {
          _id: `your-profile-name-${panel.title.replace(/ /g, '_').toLowerCase()}`,
          profile: 'your-profile-name',
          grafana: grafanaDashboard.grafana,
          addForWorkloadsMatchingRegex: 'load.*',
          dashboardName: applicationDashboard.dashboardLabel,
          dashboardUid: applicationDashboard.dashboardUid,
          panel: {
            title: panel.title,
            id: panel.id,
            type: panel.type,
            yAxesFormat:
              panel.fieldConfig.defaults.unit ?
                panel.fieldConfig.defaults.unit
              : undefined,
            evaluateType: 'avg',
            requirement: {
              operator: 'lt',
              value: 1000,
            },
            benchmark: {
              absoluteFailureThreshold: 100,
              operator: 'pst-pct',
              value: 1000,
            },
            excludeRampUpTime: true,
            validateWithDefaultIfNoData: false,
          },
        };

        data.push(panelData);
      }
    });

    // Convert JavaScript object to YAML
    // noinspection JSCheckFunctionSignatures
    const yamlData = yaml.dump(data);

    // Convert string to Buffer
    const bufferData = Buffer.from(yamlData, 'utf8');

    // eslint-disable-next-line no-undef
    callback(null, Uint8Array.from(bufferData));
  } catch (error) {
    callback(error, null);
  }
};
const getMetricClassificationFn = (query, callback) => {
  try {
    let metricClassification = MetricClassification.findOne(query);

    if (metricClassification) {
      callback(null, metricClassification);
    } else {
      // check if there is a classification on panel level
      query.$and = query.$and.filter((obj) => {
        // obtain the key name
        const key = Object.keys(obj)[0];
        return key !== 'metricName';
      });

      metricClassification = MetricClassification.findOne(query);

      if (metricClassification) {
        callback(null, metricClassification);
      } else {
        const defaultMetricClassification = Object.assign({}, ...query.$and);
        defaultMetricClassification.metricClassification = 'UNKNOWN';
        defaultMetricClassification.higherIsBetter = false;
        callback(null, defaultMetricClassification);
      }
    }
  } catch (error) {
    callback(error, null);
  }
};

const getUnresolvedRegressionFn = (
  application,
  testEnvironment,
  testType,
  callback,
) => {
  try {
    let testRunIds;

    const dsChangePoint = DsChangepoints.findOne({
      $and: [
        { application: application },
        { testEnvironment: testEnvironment },
        { testType: testType },
      ],
    });

    // find most recent test run
    const lastTestRun = TestRuns.findOne(
      {
        $and: [
          { application: application },
          { testEnvironment: testEnvironment },
          { testType: testType },
        ],
      },
      { sort: { end: -1 } },
    );

    const controlGroup = DsControlGroups.findOne({
      application: application,
      testEnvironment: testEnvironment,
      testType: testType,
      controlGroupId: lastTestRun.testRunId,
    });

    if (dsChangePoint) {
      const dsChangePointTestRun = TestRuns.findOne({
        testRunId: dsChangePoint.testRunId,
      });
      testRunIds = TestRuns.find({
        $and: [
          { application: application },
          { testEnvironment: testEnvironment },
          { testType: testType },
          { start: { $gt: dsChangePointTestRun.start } },
          { 'adapt.differencesAccepted': { $ne: 'ACCEPTED' } },
          { 'adapt.mode': { $ne: 'DEBUG' } },
        ],
      })
        .fetch()
        .map((testRun) => testRun.testRunId);
    } else {
      testRunIds = TestRuns.find({
        $and: [
          { application: application },
          { testEnvironment: testEnvironment },
          { testType: testType },
          { 'adapt.differencesAccepted': { $ne: 'ACCEPTED' } },
          { 'adapt.mode': { $ne: 'DEBUG' } },
          { start: { $gt: controlGroup.firstDatetime } },
        ],
      })
        .fetch()
        .map((testRun) => testRun.testRunId);
    }

    // let dsAdaptTrackedResults = DsAdaptTrackedResults.find({
    //     $and: [
    //         {trackedTestRunId: { $in: testRunIds }},
    //         {"trackedConclusion.label": "regression"},
    //         {"conclusion.label": "regression"}
    //     ]
    // }).fetch();

    const rawDsAdaptTrackedResults = DsAdaptTrackedResults.rawCollection();
    const aggregateQuery = Meteor.wrapAsync((pipeline, callback) => {
      rawDsAdaptTrackedResults.aggregate(pipeline).toArray(callback);
    });

    const pipeline = [
      {
        $match: {
          trackedTestRunId: { $in: testRunIds },
          'trackedConclusion.label': 'regression',
          'conclusion.label': 'regression',
        },
      },
      {
        $lookup: {
          from: 'testRuns',
          localField: 'trackedTestRunId',
          foreignField: 'testRunId',
          as: 'testRunInfo',
        },
      },
      {
        $unwind: '$testRunInfo',
      },

      {
        $project: {
          application: '$testRunInfo.application',
          testEnvironment: '$testRunInfo.testEnvironment',
          testType: '$testRunInfo.testType',
          applicationRelease: '$testRunInfo.applicationRelease',
          start: '$testRunInfo.start',
          annotations: '$testRunInfo.annotations',
          trackedTestRunId: '$trackedTestRunId',
          applicationDashboardId: '$applicationDashboardId',
          dashboardLabel: '$dashboardLabel',
          panelTitle: '$panelTitle',
          panelId: '$panelId',
          metricName: '$metricName',
        },
      },
    ];

    const dsAdaptTrackedResults = aggregateQuery(pipeline);

    // let pipeline = [
    //   { "$match": { "testRunId": { "$in": testRunIds,
    //         "trackedConclusion.label": "regression",
    //         "conclusion.label": "regression"
    //   } } },
    //
    //   { "$lookup": {
    //       "from": "dsAdaptResults",
    //       "localField": "testRunId",
    //       "foreignField": "testRunId",
    //       "as": "regressions",
    //       "pipeline": [
    //         {
    //           "$match": {"conclusion.label": "regression"}
    //         },
    //         { "$project": {
    //             "_id": 0,
    //             "trackedTestRunId": 1,
    //             "testRunId": 1,
    //             "testRunStart": 1,
    //             "applicationDashboardId":1,
    //             "panelId": 1,
    //             "panelTitle": 1,
    //             "metricName": 1,
    //             "dashboardLabel": 1
    //           }}
    //       ]
    //     }},
    //   { "$lookup": {
    //       "from": "dsAdaptResults",
    //       "let": { "runId": "$testRunId" },
    //       "pipeline": [
    //         { "$match": {
    //             "$expr": { "$eq": ["$testRunId", "$$runId"] },
    //             "conclusion.label": "regression" }
    //         },
    //         { "$project": {
    //             "_id": 0,
    //             "testRunId": 1,
    //             "applicationDashboardId": 1,
    //             "dashboardLabel": 1,
    //             "panelId": 1,
    //             "panelTitle": 1,
    //             "metricName": 1
    //           }
    //         }
    //       ],
    //       "as": "regressionsDetails"
    //     }
    //   },
    //
    //   { "$project": {
    //       "testRunId": 1,
    //       "applicationRelease": 1,
    //       "annotations": 1,
    //       "adapt.differencesAccepted": 1,
    //       "consolidatedResult": 1,
    //       "start": 1,
    //       "regressions": {"$size": "$regressions"},
    //       "unresolvedRegressions": {"$size": "$unresolvedRegressionDetails"},
    //       "resolvedRegressions": {"$size": "$resolvedRegressions"},
    //       "regressionsDetails": 1,
    //       "unresolvedRegressionDetails": 1
    //     }}
    // ];

    // const groupedResultsByTrackedTestRunId = _.groupBy(dsAdaptTrackedResults, 'trackedTestRunId');

    const groupedResults = dsAdaptTrackedResults.reduce(function (acc, item) {
      if (!acc[item.trackedTestRunId]) {
        acc[item.trackedTestRunId] = {
          trackedTestRunId: item.trackedTestRunId,
          applicationRelease: item.applicationRelease,
          start: item.start,
          annotations: item.annotations,
          application: item.application,
          testEnvironment: item.testEnvironment,
          testType: item.testType,
          data: [],
        };
      }

      acc[item.trackedTestRunId].data.push(item);

      return acc;
    }, {});

    const groupedResultsByTrackedTestRunId = Object.values(groupedResults);

    const groupedResultsByTrackedTestRunIdByMetric =
      groupedResultsByTrackedTestRunId.map((group) => {
        // Perform further grouping on properties applicationDashboardId, dashboardLabel, panelId, panelTitle, and metricName
        const groupedByMultipleKeys = _.groupBy(group.data, (item) => {
          return JSON.stringify([
            item.applicationDashboardId,
            item.dashboardLabel,
            item.panelId,
            item.panelTitle,
            item.metricName,
          ]);
        });

        return {
          trackedTestRunId: group.trackedTestRunId,
          applicationRelease: group.applicationRelease,
          start: group.start,
          annotations: group.annotations,
          application: group.application,
          testEnvironment: group.testEnvironment,
          testType: group.testType,
          data: Object.entries(groupedByMultipleKeys).map(
            ([joinedKeys, data]) => {
              const [
                applicationDashboardId,
                dashboardLabel,
                panelId,
                panelTitle,
                metricName,
              ] = JSON.parse(joinedKeys);
              return {
                trackedTestRunId: group.trackedTestRunId,
                applicationDashboardId,
                dashboardLabel,
                panelId,
                panelTitle,
                metricName,
                data,
              };
            },
          ),
        };
      });

    callback(null, groupedResultsByTrackedTestRunIdByMetric);
  } catch (error) {
    callback(error, null);
  }
};

const updateDsTrackedDifferenceDetailsFn = (testRunId, status, callback) => {
  try {
    DsTrackedDifferences.update(
      {
        testRunId: testRunId,
      },
      {
        $set: {
          status: status,
        },
      },
      {
        multi: true,
      },
    );

    const updateFields = {
      'status.evaluatingAdapt': 'RE_EVALUATE_ADAPT',
    };

    if (status === 'DENIED') {
      updateFields['adapt.mode'] = 'DEFAULT';
    }

    TestRuns.update(
      {
        testRunId: testRunId,
      },
      {
        $set: updateFields,
      },
    );

    callBatchProcess('RE_EVALUATE', [testRunId], true)
      .then(() => callback(null, true))
      .catch((err) => callback(err, null));
  } catch (error) {
    callback(error, null);
  }
};

const getDsCompareConfigByIdFn = (id, callback) => {
  try {
    const objectId = new Mongo.ObjectID(id);

    const dsCompareResult = DsAdaptResults.findOne({
      _id: objectId,
    });

    const testRun = TestRuns.findOne({ testRunId: dsCompareResult.testRunId });

    const dsCompareConfigMetric = DsCompareConfig.findOne({
      $and: [
        { testType: testRun.testType },
        { applicationDashboardId: dsCompareResult.applicationDashboardId },
        { panelId: dsCompareResult.panelId },
        { metricName: dsCompareResult.metricName },
      ],
    });

    if (dsCompareConfigMetric) {
      // dsCompareConfigMetric = completeConfig(dsCompareConfigMetric);
      callback(null, {
        dsCompareConfig: dsCompareConfigMetric,
        dsCompareResult: dsCompareResult,
      });
    } else {
      const dsCompareConfigPanel = DsCompareConfig.findOne({
        $and: [
          { testType: testRun.testType },
          { applicationDashboardId: dsCompareResult.applicationDashboardId },
          { panelId: dsCompareResult.panelId },
        ],
      });
      if (dsCompareConfigPanel) {
        // dsCompareConfigPanel = completeConfig(dsCompareConfigPanel);
        callback(null, {
          dsCompareConfig: dsCompareConfigPanel,
          dsCompareResult: dsCompareResult,
        });
      } else {
        let newDsCompareConfig = {
          application: dsCompareResult.application,
          testEnvironment: dsCompareResult.testEnvironment,
          testType: dsCompareResult.testType,
          dashboardUid: dsCompareResult.dashboardUid,
          dashboardLabel: dsCompareResult.dashboardLabel,
          applicationDashboardId: dsCompareResult.applicationDashboardId,
          panelId: dsCompareResult.panelId,
          panelTitle: dsCompareResult.panelTitle,
          metricName: dsCompareResult.metricName,
        };
        newDsCompareConfig = completeConfig(newDsCompareConfig);

        callback(null, {
          dsCompareConfig: newDsCompareConfig,
          dsCompareResult: dsCompareResult,
        });
      }
    }
  } catch (error) {
    callback(error, null);
  }
};
const updateDsCompareConfigFn = (
  dsCompareConfig,
  testRunId,
  source,
  callback,
) => {
  let dsCompareConfigUpdates = [];

  const testRun = TestRuns.findOne({
    $and: [
      { application: dsCompareConfig.application },
      { testRunId: testRunId },
    ],
  });

  const selector = {
    dashboardUid: dsCompareConfig.dashboardUid,
    applicationDashboardId: dsCompareConfig.applicationDashboardId,
    panelId: { $eq: dsCompareConfig.panelId ? dsCompareConfig.panelId : null },
    application: testRun.application,
    testEnvironment: testRun.testEnvironment,
    testType: testRun.testType,
  };

  if (dsCompareConfig.metricName) {
    selector.metricName = dsCompareConfig.metricName;
  } else {
    selector.metricName = { $eq: null };
  }

  let dsCompareConfigModifier = {
    application: testRun.application,
    testEnvironment: testRun.testEnvironment,
    testType: testRun.testType,
    dashboardLabel: dsCompareConfig.dashboardLabel,
    dashboardUid: dsCompareConfig.dashboardUid,
    applicationDashboardId: dsCompareConfig.applicationDashboardId,
  };

  if (dsCompareConfig.panelId)
    dsCompareConfigModifier['panelId'] = dsCompareConfig.panelId;
  if (dsCompareConfig.panelTitle)
    dsCompareConfigModifier['panelTitle'] = dsCompareConfig.panelTitle;
  if (dsCompareConfig.metricName) {
    dsCompareConfigModifier['metricName'] = dsCompareConfig.metricName;
  } else {
    dsCompareConfigModifier['metricName'] = null;
  }
  if (dsCompareConfig.regex)
    dsCompareConfigModifier['regex'] = dsCompareConfig.regex;
  if (dsCompareConfig.ignore)
    dsCompareConfigModifier['ignore'] = dsCompareConfig.ignore;
  if (dsCompareConfig.statistic)
    dsCompareConfigModifier['statistic'] = dsCompareConfig.statistic;
  if (dsCompareConfig.iqrThreshold)
    dsCompareConfigModifier['iqrThreshold'] = dsCompareConfig.iqrThreshold;
  if (dsCompareConfig.pctThreshold)
    dsCompareConfigModifier['pctThreshold'] = dsCompareConfig.pctThreshold;
  if (dsCompareConfig.absThreshold)
    dsCompareConfigModifier['absThreshold'] = dsCompareConfig.absThreshold;

  dsCompareConfigModifier = completeConfig(dsCompareConfig);

  delete dsCompareConfigModifier._id;

  dsCompareConfigUpdates.push({
    selector: selector,
    modifier: {
      $set: dsCompareConfigModifier,
    },
  });

  if (source === 'panel') {
    const dsCompareConfigMetricUpdates = getMetricDsCompareConfigUpdates(
      selector,
      dsCompareConfig,
    );
    dsCompareConfigUpdates = [
      ...dsCompareConfigUpdates,
      ...dsCompareConfigMetricUpdates,
    ];
  }

  async.each(
    dsCompareConfigUpdates,
    (dsCompareConfigUpdate, updateCallback) => {
      DsCompareConfig.rawCollection().findOneAndUpdate(
        dsCompareConfigUpdate.selector,
        dsCompareConfigUpdate.modifier,
        {
          returnOriginal: false,
          upsert: true,
        },
        function (err) {
          if (err) {
            updateCallback(err);
          }
          updateCallback();
        },
      );
    },
    (err) => {
      if (err) {
        log.debug('Error updating dsCompareConfig: ' + err);
        callback(null, true);
      } else {
        PendingDsCompareConfigChanges.upsert(
          {
            application: testRun.application,
            testType: testRun.testType,
            testEnvironment: testRun.testEnvironment,
          },
          {
            $set: {
              processed: false,
            },
          },
        );

        callback(null, true);
      }
    },
  );
};
const processPendingDsCompareConfigChangesFn = (
  testRun,
  includeControlGroup,
  callback,
) => {
  try {
    let testRunsIds = [testRun.testRunId];

    if (includeControlGroup) {
      const dsChangePoint = DsChangepoints.findOne({
        application: testRun.application,
        testEnvironment: testRun.testEnvironment,
        testType: testRun.testType,
      });
      const controlGroup = DsControlGroups.findOne({
        application: testRun.application,
        testEnvironment: testRun.testEnvironment,
        testType: testRun.testType,
        controlGroupId: testRun.testRunId,
      });

      if (dsChangePoint) {
        const dsChangePointTestRun = TestRuns.findOne({
          testRunId: dsChangePoint.testRunId,
        });
        // if firstDatetime is more recent than the changepoint test run, use the control group firstdatetime
        if (controlGroup.firstDatetime > dsChangePointTestRun.end) {
          testRunsIds = TestRuns.find({
            $and: [
              { application: testRun.application },
              { testEnvironment: testRun.testEnvironment },
              { testType: testRun.testType },
              { start: { $gt: controlGroup.firstDatetime } },
            ],
          })
            .fetch()
            .map((testRun) => testRun.testRunId);
        } else {
          testRunsIds = TestRuns.find({
            $and: [
              { application: testRun.application },
              { testEnvironment: testRun.testEnvironment },
              { testType: testRun.testType },
              { end: { $gt: dsChangePointTestRun.end } },
            ],
          })
            .fetch()
            .map((testRun) => testRun.testRunId);
        }
      } else {
        testRunsIds = TestRuns.find({
          $and: [
            { application: testRun.application },
            { testEnvironment: testRun.testEnvironment },
            { testType: testRun.testType },
            { start: { $gt: controlGroup.firstDatetime } },
          ],
        })
          .fetch()
          .map((testRun) => testRun.testRunId);
      }
    }

    // create batch event for the rest of the test runs to re-evaluate
    PendingDsCompareConfigChanges.upsert(
      {
        application: testRun.application,
        testType: testRun.testType,
        testEnvironment: testRun.testEnvironment,
      },
      {
        $set: {
          processed: true,
        },
      },
    );

    callBatchProcess('RE_EVALUATE', testRunsIds, true)
      .then(() => callback(null, true))
      .catch((err) => callback(err, null));
  } catch (error) {
    callback(error, null);
  }
};

const updateMetricClassificationFn = (
  metricClassification,
  testRunId,
  callback,
) => {
  try {
    const testRun = TestRuns.findOne({
      $and: [
        { application: metricClassification.application },
        { testRunId: testRunId },
      ],
    });

    MetricClassification.rawCollection().findOneAndUpdate(
      {
        dashboardUid: metricClassification.dashboardUid,
        applicationDashboardId: metricClassification.applicationDashboardId,
        panelId: {
          $eq:
            metricClassification.panelId ? metricClassification.panelId : null,
        },
        metricName: {
          $eq:
            metricClassification.metricName ?
              metricClassification.metricName
            : null,
        },
        application: metricClassification.application,
        testEnvironment: metricClassification.testEnvironment,
        testType: metricClassification.testType,
      },
      {
        $set: metricClassification,
      },
      {
        returnOriginal: false,
        upsert: true,
      },
      function (err) {
        if (err) {
          log.error('Error updating metricClassification: ' + err);
        }

        // TestRuns.update({
        //   testRunId: testRun.testRunId
        //   }, {
        //       $set: {
        //           'status.evaluatingAdapt': 'RE_EVALUATE_ADAPT'
        //       }
        // });

        PendingDsCompareConfigChanges.upsert(
          {
            application: testRun.application,
            testType: testRun.testType,
            testEnvironment: testRun.testEnvironment,
          },
          {
            $set: {
              processed: false,
            },
          },
        );

        callback(null, true);
      },
    );
  } catch (error) {
    callback(error, null);
  }
};

export const completeConfig = (dsCompareConfig) => {
  let completeConfig = {};

  const dsCompareConfigQueries = [
    {
      level: 'default',
      query: {
        $and: [
          { application: { $eq: null } },
          { testEnvironment: { $eq: null } },
          { testType: { $eq: null } },
          { panelId: { $eq: null } },
          { metricName: { $eq: null } },
        ],
      },
    },
    {
      level: 'panel',
      query: {
        $and: [
          { application: dsCompareConfig.application },
          { testEnvironment: dsCompareConfig.testEnvironment },
          { testType: dsCompareConfig.testType },
          { applicationDashboardId: dsCompareConfig.applicationDashboardId },
          { panelId: dsCompareConfig.panelId },
          { metricName: { $eq: null } },
        ],
      },
    },
    {
      level: 'metric',
      query: {
        $and: [
          { application: dsCompareConfig.application },
          { testEnvironment: dsCompareConfig.testEnvironment },
          { testType: dsCompareConfig.testType },
          { applicationDashboardId: dsCompareConfig.applicationDashboardId },
          { panelId: dsCompareConfig.panelId },
          { metricName: dsCompareConfig.metricName },
        ],
      },
    },
  ];

  dsCompareConfigQueries.forEach((query) => {
    if (
      query.level === 'default' ||
      (query.level === 'panel' &&
        dsCompareConfig.panelId &&
        dsCompareConfig.application &&
        dsCompareConfig.testEnvironment &&
        dsCompareConfig.testType) ||
      (query.level === 'metric' &&
        dsCompareConfig.metricName &&
        dsCompareConfig.panelId &&
        dsCompareConfig.application &&
        dsCompareConfig.testEnvironment &&
        dsCompareConfig.testType)
    ) {
      // if (query.level === 'default' || (query.level === 'application' && dsCompareConfig.application) || (query.level === 'testEnvironment' && dsCompareConfig.testEnvironment) || (query.level === 'testType' && dsCompareConfig.testType) || (query.level === 'panel' && dsCompareConfig.panelId) || (query.level === 'metric' && dsCompareConfig.metricName)) {
      const result = DsCompareConfig.findOne(query.query);
      if (query.level === 'default' && !result) {
        completeConfig = setDefaultDsCompareConfig(completeConfig);
      } else {
        if (result) {
          completeConfig = Object.assign({}, completeConfig, result);
        }
      }
    }
  });

  completeConfig = Object.assign({}, completeConfig, dsCompareConfig);
  return completeConfig;
};

const getDsTrackedRegressionsFn = (
  dsTrackedDifferencesQuery,
  testRunQuery,
  testRunId,
  dsPanelQuery,
  callback,
) => {
  try {
    let allTestRunIds;

    const testRun = TestRuns.findOne({ testRunId: testRunId });

    testRunQuery.$and.push({ end: { $gte: testRun.end } });

    const testRunsIdsAfterTestRun = TestRuns.find(testRunQuery)
      .fetch()
      .map((testRun) => testRun.testRunId);

    const dsControlGroup = DsControlGroups.findOne({
      controlGroupId: testRunId,
    });

    if (dsControlGroup) {
      allTestRunIds = testRunsIdsAfterTestRun.concat(dsControlGroup.testRuns);
    } else {
      allTestRunIds = testRunsIdsAfterTestRun;
    }

    const panel = DsPanels.findOne(dsPanelQuery);

    const panelYAxesFormat =
      (
        panel.panel &&
        panel.panel.fieldConfig &&
        panel.panel.fieldConfig.defaults &&
        panel.panel.fieldConfig.defaults.unit
      ) ?
        panel.panel.fieldConfig.defaults.unit
      : '';

    dsTrackedDifferencesQuery.$and.push({ testRunId: { $in: allTestRunIds } });

    const dsAdaptResults = DsAdaptResults.find(dsTrackedDifferencesQuery, {
      sort: { testRunStart: 1 },
    }).fetch();

    // For test runs in dsControlGroup that have dsChangepoints but no dsAdaptResults,
    // get data from dsMetricStatistics and map the values
    if (dsControlGroup) {
      const testRunsWithChangepoints = DsChangepoints.find({
        testRunId: { $in: dsControlGroup.testRuns },
      })
        .fetch()
        .map((cp) => cp.testRunId);

      const existingAdaptResultTestRuns = dsAdaptResults.map(
        (result) => result.testRunId,
      );

      const missingAdaptResultTestRuns = testRunsWithChangepoints.filter(
        (testRunId) => !existingAdaptResultTestRuns.includes(testRunId),
      );

      if (missingAdaptResultTestRuns.length > 0) {
        const metricStatisticsQuery = {
          $and: [
            { testRunId: { $in: missingAdaptResultTestRuns } },
            ...dsTrackedDifferencesQuery.$and.filter(
              (condition) =>
                !condition.testRunId && !condition.hasOwnProperty('testRunId'),
            ),
          ],
        };

        const dsMetricStatistics = DsMetricStatistics.find(
          metricStatisticsQuery,
        ).fetch();

        // Map dsMetricStatistics fields to dsAdaptResults format
        const mappedStatistics = dsMetricStatistics.map((stat) => ({
          ...stat,
          controlGroup: true,
          conclusion: {
            label: 'incomparable',
          },
          statistic: {
            test: stat.mean, //TODO use configured aggregation
          },
        }));

        // Add the mapped statistics to dsAdaptResults
        dsAdaptResults.push(...mappedStatistics);

        // Sort again by testRunStart
        dsAdaptResults.sort(
          (a, b) => new Date(a.testRunStart) - new Date(b.testRunStart),
        );
      }
    }

    const testRuns = TestRuns.find(
      {
        testRunId: { $in: allTestRunIds },
      },
      { fields: { testRunId: 1, applicationRelease: 1, annotations: 1 } },
    ).fetch();

    dsAdaptResults.forEach((dsAdaptResult, index) => {
      dsAdaptResults[index].panelYAxesFormat = panelYAxesFormat;
      dsAdaptResults[index].selectedTestRun =
        dsAdaptResult.testRunId === testRunId;
      dsAdaptResults[index].controlGroup = !!(
        dsControlGroup &&
        dsControlGroup.testRuns.includes(dsAdaptResult.testRunId)
      );
      const testRun = testRuns.find(
        (testRun) => testRun.testRunId === dsAdaptResult.testRunId,
      );
      if (testRun) {
        dsAdaptResults[index].applicationRelease = testRun.applicationRelease;
        dsAdaptResults[index].annotations = testRun.annotations;
      }
    });

    callback(null, dsAdaptResults);
  } catch (error) {
    callback(error, null);
  }
};
const getDsMetricsFn = (
  dsMetricsQuery,
  dsPanelQuery,
  dsAdaptResultQuery,
  testRun,
  callback,
) => {
  try {
    const dsMetrics = DsMetrics.find(dsMetricsQuery).fetch();
    const dsAdaptResult = DsAdaptResults.findOne(dsAdaptResultQuery);
    const panel = DsPanels.findOne(dsPanelQuery);

    const panelYAxesFormat =
      (
        panel.panel &&
        panel.panel.fieldConfig &&
        panel.panel.fieldConfig.defaults &&
        panel.panel.fieldConfig.defaults.unit
      ) ?
        panel.panel.fieldConfig.defaults.unit
      : '';

    callback(null, {
      dsMetrics: dsMetrics,
      panelYAxesFormat: panelYAxesFormat,
      dsAdaptResult: dsAdaptResult,
    });
  } catch (error) {
    callback(error, null);
  }
};

const getDsMetricsTrendsFn = (query, callback) => {
  try {
    const testRuns = TestRuns.find(query).fetch();

    const testRunIds = testRuns.map((testRun) => testRun.testRunId);

    const dsMetricStatistics = DsMetricStatistics.find(
      {
        testRunId: { $in: testRunIds },
      },
      {
        fields: {
          applicationDashboardId: 1,
          dashboardLabel: 1,
          panelTitle: 1,
          panelId: 1,
          metricName: 1,
        },
      },
    ).fetch();

    let uniqueCombinations = dsMetricStatistics.reduce((acc, item) => {
      // Form the combination key
      const combinationKey =
        item.applicationDashboardId +
        '#' +
        item.dashboardLabel +
        '#' +
        item.panelId +
        '#' +
        item.panelTitle +
        '#' +
        item.metricName;

      // If the combination key is not in the set yet, add the original properties
      if (!acc.has(combinationKey)) {
        // Add properties to an object
        const combination = {
          applicationDashboardId: item.applicationDashboardId,
          dashboardLabel: item.dashboardLabel,
          panelId: item.panelId,
          panelTitle: item.panelTitle,
          metricName: item.metricName,
        };

        acc.set(combinationKey, combination);
      }

      return acc;
      // eslint-disable-next-line no-undef
    }, new Map());

    // Convert the uniqueCombinations map values to an array
    uniqueCombinations = Array.from(uniqueCombinations.values());

    const metricClassifications = MetricClassification.find({
      $and: [
        { application: query.application },
        { testEnvironment: query.testEnvironment },
        { testType: query.testType },
      ],
    }).fetch();

    uniqueCombinations.forEach((uniqueCombination, index) => {
      // Try to find a match based on applicationDashboardId, panelId, and metricName
      let match = metricClassifications.find(
        (classification) =>
          classification.applicationDashboardId ===
            uniqueCombination.applicationDashboardId &&
          classification.panelId === uniqueCombination.panelId &&
          classification.metricName === uniqueCombination.metricName,
      );

      if (!match) {
        // No full match found, trying to match again based on applicationDashboardId and panelId
        match = metricClassifications.find(
          (classification) =>
            classification.applicationDashboardId ===
              uniqueCombination.applicationDashboardId &&
            classification.panelId === uniqueCombination.panelId,
        );
      }

      // If a match is found, populate the metricClassification variable
      if (match) {
        uniqueCombinations[index].metricClassification =
          match.metricClassification;
      } else {
        // If no match is found, create a default metricClassification
        uniqueCombinations[index].metricClassification = 'UNKNOWN';
      }
    });

    callback(null, uniqueCombinations);
  } catch (error) {
    callback(error, null);
  }
};

const getDsMetricStatisticsTrendsFn = (
  query,
  adapt,
  application,
  testEnvironment,
  testType,
  periodTimestamp,
  callback,
) => {
  try {
    const testRuns = TestRuns.find({
      $and: [
        { application: application },
        { testEnvironment: testEnvironment },
        { testType: testType },
        { start: { $gte: periodTimestamp } },
      ],
    }).fetch();

    if (testRuns.length > 0) {
      const testRunIds = testRuns.map((testRun) => testRun.testRunId);
      query.testRunId = { $in: testRunIds };
    }

    let dsMetricStatistics;

    if (adapt === true) {
      dsMetricStatistics = DsAdaptResults.find(query).fetch();
    } else {
      dsMetricStatistics = DsMetricStatistics.find(query).fetch();
    }

    dsMetricStatistics.forEach((dsMetricStatistic, index) => {
      const testRun = testRuns.find(
        (testRun) => testRun.testRunId === dsMetricStatistic.testRunId,
      );
      dsMetricStatistics[index].index = index;
      if (testRun) {
        dsMetricStatistics[index].applicationRelease =
          testRun.applicationRelease;
        dsMetricStatistics[index].annotations = testRun.annotations;
        dsMetricStatistics[index].testRunStart = testRun.start;
      }
    });

    callback(null, dsMetricStatistics);
  } catch (error) {
    callback(error, null);
  }
};

const resolveRegressionFn = (testRun, status, reEvaluate, callback) => {
  try {
    let testRunsIds;

    // Update test run differencesAccepted status
    TestRuns.update(
      {
        testRunId: testRun.testRunId,
      },
      {
        $set: {
          'adapt.differencesAccepted': status,
          'adapt.mode': 'DEFAULT',
        },
      },
    );

    if (reEvaluate === true) {
      // create re-evaluate batch for all test runs after change point if it exists
      // let dsChangePoint = DsChangepoints.findOne({
      //   application: testRun.application,
      //   testEnvironment: testRun.testEnvironment,
      //   testType: testRun.testType
      // });
      //
      // let controlGroup = DsControlGroups.findOne({
      //   application: testRun.application,
      //   testEnvironment: testRun.testEnvironment,
      //   testType: testRun.testType,
      //   controlGroupId: testRun.testRunId
      // });

      // if (dsChangePoint) {
      //   let dsChangePointTestRun = TestRuns.findOne({testRunId: dsChangePoint.testRunId});
      testRunsIds = TestRuns.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
          { end: { $gte: testRun.end } },
          { 'adapt.mode': { $ne: 'DEBUG' } },
        ],
      })
        .fetch()
        .map((testRun) => testRun.testRunId);

      // add current test run id to testRunsIds if it is not already in the list, in case status = 'DENIED'
      if (!testRunsIds.includes(testRun.testRunId)) {
        testRunsIds.push(testRun.testRunId);
      }
      // } else {
      //   testRunsIds = TestRuns.find({
      //     $and: [
      //       {application: testRun.application},
      //       {testEnvironment: testRun.testEnvironment},
      //       {testType: testRun.testType},
      //       {start: {$gt: controlGroup.firstDatetime}}
      //     ]
      //   }).fetch().map(testRun => testRun.testRunId);
      // }

      // create batch event
      callBatchProcess('RE_EVALUATE', testRunsIds, true)
        .then(() => callback(null, true))
        .catch((err) => callback(err, null));
    } else {
      callback(null, true);
    }
  } catch (error) {
    callback(error, null);
  }
};

const getTestRunAdaptStatusFn = (testRun, callback) => {
  try {
    if (testRun.status && testRun.status.evaluatingAdapt) {
      switch (testRun.status.evaluatingAdapt) {
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
        case 'RE_EVALUATE_ADAPT':
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
          callback(null, 'ADAPT is not enabled');
          break;
        case 'NO_BASELINES_FOUND':
          callback(null, 'No valid control group found');
          break;
        default:
          callback(null, 'Status unknown');
      }
    } else {
      callback(null, 'Not configured'); //TODO implement opt-in adapt logic
    }
  } catch (err) {
    callback(err, null);
  }
};

const getMetricDsCompareConfigUpdates = (selector, dsCompareConfig) => {
  const dsCompareConfigUpdates = [];

  const keys = [
    'ignore',
    'statistic',
    'iqrThreshold',
    'pctThreshold',
    'absThreshold',
  ];

  const selectorCopy = Object.assign({}, selector);
  delete selectorCopy.metricName;

  const panelDsCompareConfigs = DsCompareConfig.find(selectorCopy).fetch();

  panelDsCompareConfigs.forEach((panelDsCompareConfig) => {
    keys.forEach((key) => {
      if (dsCompareConfig[key]) {
        if (
          dsCompareConfig[key].value !== panelDsCompareConfig[key].value &&
          panelDsCompareConfig[key].source !== 'metric'
        ) {
          const updatSelector = {
            dashboardUid: dsCompareConfig.dashboardUid,
            applicationDashboardId: dsCompareConfig.applicationDashboardId,
            panelId: dsCompareConfig.panelId,
            application: dsCompareConfig.application,
            testEnvironment: dsCompareConfig.testEnvironment,
            testType: dsCompareConfig.testType,
          };

          if (dsCompareConfig.metricName)
            updatSelector.metricName = dsCompareConfig.metricName;

          dsCompareConfigUpdates.push({
            selector: updatSelector,
            modifier: {
              $set: {
                [key]: {
                  value: dsCompareConfig[key].value,
                  source: 'panel',
                },
              },
            },
          });
        }
      }
    });
  });

  return dsCompareConfigUpdates;
};
