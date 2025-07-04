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
import { Applications } from '../collections/applications';
import { ApplicationDashboards } from '../collections/applicationDashboards';
import { GrafanaDashboards } from '../collections/grafanaDashboards';
import { Benchmarks } from '../collections/benchmarks';
import { CheckResults } from '../collections/checkResults';
import { CompareResults } from '../collections/compareResults';
import { TestRuns } from '../collections/testruns';
import { AbortAlertTags } from '../collections/abortAlertTags';
import { Comments } from '../collections/comments';
import { NotificationsChannels } from '../collections/notificationChannels';
import { ReportPanels } from '../collections/reportPanels';
import { Snapshots } from '../collections/snapshots';
import { Versions } from '../collections/versions';
import { Grafanas } from '../collections/grafanas';
import { DsMetrics } from '../collections/dsMetrics';

import { check } from 'meteor/check';
import jsZip from 'jszip';
import { grafanaCall } from '../helpers/grafana/grafana-api-with-api-key';
import async from 'async';
import { log } from '/both/logger';
import fs from 'fs';
import v8 from 'v8';
import _ from 'lodash';

Meteor.methods({
  exportTestRunData: (
    applicationName,
    testRunId,
    testType,
    testEnvironment,
  ) => {
    check(applicationName, String);
    check(testRunId, String);
    check(testType, String);
    check(testEnvironment, String);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'get.export-data.unauthorized',
        'The user is not authorized to get export data',
      );
    }

    const wrap = Meteor.makeAsync(exportTestRunDataFn);
    return wrap(applicationName, testRunId, testType, testEnvironment);
  },
  createHeapDump: () => {
    const wrap = Meteor.makeAsync(createHeapdumpFn);
    return wrap();
  },
});

const createHeapdumpFn = (callback) => {
  // noinspection JSCheckFunctionSignatures
  log.info('Creating heapdump ...');

  // It's important that the filename end with `.heapsnapshot`,
  // otherwise Chrome DevTools won't open it.
  const fileName = `${Date.now()}.heapsnapshot`;
  const fileStream = fs.createWriteStream(`/tmp/${fileName}`);
  callback(null, { message: `Heap dump will be saved at ${fileStream.path}` });
  setTimeout(() => {
    const snapshotStream = v8.getHeapSnapshot();
    snapshotStream.pipe(fileStream);
  }, 3000);

  fileStream.on('finish', () => {
    // noinspection JSCheckFunctionSignatures

    log.info(`Heap dump saved at ${fileStream.path}`);
  });
};

const exportTestRunDataFn = (
  applicationName,
  exportTestRunId,
  testType,
  testEnvironment,
  callback,
) => {
  try {
    const archive = _initializeZipArchive();

    /* Test run */

    const testRun = TestRuns.findOne({
      $and: [
        { application: applicationName },
        { testRunId: exportTestRunId },
        { testType: testType },
        { testEnvironment: testEnvironment },
      ],
    });

    if (testRun) {
      const testRunId = testRun.testRunId
        .replace(/\//g, '-')
        .replace(/\s/g, '-')
        .replace(/\|/g, '-')
        .replace(/=/g, '-')
        .replace(/\(/g, '-')
        .replace(/\)/g, '-');

      _addDirToZipArchive(testRunId, archive, 'test-run');

      _compileZip(
        testRunId,
        'test-run',
        `test-run-${testRunId}.json`,
        archive,
        JSON.stringify(testRun),
      );

      /* Versions */

      const versions = Versions.find().fetch();

      _addDirToZipArchive(testRunId, archive, 'version');

      _compileZip(
        testRunId,
        'version',
        'versions.json',
        archive,
        JSON.stringify(versions),
      );

      /* Application */

      const application = Applications.findOne({
        name: applicationName,
      });

      _addDirToZipArchive(testRunId, archive, 'system-under-test');

      _compileZip(
        testRunId,
        'system-under-test',
        `system-under-test-${application.name.replace(/\s/g, '-').replace(/\|/g, '-').replace(/=/g, '-').replace(/\(/g, '-').replace(/\)/g, '-')}.json`,
        archive,
        JSON.stringify(application),
      );

      /* ApplicationDashboards */

      const applicationDashboards = ApplicationDashboards.find({
        $and: [
          { application: applicationName },
          { testEnvironment: testEnvironment },
        ],
      }).fetch();

      _addDirToZipArchive(testRunId, archive, 'application-dashboards');

      applicationDashboards.forEach((applicationDashboard) => {
        _compileZip(
          testRunId,
          'application-dashboards',
          `application-dashboard-${applicationDashboard.dashboardLabel.replace(/\s/g, '-').replace(/\|/g, '-').replace(/=/g, '-').replace(/\(/g, '-').replace(/\)/g, '-')}.json`,
          archive,
          JSON.stringify(applicationDashboard),
        );
      });

      /* GrafanaDashboards */

      const dashboarUids = applicationDashboards.map((applicationDashboard) => {
        return applicationDashboard.dashboardUid;
      });

      const grafanaDashboards = GrafanaDashboards.find({
        uid: { $in: _.unique(dashboarUids) },
      }).fetch();

      _addDirToZipArchive(testRunId, archive, 'grafana-dashboards');

      grafanaDashboards.forEach((grafanaDashboard) => {
        _compileZip(
          testRunId,
          'grafana-dashboards',
          `grafana-dashboard-${grafanaDashboard.name.replace(/\s/g, '-').replace(/\|/g, '-').replace(/=/g, '-').replace(/\(/g, '-').replace(/\)/g, '-')}.json`,
          archive,
          JSON.stringify(grafanaDashboard),
        );
      });

      /* Benchmarks */

      const benchmarks = Benchmarks.find({
        $and: [
          { application: applicationName },
          { testEnvironment: testEnvironment },
          { testType: testType },
        ],
      }).fetch();

      _addDirToZipArchive(testRunId, archive, 'service-level-indicators');

      benchmarks.forEach((benchmark) => {
        _compileZip(
          testRunId,
          'service-level-indicators',
          `service-level-indicator-${benchmark.dashboardLabel.replace(/\s/g, '-').replace(/\|/g, '-').replace(/=/g, '-').replace(/\(/g, '-').replace(/\)/g, '-')}-${benchmark.panel.title.replace(/\s/g, '-').replace(/\|/g, '-').replace(/=/g, '-').replace(/\(/g, '-').replace(/\)/g, '-')}.json`,
          archive,
          JSON.stringify(benchmark),
        );
      });

      /* CheckResults */

      const checkResults = CheckResults.find({
        $and: [
          { application: applicationName },
          { testEnvironment: testEnvironment },
          { testType: testType },
          { testRunId: exportTestRunId },
        ],
      }).fetch();

      _addDirToZipArchive(testRunId, archive, 'check-results');

      checkResults.forEach((checkResult) => {
        _compileZip(
          testRunId,
          'check-results',
          `check-result-${checkResult.dashboardLabel.replace(/\s/g, '-').replace(/\|/g, '-').replace(/=/g, '-').replace(/\(/g, '-').replace(/\)/g, '-')}-${checkResult.panelTitle.replace(/\s/g, '-').replace(/\|/g, '-').replace(/=/g, '-').replace(/\(/g, '-').replace(/\)/g, '-')}-${checkResult.benchmarkId}.json`,
          archive,
          JSON.stringify(checkResult),
        );
      });

      /* CompareResults */

      const compareResults = CompareResults.find({
        $and: [
          { application: applicationName },
          { testEnvironment: testEnvironment },
          { testType: testType },
          { testRunId: exportTestRunId },
        ],
      }).fetch();

      _addDirToZipArchive(testRunId, archive, 'compare-results');

      compareResults.forEach((compareResult) => {
        const baselineTestRunId = compareResult.baselineTestRunId
          .replace(/\//g, '-')
          .replace(/\s/g, '-')
          .replace(/\|/g, '-')
          .replace(/=/g, '-')
          .replace(/\(/g, '-')
          .replace(/\)/g, '-');
        const benchmarkId = compareResult.benchmarkId
          ? compareResult.benchmarkId
          : 'custom-comparison';
        _compileZip(
          testRunId,
          'compare-results',
          `compare-result-${baselineTestRunId}-${compareResult.dashboardLabel.replace(/\s/g, '-').replace(/\|/g, '-').replace(/=/g, '-').replace(/\(/g, '-').replace(/\)/g, '-').replace(/\//g, '-')}-${compareResult.panelTitle.replace(/\s/g, '-').replace(/\|/g, '-').replace(/=/g, '-').replace(/\(/g, '-').replace(/\)/g, '-').replace(/\//g, '-')}-${benchmarkId}.json`,
          archive,
          JSON.stringify(compareResult),
        );
      });

      /* AbortAlertTags */

      const abortAlertTags = AbortAlertTags.find({
        $and: [
          { application: applicationName },
          { testType: testType },
          { testEnvironment: testEnvironment },
        ],
      }).fetch();

      _addDirToZipArchive(testRunId, archive, 'abort-alert-tags');

      abortAlertTags.forEach((abortAlertTag) => {
        _compileZip(
          testRunId,
          'abort-alert-tags',
          `abort-alert-tag-${abortAlertTag.alertSource}-${abortAlertTag.tag.key}.json`,
          archive,
          JSON.stringify(abortAlertTag),
        );
      });

      /* Comments */

      const comments = Comments.find({
        $and: [
          { application: applicationName },
          { testEnvironment: testEnvironment },
          { testType: testType },
          { testRunId: exportTestRunId },
        ],
      }).fetch();

      _addDirToZipArchive(testRunId, archive, 'comments');

      comments.forEach((comment, index) => {
        _compileZip(
          testRunId,
          'comments',
          `comment-${index}.json`,
          archive,
          JSON.stringify(comment),
        );
      });

      /* NotificationsChannels */

      _addDirToZipArchive(testRunId, archive, 'notification-channels');

      const notificationsChannels = NotificationsChannels.find({
        application: applicationName,
      }).fetch();

      notificationsChannels.forEach((notificationsChannel, index) => {
        _compileZip(
          testRunId,
          'notification-channels',
          `notification-channel-${index}.json`,
          archive,
          JSON.stringify(notificationsChannel),
        );
      });

      /* ReportPanels */

      const reportPanels = ReportPanels.find(
        {
          $and: [
            { application: applicationName },
            { testEnvironment: testEnvironment },
            { testType: testType },
          ],
        },
        { sort: { index: 1 } },
      ).fetch();

      _addDirToZipArchive(testRunId, archive, 'report-panels');

      reportPanels.forEach((reportPanel) => {
        _compileZip(
          testRunId,
          'report-panels',
          `report-panel-${reportPanel.dashboardLabel.replace(/\s/g, '-').replace(/\|/g, '-').replace(/=/g, '-').replace(/\(/g, '-').replace(/\)/g, '-')}-${reportPanel.panel.title.replace(/\s/g, '-').replace(/\|/g, '-').replace(/=/g, '-').replace(/\(/g, '-').replace(/\)/g, '-')}.json`,
          archive,
          JSON.stringify(reportPanel),
        );
      });

      /* DsMetrics */

      const dsMetrics = DsMetrics.find(
        {
          $and: [
            { testRunId: exportTestRunId },
            { benchmarkIds: { $ne: null } },
          ],
        },
        { sort: { index: 1 } },
      ).fetch();

      _addDirToZipArchive(testRunId, archive, 'ds-metrics');

      dsMetrics.forEach((dsMetric) => {
        _compileZip(
          testRunId,
          'ds-metrics',
          `ds-metrics-${dsMetric.dashboardLabel.replace(/\s/g, '-').replace(/\|/g, '-').replace(/=/g, '-').replace(/\(/g, '-').replace(/\)/g, '-')}-${dsMetric.panelTitle.replace(/\s/g, '-').replace(/\|/g, '-').replace(/=/g, '-').replace(/\(/g, '-').replace(/\)/g, '-')}.json`,
          archive,
          JSON.stringify(dsMetric),
        );
      });

      /* Snapshots */

      const snapshots = Snapshots.find({
        $and: [
          { application: applicationName },
          { testEnvironment: testEnvironment },
          { testType: testType },
          { testRunId: exportTestRunId },
        ],
      }).fetch();

      _addDirToZipArchive(testRunId, archive, 'snapshots');

      _addDirToZipArchive(testRunId, archive, 'grafana-data-sources');

      const dataSources = [];

      /* Grafana snapshots */

      async.eachLimit(
        snapshots,
        1,
        (snapshot, callback) => {
          const grafana = Grafanas.findOne({
            label: snapshot.grafana,
          });

          if (grafana) {
            /* Grafana data sources */

            const grafanaDataSources = Meteor.makeAsync(grafanaCall)(
              grafana,
              '/api/datasources',
            );

            if (grafanaDataSources.error)
              log.error(
                'grafanaDataSource.error: ' +
                  JSON.stringify(grafanaDataSources.error),
              );

            if (grafanaDataSources.data) {
              grafanaDataSources.data.forEach((grafanaDataSource) => {
                if (
                  dataSources
                    .map((dataSource) => {
                      return dataSource.id;
                    })
                    .indexOf(grafanaDataSource.id) === -1
                ) {
                  _compileZip(
                    testRunId,
                    'grafana-data-sources',
                    `grafana-data-source-${grafanaDataSource.name.replace(/\s/g, '-').replace(/\|/g, '-').replace(/=/g, '-').replace(/\(/g, '-').replace(/\)/g, '-')}.json`,
                    archive,
                    JSON.stringify(grafanaDataSource),
                  );
                  dataSources.push(grafanaDataSource);
                }
              });
            }

            const storedSnapshot = Meteor.makeAsync(grafanaCall)(
              grafana,
              '/api/snapshots/' + snapshot.url.split('/').reverse()[0],
            );

            if (storedSnapshot.error)
              log.error(
                'storedSnapshot.error: ' + JSON.stringify(storedSnapshot.error),
              );

            if (storedSnapshot.data) {
              const combinedSnapshot = {
                mongoDb: snapshot,
                grafana: storedSnapshot.data,
              };

              _compileZip(
                testRunId,
                'snapshots',
                `snapshot-${snapshot.dashboardLabel.replace(/\s/g, '-').replace(/\|/g, '-').replace(/=/g, '-').replace(/\(/g, '-').replace(/\)/g, '-')}.json`,
                archive,
                JSON.stringify(combinedSnapshot),
              );
            }

            callback();
          }
        },
        (err) => {
          // if any of the file processing produced an error, err would equal that error
          if (err) {
            log.error('Snapshots failed to process');
            archive
              .generateAsync({ type: 'base64' })
              .then((archivedExportData) => {
                callback(null, archivedExportData);
              });
          } else {
            archive
              .generateAsync({ type: 'base64' })
              .then((archivedExportData) => {
                callback(null, archivedExportData);
              });
          }
        },
      );
    }
  } catch (e) {
    callback(e, null);
  }
};

const _initializeZipArchive = () => {
  return new jsZip();
};

const _compileZip = (testRunId, folderName, fileName, archive, exportData) => {
  _addFileToZipArchive(testRunId, archive, folderName, fileName, exportData);
};

const _addFileToZipArchive = (
  testRunId,
  archive,
  folderName,
  fileName,
  contents,
) => {
  archive.file(`${testRunId}/${folderName}/${fileName}`, contents);
};

const _addDirToZipArchive = (testRunId, archive, folderName) => {
  archive.folder(`${testRunId}/${folderName}`);
};
