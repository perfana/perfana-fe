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

import { TestRuns } from '/imports/collections/testruns';
import { ApplicationDashboards } from '/imports/collections/applicationDashboards';
import { Configuration } from '/imports/collections/configuration';
import { Grafanas } from '/imports/collections/grafanas';
import { OmitAlertTags } from '/imports/collections/omitAlertTags';
import { AbortAlertTags } from '/imports/collections/abortAlertTags';
import { grafanaCallPost } from '/imports/helpers/grafana/grafana-api-with-api-key';
import { replaceDynamicVariable } from '/imports/helpers/utils';
import { check } from 'meteor/check';
import { log } from '/both/logger';
import async from 'async';
import _ from 'lodash';

export const testRunAlertGrafana = function (req, res) {
  const alertSource = 'grafana';

  const alertTagsToOmit = OmitAlertTags.find({
    alertSource: alertSource,
  })
    .fetch()
    .map((alertConfig) => alertConfig.tag);

  try {
    // noinspection JSCheckFunctionSignatures
    log.info('Grafana alert: ' + JSON.stringify(req.body));

    // {"dashboardId":1,"evalMatches":[{"value":100,"metric":"High value","tags":null},{"value":200,"metric":"Higher Value","tags":null}],"message":"Someone is testing the alert notification within Grafana.","orgId":0,"panelId":1,"ruleId":1109727550265917800,"ruleName":"Test notification","ruleUrl":"http://localhost:3000/","state":"alerting","tags":{},"title":"[Alerting] Test notification"}

    if ('dashboardId' in req.body) {
      check(req.body, {
        dashboardId: Number,
        orgId: Number,
        panelId: Number,
        ruleId: Number,
        evalMatches: Match.Optional([Object]),
        tags: Match.Optional(Object),
        ruleName: Match.Optional(String),
        ruleUrl: Match.Optional(String),
        state: Match.Optional(String),
        message: Match.Optional(String),
        title: Match.Optional(String),
      });

      const alert = req.body;

      const systemUnderTest = alert.tags['system_under_test'];
      const testEnvironment = alert.tags['test_environment'];

      // console.log('systemUnderTest: ' + systemUnderTest)
      // console.log('testEnvironment: ' + testEnvironment)

      // check if the alert is for one the running tests

      const metric =
        alert.evalMatches[0] && alert.evalMatches[0].metric ?
          alert.evalMatches[0].metric
        : undefined;

      const runningTests = TestRuns.find({
        $and: [
          {
            end: {
              $gte: new Date(new Date() - 30 * 1000), // ms
            },
          },
          { completed: false },
        ],
      }).fetch();

      // get grafana dashboards for running tests

      _.each(runningTests, function (runningTest) {
        // console.log('test is running for: ' + runningTest.application)

        if (
          systemUnderTest === runningTest.application &&
          testEnvironment === runningTest.testEnvironment
        ) {
          processAlert(
            alertSource,
            alertTagsToOmit,
            alert.tags,
            alert.message,
            new Date(),
            runningTest,
            metric,
            alert.ruleUrl,
          );
        }
      });
    } else {
      check(req.body, {
        receiver: Match.Optional(String),
        status: Match.Optional(String),
        externalURL: Match.Optional(String),
        version: Match.Optional(String),
        groupKey: Match.Optional(String),
        state: Match.Optional(String),
        message: Match.Optional(String),
        title: Match.Optional(String),
        orgId: Number,
        truncatedAlerts: Number,
        alerts: Match.Optional([Object]),
        groupLabels: Match.Optional(Object),
        commonLabels: Match.Optional(Object),
        commonAnnotations: Match.Optional(Object),
      });

      const alerts = req.body.alerts;

      alerts.forEach((alert) => {
        if (
          alert.status === 'firing' &&
          alert.labels.alertname !== 'DatasourceNoData' &&
          alert.labels.alertname !== 'DatasourceError'
        ) {
          const systemUnderTest = alert.labels['system_under_test'];
          const testEnvironment = alert.labels['test_environment'];

          // console.log('systemUnderTest: ' + systemUnderTest)
          // console.log('testEnvironment: ' + testEnvironment)

          const metricRegex = new RegExp(`metric='(.[^']+)'`);
          const metricMatch =
            alert.valueString && metricRegex.exec(alert.valueString);

          const metric =
            alert.labels['name'] ? alert.labels['name']
            : metricMatch && metricMatch.length > 0 ? metricMatch[1]
            : undefined;

          const message =
            alert.annotations.message ? alert.annotations.message
            : alert.annotations.description ? alert.annotations.description
            : alert.labels['alertname'];

          const runningTests = TestRuns.find({
            $and: [
              {
                end: {
                  $gte: new Date(new Date() - 30 * 1000), // ms
                },
              },
              { completed: false },
            ],
          }).fetch();

          // get grafana dashboards for running tests

          _.each(runningTests, function (runningTest) {
            // console.log('test is running for: ' + runningTest.application)

            if (
              systemUnderTest === runningTest.application &&
              testEnvironment === runningTest.testEnvironment
            ) {
              processAlert(
                alertSource,
                alertTagsToOmit,
                alert.labels,
                message,
                new Date(),
                runningTest,
                metric,
                null,
                alert.generatorURL,
                alert.panelURL,
              );
            }
          });
        }
      });
    }

    res.end();
  } catch (e) {
    log.error('failed sending Grafana alert, error: ' + e.stack);

    res.status(400).send(e);
  }
};

export const testRunAlertKapacitor = function (req, res) {
  const alertSource = 'kapacitor';

  const alertTagsToOmit = OmitAlertTags.find({
    alertSource: alertSource,
  })
    .fetch()
    .map((alertConfig) => alertConfig.tag);

  // noinspection JSCheckFunctionSignatures
  log.info('alert! ' + JSON.stringify(req.body));

  const alert = req.body;

  // let systemUnderTest = alert.id.split('/')[0];
  const systemUnderTest = alert.data.series[0].tags['system_under_test'];
  const testEnvironment = alert.data.series[0].tags['test_environment'];
  const measurement = alert.id.split('/')[1];

  // console.log('systemUnderTest: ' + systemUnderTest)
  // console.log('testEnvironment: ' + testEnvironment)

  // check if the alert is for one the running tests

  const runningTests = TestRuns.find({
    $and: [
      {
        end: {
          $gte: new Date(new Date() - 30 * 1000), // ms
        },
      },
      { completed: false },
    ],
  }).fetch();

  _.each(runningTests, function (runningTest) {
    if (
      systemUnderTest === runningTest.application &&
      testEnvironment === runningTest.testEnvironment &&
      alert.level === 'CRITICAL' &&
      alert.previousLevel === 'OK'
    ) {
      processAlert(
        alertSource,
        alertTagsToOmit,
        alert.data.series[0].tags,
        alert.message,
        alert.data.series[0].values[0][0],
        runningTest,
        measurement,
      );
    }
  });

  res.end();
};

export const testRunAlertPrometheus = function (req, res) {
  //{"receiver":"default-receiver","status":"firing","alerts":[{"status":"firing","labels":{"alertname":"HighLoad","severity":"warning","system_under_test":"MegaTron","test_environment":"acc"},"annotations":{"description":"System load average > 3","summary":"System load average > 3"},"startsAt":"2021-08-19T11:52:22.012Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://49077ddbdc65:9090/graph?g0.expr=avg+by%28system_under_test%2C+test_environment%29+%28system_load_average_1m%29+%3E+1&g0.tab=1","fingerprint":"7b4a450cc2e62574"},{"status":"firing","labels":{"alertname":"HighLoad","severity":"warning","system_under_test":"OptimusPrime","test_environment":"acc"},"annotations":{"description":"System load average > 3","summary":"System load average > 3"},"startsAt":"2021-08-19T11:52:22.012Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://49077ddbdc65:9090/graph?g0.expr=avg+by%28system_under_test%2C+test_environment%29+%28system_load_average_1m%29+%3E+1&g0.tab=1","fingerprint":"b453fd4bfb081d13"},{"status":"firing","labels":{"alertname":"HighLoad","severity":"warning","system_under_test":"StarScream","test_environment":"acc"},"annotations":{"description":"System load average > 3","summary":"System load average > 3"},"startsAt":"2021-08-19T11:52:22.012Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://49077ddbdc65:9090/graph?g0.expr=avg+by%28system_under_test%2C+test_environment%29+%28system_load_average_1m%29+%3E+1&g0.tab=1","fingerprint":"ee0c653eceb40ad0"}],"groupLabels":{"alertname":"HighLoad"},"commonLabels":{"alertname":"HighLoad","severity":"warning","test_environment":"acc"},"commonAnnotations":{"description":"System load average > 3","summary":"System load average > 3"},"externalURL":"http://aac73be7520c:9093","version":"4","groupKey":"{}:{alertname=\"HighLoad\"}","truncatedAlerts":0}
  const alertSource = 'alertmanager';

  const alertTagsToOmit = OmitAlertTags.find({
    alertSource: alertSource,
  })
    .fetch()
    .map((alertConfig) => alertConfig.tag);

  // noinspection JSCheckFunctionSignatures
  log.info('alert from alert manager! ' + JSON.stringify(req.body));

  const alertManagerAlert = req.body;

  _.each(alertManagerAlert.alerts, (alert) => {
    if (alertManagerAlert.status === 'firing') {
      // match labels to test run variables, if configured
      const customTags = Configuration.find({ type: 'alert' }).fetch();

      const testRunQuery = {
        $and: [
          {
            end: {
              $gte: new Date(new Date() - 30 * 1000), // ms
            },
          },

          { completed: false },
        ],
      };
      if (customTags.length === 0) {
        const systemUnderTest =
          alert.labels.system_under_test ?
            alert.labels.system_under_test
          : undefined;
        const testEnvironment = alert.labels.namespace;

        if (testEnvironment) {
          testRunQuery.$and.push({
            testEnvironment: testEnvironment,
          });
        }

        if (systemUnderTest) {
          testRunQuery.$and.push({
            application: systemUnderTest,
          });
        }
      }

      // check if the alert is for one the running tests

      const runningTests = TestRuns.find(testRunQuery).fetch();

      // get grafana dashboards for running tests

      _.each(runningTests, function (runningTest) {
        if (new Date(alert.startsAt) > new Date(runningTest.start)) {
          // make sure alert was triggered during the test

          if (customTags.length === 0) {
            processAlert(
              alertSource,
              alertTagsToOmit,
              alert.labels,
              alert.annotations.description,
              alert.startsAt,
              runningTest,
            );
          } else {
            if (matchRunningTest(runningTest, alert, customTags) === true) {
              processAlert(
                alertSource,
                alertTagsToOmit,
                alert.labels,
                alert.annotations.description,
                alert.startsAt,
                runningTest,
              );
            }
          }
        }
      });
    }
  });

  res.end();
};

const matchRunningTest = (runningTest, alert, customTags) => {
  let runningTestMatched = true;

  if (customTags.length > 0) {
    customTags.forEach((customTag) => {
      const match = new RegExp(
        replaceDynamicVariable(customTag.value, runningTest),
      );

      if (!match.test(alert.labels[customTag.key])) {
        runningTestMatched = false;
      }
    });
  } else {
    runningTestMatched = false;
  }

  return runningTestMatched;
};

const alertQueue = async.queue(
  Meteor.bindEnvironment((dashboard, callback) => {
    const grafana = Grafanas.findOne({ label: dashboard.grafana });

    const annotationsBody = {
      dashboardId: dashboard.dashboardId,
      time: new Date(dashboard.alertTime).getTime(),
      isRegion: false,
      tags: _.uniq(dashboard.annotationTags),
      text: dashboard.alertText,
    };

    const annotationsResponse = Meteor.makeAsync(grafanaCallPost)(
      grafana,
      '/api/annotations',
      annotationsBody,
    );

    if (annotationsResponse.error) {
      log.error(
        `Failed sending annotations: ${annotationsResponse.error.reason}`,
      );
    }

    if (annotationsResponse.data) {
      const testRun = TestRuns.findOne({
        $and: [
          {
            testRunId: dashboard.testRunId,
          },
          {
            application: dashboard.application,
          },
        ],
      });

      if (testRun) {
        const alertIndex = testRun.alerts.findIndex(
          (alert) =>
            new Date(alert.timestamp).getTime() ===
              new Date(dashboard.alertTime).getTime() &&
            alert.message === dashboard.alertText,
        );

        if (alertIndex !== -1) {
          testRun.alerts[alertIndex].annotations.push({
            grafanaId: grafana._id,
            id: annotationsResponse.data.id,
          });

          TestRuns.update(
            {
              $and: [
                {
                  testRunId: dashboard.testRunId,
                },
                {
                  application: dashboard.application,
                },
              ],
            },
            {
              $set: testRun,
            },
          );
        }
      }
    }

    callback();
  }),
  1,
);

const processAlert = (
  alertSource,
  alertTagsToOmit,
  alertTags,
  alertText,
  alertTime,
  runningTest,
  measurement,
  alertUrl,
  generatorUrl,
  panelUrl,
) => {
  const tagsKeyValues = [{ key: 'source', value: alertSource }];

  if (measurement)
    tagsKeyValues.push({ key: 'measurement', value: measurement });

  Object.keys(alertTags).forEach((e) => {
    if (alertTagsToOmit.indexOf(e) === -1) {
      const key = e === 'namespace' ? 'test_environment' : e;
      if (alertTagsToOmit.indexOf(e) === -1) {
        tagsKeyValues.push({
          key: key,
          value: alertTags[e],
        });
      }
    }
  });

  // get all dashboards for the running test

  const dashboards = ApplicationDashboards.find(
    {
      $and: [
        { application: runningTest.application },
        { testEnvironment: runningTest.testEnvironment },
      ],
    },
    { fields: { grafana: 1, dashboardId: 1, dashboardUid: 1 } },
  ).fetch();

  const annotationTags = [];
  const annotations = [];

  tagsKeyValues.forEach((tag) => {
    annotationTags.push(`${tag.key}=${tag.value}`);
  });

  alertQueue.drain(() => {
    // noinspection JSCheckFunctionSignatures
    log.info('alert annotations have been sent to all dashboards');
  });

  alertQueue.error(function (err) {
    log.warn('Failed to send annotation: ' + err);
  });

  // check for tags configured to abort the test run
  const abortAlertTags = AbortAlertTags.find({
    $and: [
      { application: runningTest.application },
      { testType: runningTest.testType },
      { testEnvironment: runningTest.testEnvironment },
      { alertSource: alertSource },
    ],
  })
    .fetch()
    .map((alertConfig) => {
      return {
        key: alertConfig.tag.key,
        value: alertConfig.tag.value,
      };
    });

  let abortTestRun = false;
  const abortTagKeyValue = {};

  if (abortAlertTags.length > 0) {
    Object.keys(alertTags).forEach((alertKey) => {
      abortAlertTags.forEach((abortAlert) => {
        if (
          abortAlert.key === alertKey &&
          abortAlert.value === alertTags[alertKey]
        ) {
          abortTagKeyValue.key = alertKey;
          abortTagKeyValue.value = alertTags[alertKey];
          abortTestRun = true;
        }
      });
    });
  }

  const alertsModifier = {
    $push: {
      alerts: {
        timestamp: new Date(alertTime),
        message: alertText,
        tags: tagsKeyValues,
        url: alertUrl ? alertUrl : undefined,
        generatorUrl: generatorUrl ? generatorUrl : undefined,
        panelUrl: panelUrl ? panelUrl : undefined,
        annotations: annotations,
      },
    },
  };

  //  console.log('alertsModifier: ' + JSON.stringify(alertsModifier))

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
    alertsModifier,
  );

  const alertDashboards = dashboards.map((dashboard) => {
    return {
      ...dashboard,
      annotationTags: annotationTags,
      alertTime: alertTime,
      alertText: alertText,
      testRunId: runningTest.testRunId,
      application: runningTest.application,
    };
  });

  alertQueue.push(alertDashboards, (err) => {
    if (err) {
      log.error(`Failed adding items to alert queue: ${err}`);
    }
  });

  if (abortTestRun === true) {
    const abortModifier = {
      $set: {
        abort: true,
        abortMessage: `Test run aborted due to alert with tag: "${abortTagKeyValue.key}=${abortTagKeyValue.value}", with message "${alertText}"`,
      },
    };

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

      abortModifier,
    );
  }
};
