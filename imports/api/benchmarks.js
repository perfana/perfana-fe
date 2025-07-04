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
import { check, Match } from 'meteor/check';
import { TestRuns } from '/imports/collections/testruns';
import { GrafanaDashboards } from '/imports/collections/grafanaDashboards';
import { ApplicationDashboards } from '/imports/collections/applicationDashboards';
import { Grafanas } from '/imports/collections/grafanas';
import { Benchmarks } from '/imports/collections/benchmarks';
import { CheckResults } from '/imports/collections/checkResults';
import { CompareResults } from '/imports/collections/compareResults';
import { Applications } from '/imports/collections/applications';
import { userHasPermission } from '../helpers/checkPermission';
import { log } from '/both/logger';
import { supportedPanelTypes } from '/both/grafanaConfig';
import _ from 'lodash';

if (Meteor.isServer) {
  Meteor.publish('benchmarks', (query) => {
    check(query, Match.OneOf(undefined, null, Object));
    log.debug(
      '######### benchmarks subscription query: ' + JSON.stringify(query),
    );

    if (
      query.$and.length === 0 ||
      query.$and.some((obj) => Object.keys(obj).length === 0)
    ) {
      return [];
    } else {
      return Benchmarks.find(query);
    }
  });
}

Meteor.methods({
  updateBenchmarkMatchPattern: (benchmark, testRun) => {
    check(benchmark, Object);
    check(testRun, Object);

    if (!userHasPermission(Meteor.userId(), benchmark.application)) {
      throw new Meteor.Error(
        'update.key-metric.unauthorized',
        'The user is not authorized to update a service level indicator for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(updateBenchmarkMatchPatternFn);
    return wrap(benchmark, testRun);
  },
  deleteBenchmark: (benchmark) => {
    check(benchmark, Object);

    if (!userHasPermission(Meteor.userId(), benchmark.application)) {
      throw new Meteor.Error(
        'delete.key-metric.unauthorized',
        'The user is not authorized to delete a service level indicator for this system under test',
      );
    }

    Benchmarks.remove(benchmark._id);
    // remove all checkResults docs based on this benchmark
    CheckResults.remove({
      benchmarkId: benchmark._id,
    });
    // remove all compareResults docs based on this benchmark
    CompareResults.remove({
      benchmarkId: benchmark._id,
    });
  },
  insertBenchmark: (benchmark) => {
    check(benchmark, Object);

    if (!userHasPermission(Meteor.userId(), benchmark.application)) {
      throw new Meteor.Error(
        'insert.key-metric.unauthorized',
        'The user is not authorized to create a service level indicator for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(insertBenchmarkFn);
    return wrap(benchmark);
  },
  updateBenchmark: (benchmark, benchmarkId) => {
    check(benchmark, Object);
    check(benchmarkId, String);

    if (!userHasPermission(Meteor.userId(), benchmark.$set.application)) {
      throw new Meteor.Error(
        'update.key-metric.unauthorized',
        'The user is not authorized to update a service level indicator for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(updateBenchmarkFn);
    return wrap(benchmark, benchmarkId);
  },
  updateChecksForTestRun: (testRun) => {
    check(testRun, Object);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'update.test-runs.unauthorized',
        'The user is not authorized to update test runs for this system under test',
      );
    }
    const wrap = Meteor.makeAsync(updateChecksForTestRunFn);
    return wrap(testRun);
  },
  getApplicationBenchmarkDashboardLabels: (params) => {
    check(params, Match.OneOf(undefined, null, Object));
    if (params.params !== null) {
      check(params, Object);

      const environmentDashboards = ApplicationDashboards.find({
        $and: [
          { grafana: params.params.grafanaLabel },
          { application: params.params.application },
          { testEnvironment: params.params.testEnvironment },
        ],
      }).fetch();

      if (params.params.influxDbOnly) {
        const influxDashboards = [];

        _.each(environmentDashboards, (applicationDashboard) => {
          let hasInfluxPanel = false;

          const grafanaDashboard = GrafanaDashboards.findOne({
            $and: [
              { grafana: applicationDashboard.grafanaLabel },
              { name: applicationDashboard.dashboardName },
            ],
          });

          if (grafanaDashboard) {
            _.some(grafanaDashboard.panels, (panel) => {
              if (panel.datasourceType === 'influxdb') {
                hasInfluxPanel = true;
                return true; // Stops further iterations
              }
            });

            if (hasInfluxPanel === true)
              influxDashboards.push(applicationDashboard);
          }
        });

        return _.uniq(influxDashboards).map((v) => ({
          label: v.dashboardLabel,
          value: v.dashboardLabel,
        }));
      } else {
        return _.uniq(environmentDashboards).map((v) => ({
          label: v.dashboardLabel,
          value: v.dashboardLabel,
        }));
      }
    } else {
      return [];
    }
  },
  getGrafanas: () => {
    const grafanas = Grafanas.find({});

    if (grafanas) {
      return grafanas.map((v) => ({
        label: v.label,
        value: v.label,
      }));
    } else {
      return [];
    }
  },
  getBenchmarkGrafanas: (params) => {
    check(params, Match.OneOf(undefined, null, Object));
    if (params.params !== null) {
      check(params, Object);

      const environmentDashbooards = ApplicationDashboards.find({
        $and: [
          { application: params.params.application },
          { testEnvironment: params.params.testEnvironment },
        ],
      }).fetch();

      const grafanas = Grafanas.find({}).fetch();

      if (grafanas) {
        const applicationGrafanas = [];

        _.each(grafanas, (grafana) => {
          _.each(environmentDashbooards, (environmentDashboard) => {
            if (environmentDashboard.grafana === grafana.label)
              applicationGrafanas.push(grafana);
          });
        });

        return _.uniq(applicationGrafanas).map((v) => ({
          label: v.label,
          value: v.label,
        }));
      } else {
        return [];
      }
    } else {
      return [];
    }
  },
  getDashboardPanels: (params) => {
    check(params, Match.OneOf(undefined, null, Object));
    if (params.params !== null) {
      check(params, Object);

      const applicationDashboard = ApplicationDashboards.findOne({
        $and: [
          { grafana: params.params.grafanaLabel },
          { dashboardUid: params.params.dashboardUid },
        ],
      });

      if (applicationDashboard) {
        const grafanaDashboard = GrafanaDashboards.findOne({
          $and: [
            { grafana: applicationDashboard.grafana },
            { uid: applicationDashboard.dashboardUid },
          ],
        });

        if (grafanaDashboard) {
          /* for KPI filter out only panels of type graph */
          if (params.params.forKpi) {
            // let filteredPanels = grafanaDashboard.panels.filter( panel => { return panel.type === 'graph' || panel.type === 'timeseries' || panel.type === 'table' || panel.type === 'table-old'});
            const filteredPanels = grafanaDashboard.panels.filter((panel) => {
              return supportedPanelTypes.indexOf(panel.type) !== -1;
            });

            return _.uniq(
              filteredPanels.map((p) => ({
                label: `${p.id}-${p.title}`,
                value: `${p.id}-${p.title}`,
              })),
            );
          } else {
            const filteredPanels = grafanaDashboard.panels.filter((panel) => {
              return panel.type !== 'row';
            });

            return _.uniq(
              filteredPanels.map((p) => ({
                label: `${p.id}-${p.title}`,
                value: `${p.id}-${p.title}`,
              })),
            );
          }
        } else {
          return [];
        }
      } else {
        return [];
      }
    } else {
      return [];
    }
  },
});
export const updateChecksForTestRunFn = (testRun, callback) => {
  // update test run status to trigger re-evaluation of checks and comparisons after refactoring of perfana-check

  const application = Applications.findOne({
    name: testRun.application,
  });

  let runAdapt;
  let testTypeIndex = -1;

  const testEnvironmentIndex = application.testEnvironments
    .map((testEnvironment) => {
      return testEnvironment.name;
    })
    .indexOf(testRun.testEnvironment);

  if (testEnvironmentIndex !== -1) {
    testTypeIndex = application.testEnvironments[testEnvironmentIndex].testTypes
      .map((testType) => {
        return testType.name;
      })
      .indexOf(testRun.testType);
  }

  if (
    testEnvironmentIndex !== -1 &&
    testTypeIndex !== -1 &&
    application.testEnvironments[testEnvironmentIndex].testTypes[testTypeIndex]
      .runAdapt
  ) {
    runAdapt =
      application.testEnvironments[testEnvironmentIndex].testTypes[
        testTypeIndex
      ].runAdapt;
  } else {
    runAdapt = false;
  }

  const adaptStatus = runAdapt === true ? 'RE_EVALUATE' : 'NOT_CONFIGURED';

  TestRuns.update(
    {
      _id: testRun._id,
    },
    {
      $set: {
        'status.evaluatingChecks': 'RE_EVALUATE',
        'status.evaluatingComparisons': 'RE_EVALUATE',
        'status.evaluatingAdapt': adaptStatus,
        'status.lastUpdate': new Date(),
        valid: true,
        reasonsNotValid: [],
      },
    },
  );

  callback(null, testRun);
};

const insertBenchmarkFn = (benchmark, insertBenchmarkCallback) => {
  Benchmarks.insert(benchmark, (err, result) => {
    if (err) {
      insertBenchmarkCallback(err, null);
    } else {
      insertBenchmarkCallback(null, result);
    }
  });
};
const updateBenchmarkFn = (benchmark, benchmarkId, callback) => {
  const modifier = {};
  if (benchmark.$set) modifier.$set = benchmark.$set;
  if (benchmark.$unset) modifier.$unset = benchmark.$unset;

  Benchmarks.update(
    {
      _id: benchmarkId,
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

const updateBenchmarkMatchPatternFn = (benchmark, testRun, callback) => {
  Benchmarks.update(
    {
      _id: benchmark._id,
    },
    {
      $set: {
        'panel.matchPattern': benchmark.panel.matchPattern,
        updateTestRuns: false,
      },
    },
  );

  // updated benchmarks for test run
  updateChecksForTestRunFn(testRun, (err, testRun) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, testRun);
    }
  });
};
