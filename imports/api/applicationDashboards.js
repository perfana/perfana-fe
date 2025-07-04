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
import { ApplicationDashboards } from '/imports/collections/applicationDashboards';
import { ReportPanels } from '../collections/reportPanels';
import { Benchmarks } from '../collections/benchmarks';
import { CheckResults } from '../collections/checkResults';
import { CompareResults } from '../collections/compareResults';
import { userHasPermission } from '../helpers/checkPermission';
import { GrafanaDashboards } from '../collections/grafanaDashboards';
import { log } from '/both/logger';

if (Meteor.isServer) {
  Meteor.publish('applicationDashboards', (query) => {
    check(query, Object);
    log.debug(
      '######### applicationDashboards subscription query: ' +
        JSON.stringify(query),
    );
    if (
      query.$and.length === 0 ||
      query.$and.some((obj) => Object.keys(obj).length === 0)
    ) {
      return [];
    } else {
      return ApplicationDashboards.find(query, { sort: { dashboardLabel: 1 } });
    }
  });
}

Meteor.methods({
  insertApplicationDashboard: (applicationDashboard) => {
    check(applicationDashboard, Object);

    if (!userHasPermission(Meteor.userId(), applicationDashboard.application)) {
      throw new Meteor.Error(
        'insert.application-dashboard.unauthorized',
        'The user is not authorized to add a dashboard for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(insertApplicationDashboardFn);
    return wrap(applicationDashboard);
  },
  updateApplicationDashboard: (
    applicationDashboard,
    applicationDashboardId,
  ) => {
    check(applicationDashboard, Object);
    check(applicationDashboardId, String);

    if (
      !userHasPermission(Meteor.userId(), applicationDashboard.$set.application)
    ) {
      throw new Meteor.Error(
        'update.application-dashboard.unauthorized',
        'The user is not authorized to update a dashboard for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(updateApplicationDashboardFn);
    return wrap(applicationDashboard, applicationDashboardId);
  },
  deleteApplicationDashboard: (applicationDashboardId) => {
    check(applicationDashboardId, String);

    const applicationDashboard = ApplicationDashboards.findOne({
      _id: applicationDashboardId,
    });

    if (!userHasPermission(Meteor.userId(), applicationDashboard.application)) {
      throw new Meteor.Error(
        'insert.application-dashboard.unauthorized',
        'The user is not authorized to delete a dashboard for this system under test',
      );
    }
    Benchmarks.remove({
      $and: [
        { application: applicationDashboard.application },
        { testEnvironment: applicationDashboard.testEnvironment },
        { dashboardUid: applicationDashboard.dashboardUid },
        { dashboardLabel: applicationDashboard.dashboardLabel },
      ],
    });

    ReportPanels.remove({
      $and: [
        { application: applicationDashboard.application },
        { testEnvironment: applicationDashboard.testEnvironment },
        { dashboardUid: applicationDashboard.dashboardUid },
        { dashboardLabel: applicationDashboard.dashboardLabel },
      ],
    });

    CheckResults.remove({
      $and: [
        { application: applicationDashboard.application },
        { testEnvironment: applicationDashboard.testEnvironment },
        { dashboardUid: applicationDashboard.dashboardUid },
        { dashboardLabel: applicationDashboard.dashboardLabel },
      ],
    });

    CompareResults.remove({
      $and: [
        { application: applicationDashboard.application },
        { testEnvironment: applicationDashboard.testEnvironment },
        { dashboardUid: applicationDashboard.dashboardUid },
        { dashboardLabel: applicationDashboard.dashboardLabel },
      ],
    });

    ApplicationDashboards.remove({ _id: applicationDashboardId });
  },
  // cloneApplicationDashboards: (application, testEnvironment, cloneEnvironment)  => {
  //
  //     if (!userHasPermission(Meteor.userId(), application)) {
  //         throw new Meteor.Error('insert.application-dashboard.unauthorized',
  //             'The user is not authorized to add a dashboard for this system under test');
  //     }
  //     const cloneApplicationDashboardsResponse = Meteor.makeAsync(cloneApplicationDashboardsFn);
  //     return cloneApplicationDashboardsResponse(application, testEnvironment, cloneEnvironment);
  //
  // },
});

// const cloneApplicationDashboardsFn = (
//   application,
//   testEnvironment,
//   cloneEnvironment,
//   callback,
// ) => {
//   try {
//     let applicationDashboardsToClone = ApplicationDashboards.find({
//       $and: [
//         { application: application },
//         { testEnvironment: cloneEnvironment },
//       ],
//     }).fetch();
//
//     if (applicationDashboardsToClone) {
//       _.each(applicationDashboardsToClone, (dashboard) => {
//         let clonedDashboard = dashboard;
//         delete clonedDashboard._id;
//         clonedDashboard.testEnvironment = testEnvironment;
//         ApplicationDashboards.insert(clonedDashboard);
//       });
//
//       callback(null, { addedDashboards: applicationDashboardsToClone.length });
//     }
//   } catch (err) {
//     callback(err, null);
//   }
// };

const insertApplicationDashboardFn = (applicationDashboard, callback) => {
  /* get dashboardId and dashboardUid */

  const grafanaDashboard = GrafanaDashboards.findOne({
    $and: [
      { grafana: applicationDashboard.grafana },
      { name: applicationDashboard.dashboardName },
    ],
  });

  if (grafanaDashboard) {
    applicationDashboard.dashboardId = grafanaDashboard.id;
    applicationDashboard.dashboardUid = grafanaDashboard.uid;

    GrafanaDashboards.update(
      {
        _id: grafanaDashboard._id,
      },
      {
        $addToSet: {
          usedBySUT: applicationDashboard.application,
        },
      },
    );
  }

  ApplicationDashboards.insert(applicationDashboard, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const updateApplicationDashboardFn = (
  applicationDashboard,
  applicationDashboardId,
  callback,
) => {
  /* get dashboardId and dashboardUid */

  const modifier = {};
  if (applicationDashboard.$set) modifier.$set = applicationDashboard.$set;
  if (applicationDashboard.$unset)
    modifier.$unset = applicationDashboard.$unset;

  if (applicationDashboard.$set) {
    const grafanaDashboard = GrafanaDashboards.findOne({
      $and: [
        { grafana: applicationDashboard.$set.grafana },
        { name: applicationDashboard.$set.dashboardName },
      ],
    });

    if (grafanaDashboard) {
      modifier.$set.dashboardId = grafanaDashboard.id;
      modifier.$set.dashboardUid = grafanaDashboard.uid;
      GrafanaDashboards.update(
        {
          _id: grafanaDashboard._id,
        },
        {
          $addToSet: {
            usedBySUT: applicationDashboard.$set.application,
          },
        },
      );
    }
  }

  ApplicationDashboards.update(
    {
      _id: applicationDashboardId,
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
