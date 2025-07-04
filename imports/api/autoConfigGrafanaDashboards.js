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
import { AutoConfigGrafanaDashboards } from '/imports/collections/autoConfigGrafanaDashboards';
import { Grafanas } from '/imports/collections/grafanas';
import { GenericChecks } from '../collections/genericChecks';
import { GrafanaDashboards } from '../collections/grafanaDashboards';
import { GenericReportPanels } from '../collections/genericReportPanels';

if (Meteor.isServer) {
  Meteor.publish('autoConfigGrafanaDashboards', () =>
    AutoConfigGrafanaDashboards.find(),
  );
}

// noinspection JSUnusedGlobalSymbols
Meteor.methods({
  insertAutoConfigGrafanaDashboard: (autoConfigGrafanaDashboard) => {
    check(autoConfigGrafanaDashboard, Object);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'insert.auto-config-dashboard.unauthorized',
        'The user is not authorized to create a auto configuration dashboard',
      );
    }

    const wrap = Meteor.makeAsync(insertAutoConfigGrafanaDashboardFn);
    return wrap(autoConfigGrafanaDashboard);
  },
  updateAutoConfigGrafanaDashboard: (
    autoConfigGrafanaDashboard,
    autoConfigGrafanaDashboardId,
  ) => {
    check(autoConfigGrafanaDashboard, Object);
    check(autoConfigGrafanaDashboardId, String);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'insert.auto-config-dashboard.unauthorized',
        'The user is not authorized to create a auto configuration dashboard',
      );
    }

    const wrap = Meteor.makeAsync(updateAutoConfigGrafanaDashboardFn);
    return wrap(autoConfigGrafanaDashboard, autoConfigGrafanaDashboardId);
  },
  deleteAutoConfigGrafanaDashboard: (autoConfigGrafanaDashboard) => {
    check(autoConfigGrafanaDashboard, Object);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'delete.auto-config-dashboard.unauthorized',
        'The user is not authorized to delete a auto configuration dashboard',
      );
    }

    const wrap = Meteor.makeAsync(deleteAutoConfigGrafanaDashboardFn);
    return wrap(autoConfigGrafanaDashboard);
  },

  getAutoconfigGrafanaDashboards: (grafanaParams) => {
    check(grafanaParams, Match.OneOf(undefined, null, Object));

    if (grafanaParams.params !== null) {
      check(grafanaParams, Object);

      const autoconfigGrafanaDashboards = AutoConfigGrafanaDashboards.find({
        profile: grafanaParams.params.profile,
      });

      return autoconfigGrafanaDashboards.map((v) => ({
        label: v.dashboardName,
        value: v.dashboardName,
      }));
    } else {
      return [];
    }
  },

  getGrafanaDashboardTemplates: (grafanaParams) => {
    check(grafanaParams, Match.OneOf(undefined, null, Object));
    if (grafanaParams.params !== null) {
      check(grafanaParams, Object);

      const grafana = Grafanas.findOne({
        label: grafanaParams.params.grafanaLabel,
      });

      const grafanaDashboards = GrafanaDashboards.find({
        $and: [
          { grafana: grafana.label },
          {
            tags: { $elemMatch: { $regex: 'perfana-template', $options: 'i' } },
          },
        ],
      });

      return grafanaDashboards.map((v) => ({
        label: v.name,
        value: v.name,
      }));
    } else {
      return [];
    }
  },
});

const insertAutoConfigGrafanaDashboardFn = (
  autoConfigGrafanaDashboard,
  callback,
) => {
  /* remove matchRegex when removeTemplatingVariables === true */

  // if(autoConfigGrafanaDashboard.removeTemplatingVariables === true){
  //     if (autoConfigGrafanaDashboard.matchRegexForVariables) delete autoConfigGrafanaDashboard.matchRegexForVariables;
  // }

  AutoConfigGrafanaDashboards.insert(
    autoConfigGrafanaDashboard,
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    },
  );
};

const deleteAutoConfigGrafanaDashboardFn = (
  autoConfigGrafanaDashboard,
  callback,
) => {
  try {
    GenericChecks.remove({
      $and: [
        { profile: autoConfigGrafanaDashboard.profile },
        { dashboardUid: autoConfigGrafanaDashboard.dashboardUid },
      ],
    });

    GenericReportPanels.remove({
      $and: [
        { profile: autoConfigGrafanaDashboard.profile },
        { dashboardUid: autoConfigGrafanaDashboard.dashboardUid },
      ],
    });

    AutoConfigGrafanaDashboards.remove({ _id: autoConfigGrafanaDashboard._id });

    callback(null, true);
  } catch (err) {
    callback(err, null);
  }
};

const updateAutoConfigGrafanaDashboardFn = (
  autoConfigGrafanaDashboard,
  autoConfigGrafanaDashboardId,
  callback,
) => {
  const modifier = {};

  // if(autoConfigGrafanaDashboard.$set.removeTemplatingVariables === true){
  //     if (autoConfigGrafanaDashboard.$set.matchRegexForVariables) delete autoConfigGrafanaDashboard.$set.matchRegexForVariables;
  // }

  if (autoConfigGrafanaDashboard.$set)
    modifier.$set = autoConfigGrafanaDashboard.$set;
  if (autoConfigGrafanaDashboard.$unset)
    modifier.$unset = autoConfigGrafanaDashboard.$unset;

  AutoConfigGrafanaDashboards.update(
    {
      _id: autoConfigGrafanaDashboardId,
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
