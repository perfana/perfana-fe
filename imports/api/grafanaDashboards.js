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
import { GrafanaDashboards } from '/imports/collections/grafanaDashboards';
import { ApplicationDashboards } from '/imports/collections/applicationDashboards';
import { Benchmarks } from '/imports/collections/benchmarks';
import { GrafanaDashboardsTemplatingValues } from '/imports/collections/grafanaDashboardTemplatingValues';
import { Grafanas } from '/imports/collections/grafanas';
import { grafanaCallDelete } from '../helpers/grafana/grafana-api-with-api-key';
import { getValuesFromDatasource } from '../helpers/getValuesFromDatasource';
import cache from 'js-cache';
import { log } from '/both/logger';
import _ from 'lodash';

if (Meteor.isServer) {
  Meteor.publish('grafanaDashboards', (query) => {
    check(query, Match.OneOf(undefined, null, Object));
    log.debug(
      '######### grafanaDashboards subscription query: ' +
        JSON.stringify(query),
    );

    if (
      query.$and &&
      (query.$and.length === 0 ||
        query.$and.some((obj) => Object.keys(obj).length === 0))
    ) {
      return [];
    } else if (
      query.$or &&
      (query.$or.length === 0 ||
        query.$or.some((obj) => Object.keys(obj).length === 0))
    ) {
      return [];
    } else {
      return GrafanaDashboards.find(query, {
        fields: { grafanaJson: 0 },
      });
    }
  });
}

// noinspection JSUnusedGlobalSymbols
Meteor.methods({
  deleteGrafanaDashboard: (id, usedBySUT) => {
    check(id, String);
    check(usedBySUT, Match.OneOf(undefined, null, String));

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'delete.grafana-dashboard.unauthorized',
        'The user is not authorized to delete Grafana dashboards',
      );
    }
    const wrap = Meteor.makeAsync(deleteGrafanaDashboardFn);

    return wrap(id, usedBySUT);
  },

  getGrafanaDashboardDashboardsUsedBySUT: (grafana) => {
    check(grafana, String);
    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'get.grafana-dashboard.unauthorized',
        'The user is not authorized to get Grafana dashboards',
      );
    }
    const wrap = Meteor.makeAsync(getGrafanaDashboardDashboardsUsedBySUTFn);

    return wrap(grafana);
  },

  getGrafanaDashboards: (grafanaParams) => {
    check(grafanaParams, Match.OneOf(undefined, null, Object));
    if (grafanaParams.params !== null) {
      check(grafanaParams.params, Object);

      const grafana = Grafanas.findOne({
        label: grafanaParams.params.grafanaLabel,
      });

      const searchText = grafanaParams.searchText
        ? grafanaParams.searchText
        : undefined;

      const grafanaDashboardsQuery = {
        $and: [
          { grafana: grafana.label },
          {
            $or: [
              {
                tags: {
                  $not: {
                    $elemMatch: { $regex: 'perfana-template', $options: 'i' },
                  },
                },
              },
              {
                $and: [
                  {
                    tags: {
                      $elemMatch: { $regex: 'perfana-template', $options: 'i' },
                    },
                  },
                  { usedBySUT: grafanaParams.params.systemUnderTest },
                ],
              },
            ],
          },
        ],
      };

      if (searchText !== undefined) {
        grafanaDashboardsQuery.$and.push({
          name: { $regex: searchText, $options: 'i' },
        });
      }

      const grafanaDashboards = GrafanaDashboards.find(grafanaDashboardsQuery, {
        limit: 100,
      });

      return grafanaDashboards.map((v) => ({
        label: v.name,
        value: v.name,
      }));
    } else {
      return [];
    }
  },
  getGrafanaDashboard: (grafanaLabel, dashboardName) => {
    check(grafanaLabel, Match.OneOf(undefined, null, String));
    check(dashboardName, Match.OneOf(undefined, null, String));
    if (grafanaLabel && dashboardName) {
      const grafana = Grafanas.findOne({ label: grafanaLabel });

      return GrafanaDashboards.findOne({
        $and: [{ grafana: grafana.label }, { name: dashboardName }],
      });
    } else {
      return undefined;
    }
  },

  getDashboardVariables: (grafanaParams) => {
    check(grafanaParams, Match.OneOf(undefined, null, Object));
    if (grafanaParams.params !== null) {
      check(grafanaParams.params, Object);

      const grafana = Grafanas.findOne({
        label: grafanaParams.params.grafanaLabel,
      });

      const grafanaDashboard = GrafanaDashboards.findOne({
        $and: [
          { grafana: grafana.label },
          { name: grafanaParams.params.dashboardName },
        ],
      });

      /* filter out 'system_under_test' and 'test_environment' variables */

      const filteredVariables = grafanaDashboard.variables.filter(
        (variable) => {
          return (
            variable.name !== 'system_under_test' &&
            variable.name !== 'test_environment'
          );
        },
      );

      return filteredVariables.map((v) => ({
        label: v.name,
        value: v.name,
      }));
    } else {
      return [];
    }
  },
  getDashboardVariablesForAutoConfig: (grafanaParams) => {
    check(grafanaParams, Match.OneOf(undefined, null, Object));
    if (grafanaParams.params !== null) {
      check(grafanaParams.params, Object);

      const grafana = Grafanas.findOne({
        label: grafanaParams.params.grafanaLabel,
      });

      if (!grafana) {
        const grafanaDashboard = GrafanaDashboards.findOne({
          $and: [
            { grafana: grafana.label },
            { name: grafanaParams.params.dashboardName },
          ],
        });

        if (grafanaDashboard) {
          return grafanaDashboard.variables.map((v) => ({
            label: v.name,
            value: v.name,
          }));
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
  getDashboardVariableValues: (grafanaParams) => {
    check(grafanaParams, Match.OneOf(undefined, null, Object));

    if (grafanaParams.params !== null) {
      check(grafanaParams.params, Object);

      const grafanaTemplatingValues = GrafanaDashboardsTemplatingValues.find({
        $and: [
          { grafana: grafanaParams.params.grafanaLabel },
          // {dashboardName: grafanaParams.params.dashboardName },
          { dashboardUid: grafanaParams.params.dashboardUid },
          { variableName: grafanaParams.params.variableName },
        ],
      }).fetch();

      if (grafanaTemplatingValues) {
        return grafanaTemplatingValues.map((v) => ({
          label: v.variableValue,
          value: v.variableValue,
        }));
      } else {
        return [];
      }
    } else {
      return [];
    }
  },

  getDashboardVariableValuesRealtime: (grafanaParams) => {
    check(grafanaParams, Match.OneOf(undefined, null, Object));
    if (
      grafanaParams.params === null &&
      grafanaParams.values &&
      grafanaParams.values.length > 0 &&
      grafanaParams.values[0] !== ''
    ) {
      return _.uniq(grafanaParams.values).map((v) => ({
        label: v,
        value: v,
      }));
    } else {
      if (grafanaParams.params !== null && grafanaParams.params !== undefined) {
        // check cache

        const cacheKey = JSON.stringify(grafanaParams);

        const cachedValue = cache.get(cacheKey);

        if (cachedValue !== undefined) {
          return cachedValue;
        } else {
          const grafanaInstance = Grafanas.findOne({
            label: grafanaParams.params.grafanaLabel,
          });

          const grafanaDashboard = GrafanaDashboards.findOne({
            $and: [
              { grafana: grafanaParams.params.grafanaLabel },
              { uid: grafanaParams.params.dashboardUid },
            ],
          });

          const templatingVariable =
            grafanaDashboard.templatingVariables.filter((variable) => {
              return variable.name === grafanaParams.params.variableName;
            })[0];

          let includeAll = false;

          // noinspection JSUnresolvedReference
          if (
            JSON.parse(
              grafanaDashboard.grafanaJson,
            ).dashboard.templating.list.filter((variable) => {
              return variable.name === grafanaParams.params.variableName;
            }).length > 0 &&
            JSON.parse(
              grafanaDashboard.grafanaJson,
            ).dashboard.templating.list.filter((variable) => {
              return variable.name === grafanaParams.params.variableName;
            })[0].includeAll === true
          ) {
            includeAll = true;
          }

          const wrap = Meteor.wrapAsync(getValuesFromDatasource);

          const result = wrap(
            grafanaInstance,
            grafanaDashboard,
            grafanaParams.params.application,
            grafanaParams.params.testEnvironment,
            templatingVariable,
            grafanaParams.params.variables,
            includeAll,
          );

          if (result !== undefined) {
            cache.set(cacheKey, result, 10000);
          }
          return result;
        }
      } else {
        return [];
      }
    }
  },
});

const getGrafanaDashboardDashboardsUsedBySUTFn = (grafana, callback) => {
  try {
    const grafanaDashboards = GrafanaDashboards.find(
      {
        $and: [{ grafana: grafana }, { usedBySUT: { $exists: true } }],
      },
      {
        fields: { grafanaJson: 0 },
      },
    ).fetch();
    callback(null, grafanaDashboards.length > 0);
  } catch (err) {
    callback(err, null);
  }
};

const deleteGrafanaDashboardFn = (id, usedBySUT, callback) => {
  const grafanaDashboard = GrafanaDashboards.findOne({ _id: id });

  const grafanaInstance = Grafanas.findOne({ label: grafanaDashboard.grafana });

  try {
    const isPerfanaTemplate =
      grafanaDashboard.tags.find(
        (key) => key.toLowerCase() === 'perfana-template',
      ) !== undefined;

    if (
      !isPerfanaTemplate ||
      (isPerfanaTemplate && grafanaDashboard.usedBySUT.length === 0)
    ) {
      GrafanaDashboards.remove({ _id: id });
      // eslint-disable-next-line no-unused-vars
      const dashboards = Meteor.makeAsync(grafanaCallDelete)(
        grafanaInstance,
        '/api/dashboards/uid/' + grafanaDashboard.uid,
      );
    } else {
      const usedBySUTIndex = grafanaDashboard.usedBySUT.indexOf(usedBySUT);
      if (usedBySUTIndex !== -1) {
        GrafanaDashboards.update(
          {
            _id: id,
          },
          {
            $set: {
              usedBySUT: grafanaDashboard.usedBySUT.filter(
                (item, index) => index !== usedBySUTIndex,
              ),
            },
          },
        );
      }

      if (usedBySUT) {
        ApplicationDashboards.remove({
          $and: [
            { application: usedBySUT },
            { grafana: grafanaInstance.name },
            { dashboardUid: grafanaDashboard.uid },
          ],
        });

        Benchmarks.remove({
          $and: [
            { application: usedBySUT },
            { grafana: grafanaInstance.name },
            { dashboardUid: grafanaDashboard.uid },
          ],
        });
      }
    }

    callback(null, true);
  } catch (error) {
    log.error(error);

    callback(error, null);
  }
};
