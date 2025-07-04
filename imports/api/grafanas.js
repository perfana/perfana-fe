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

import { Grafanas } from '/imports/collections/grafanas';
import { ApplicationDashboards } from '/imports/collections/applicationDashboards';
import { GrafanaDashboards } from '/imports/collections/grafanaDashboards';

import { replaceDynamicVariableValues } from '../helpers/utils';
import _ from 'lodash';

if (Meteor.isServer) {
  Meteor.publish('grafanas', () =>
    Grafanas.find(
      {},
      {
        fields: {
          label: 1,
          clientUrl: 1,
          serverUrl: 1,
          snapshotInstance: 1,
          trendsInstance: 1,
          orgId: 1,
        },
      },
    ),
  );
}

Meteor.methods({
  setGrafanaInstances: (grafana) => {
    check(grafana, Object);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'update.grafana.unauthorized',
        'The user is not authorized to update  Grafana configuration',
      );
    }

    /* if snapshotInstance is set to true, make sure snapshotInstance for the other instances is set to false */
    if (grafana.snapshotInstance === true) {
      const grafanasToUpdate = Grafanas.find({
        label: { $ne: grafana.label },
      }).fetch();

      _.each(grafanasToUpdate, (grafanaToUpdate) => {
        Grafanas.update(
          {
            _id: grafanaToUpdate._id,
          },
          {
            $set: {
              snapshotInstance: false,
            },
          },
        );
      });
    }

    /* if trendsInstance is set, make sure trendsInstance for the other instances is set to false */
    if (grafana.trendsInstance === true) {
      const grafanasToUpdate = Grafanas.find({
        label: { $ne: grafana.label },
      }).fetch();

      _.each(grafanasToUpdate, (grafanaToUpdate) => {
        Grafanas.update(
          {
            _id: grafanaToUpdate._id,
          },
          {
            $set: {
              trendsInstance: false,
            },
          },
        );
      });
    }
  },
  renderGrafanaUrl: (tableRow, testRun, runningTest, kioskMode) => {
    check(tableRow, Object);
    check(testRun, Object);
    check(runningTest, Boolean);
    check(kioskMode, Boolean);

    const wrap = Meteor.makeAsync(renderGrafanaUrlFn);
    return wrap(tableRow, testRun, runningTest, kioskMode);
  },
});

const renderGrafanaUrlFn = (
  tableRow,
  testRun,
  runningTest,
  kioskMode,
  callback,
) => {
  try {
    let applicationDashboard = ApplicationDashboards.findOne({
      $and: [
        // {_id: tableRow._id},
        { application: testRun.application },
        { testEnvironment: testRun.testEnvironment },
        { grafana: tableRow.grafana },
        { dashboardUid: tableRow.dashboardUid },
        { dashboardLabel: tableRow.dashboardLabel },
      ],
    });
    const grafana = Grafanas.findOne({ label: applicationDashboard.grafana });
    const grafanaDashboard = GrafanaDashboards.findOne({
      $and: [
        { grafana: applicationDashboard.grafana },
        { uid: applicationDashboard.dashboardUid },
      ],
    });

    const start = isNaN(testRun.start)
      ? testRun.start
      : new Date(testRun.start).getTime();
    let end;

    if (runningTest) {
      end = 'now';
    } else {
      end = isNaN(testRun.end) ? testRun.end : new Date(testRun.end).getTime();
    }

    let result;

    if (testRun && applicationDashboard) {
      let variables = `&var-system_under_test=${testRun.application}&var-test_environment=${testRun.testEnvironment}`;
      if (applicationDashboard.variables) {
        if (testRun.variables && testRun.variables.length > 0)
          applicationDashboard = replaceDynamicVariableValues(
            applicationDashboard,
            testRun,
          );

        for (const v in applicationDashboard.variables) {
          for (const l in applicationDashboard.variables[v].values) {
            if (applicationDashboard.variables[v])
              variables +=
                '&var-' +
                applicationDashboard.variables[v].name +
                '=' +
                applicationDashboard.variables[v].values[l];
          }
        }
      }

      const theme = Meteor.user().profile.theme
        ? Meteor.user().profile.theme
        : 'light';
      let queryParams = `theme=${theme}`;
      if (runningTest) queryParams += '&refresh=10s';
      const kiosk = kioskMode ? '&kiosk' : '';

      result = `${grafana.clientUrl}/d/${grafanaDashboard.uid}/${grafanaDashboard.slug}?orgId=${grafana.orgId}&from=${start}&to=${end}${variables}&${queryParams}${kiosk}`;
    }

    callback(null, result);
  } catch (err) {
    callback(err, null);
  }
};
