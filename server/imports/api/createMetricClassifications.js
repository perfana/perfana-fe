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

import { DsCompareConfig } from '/imports/collections/dsCompareConfig';
import { GoldenPathMetricClassification } from '/imports/collections/goldePathMetricClassification';
import { ApplicationDashboards } from '/imports/collections/applicationDashboards';
import { MetricClassification } from '/imports/collections/metricClassification';
import { completeConfig } from '/imports/api/dataScience';

export const createMetricClassifications = function (testRun) {
  const applicationDashboards = ApplicationDashboards.find({
    $and: [
      { application: testRun.application },
      { testEnvironment: testRun.testEnvironment },
    ],
  }).fetch();

  const goldenPathMetricClassifications =
    GoldenPathMetricClassification.find().fetch();

  applicationDashboards.forEach((dashboard) => {
    const dsCompareConfigs = DsCompareConfig.find({
      $and: [
        { application: testRun.application },
        { testEnvironment: testRun.testEnvironment },
        { testType: testRun.testType },
        { applicationDashboardId: dashboard._id },
      ],
    }).fetch();
    const metricClassifications = MetricClassification.find({
      $and: [
        { application: testRun.application },
        { testEnvironment: testRun.testEnvironment },
        { testType: testRun.testType },
        { applicationDashboardId: dashboard._id },
      ],
    }).fetch();

    const goldenPathMetricClassificationsForDashboard =
      goldenPathMetricClassifications.filter(
        (goldenPathMetricClassification) => {
          return (
            goldenPathMetricClassification.dashboardUid ===
            dashboard.dashboardUid
          );
        },
      );

    goldenPathMetricClassificationsForDashboard.forEach(
      (goldenPathMetricClassification) => {
        const existingMetricClassification = metricClassifications.filter(
          (metricClassification) => {
            if (goldenPathMetricClassification.metricName) {
              return (
                metricClassification.dashboardUid ===
                  goldenPathMetricClassification.dashboardUid &&
                metricClassification.panelId ===
                  goldenPathMetricClassification.panelId &&
                metricClassification.metricName ===
                  goldenPathMetricClassification.metricName
              );
            } else {
              return (
                metricClassification.dashboardUid ===
                  goldenPathMetricClassification.dashboardUid &&
                metricClassification.panelId ===
                  goldenPathMetricClassification.panelId
              );
            }
          },
        );

        if (existingMetricClassification.length === 0) {
          MetricClassification.insert({
            application: testRun.application,
            testEnvironment: testRun.testEnvironment,
            testType: testRun.testType,
            applicationDashboardId: dashboard._id,
            dashboardUid: dashboard.dashboardUid,
            dashboardLabel: dashboard.dashboardLabel,
            panelId: goldenPathMetricClassification.panelId,
            panelTitle: goldenPathMetricClassification.panelTitle,
            metricClassification:
              goldenPathMetricClassification.metricClassification,
            higherIsBetter: goldenPathMetricClassification.higherIsBetter,
            metricName:
              goldenPathMetricClassification.metricName ?
                goldenPathMetricClassification.metricName
              : null,
            regex: goldenPathMetricClassification.regex === true,
          });
        }

        const existingDsCompareConfigs = dsCompareConfigs.filter(
          (dsCompareConfig) => {
            if (goldenPathMetricClassification.metricName) {
              return (
                dsCompareConfig.dashboardUid ===
                  goldenPathMetricClassification.dashboardUid &&
                dsCompareConfig.panelId ===
                  goldenPathMetricClassification.panelId &&
                dsCompareConfig.metricName ===
                  goldenPathMetricClassification.metricName
              );
            } else {
              return (
                dsCompareConfig.dashboardUid ===
                  goldenPathMetricClassification.dashboardUid &&
                dsCompareConfig.panelId ===
                  goldenPathMetricClassification.panelId
              );
            }
          },
        );

        if (existingDsCompareConfigs.length === 0) {
          const source =
            goldenPathMetricClassification.metricName ? 'metric' : 'panel';

          const newGoldenPathDsCompareConfig = {
            application: testRun.application,
            testEnvironment: testRun.testEnvironment,
            testType: testRun.testType,
            applicationDashboardId: dashboard._id,
            dashboardUid: dashboard.dashboardUid,
            dashboardLabel: dashboard.dashboardLabel,
            panelId: goldenPathMetricClassification.panelId,
            panelTitle: goldenPathMetricClassification.panelTitle,
            metricName:
              goldenPathMetricClassification.metricName ?
                goldenPathMetricClassification.metricName
              : null,
            regex: goldenPathMetricClassification.regex === true,
          };
          if (goldenPathMetricClassification.absThreshold) {
            newGoldenPathDsCompareConfig.absThreshold = {
              value: goldenPathMetricClassification.absThreshold,
              source: source,
            };
          }
          if (goldenPathMetricClassification.iqrThreshold) {
            newGoldenPathDsCompareConfig.iqrThreshold = {
              value: goldenPathMetricClassification.iqrThreshold,
              source: source,
            };
          }
          if (goldenPathMetricClassification.pctThreshold) {
            newGoldenPathDsCompareConfig.pctThreshold = {
              value: goldenPathMetricClassification.pctThreshold,
              source: source,
            };
          }
          if (goldenPathMetricClassification.nThreshold) {
            newGoldenPathDsCompareConfig.nThreshold = {
              value: goldenPathMetricClassification.nThreshold,
              source: source,
            };
          }

          const completedConfig = completeConfig(newGoldenPathDsCompareConfig);
          delete completedConfig._id;
          DsCompareConfig.insert(completedConfig);
        }
      },
    );
  });

  return true;
};
