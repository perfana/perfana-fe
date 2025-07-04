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

import { GenericChecks } from '../collections/genericChecks';
import { Benchmarks } from '../collections/benchmarks';
import { GrafanaDashboards } from '../collections/grafanaDashboards';
import { supportedPanelTypes } from '/both/grafanaConfig';
import _ from 'lodash';

if (Meteor.isServer) {
  Meteor.publish('genericChecks', () => GenericChecks.find());
}

// noinspection JSUnusedGlobalSymbols
Meteor.methods({
  insertGenericCheck: (genericCheck) => {
    check(genericCheck, Object);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'insert.generic-key-metric.unauthorized',
        'The user is not authorized to create a generic service level indicator',
      );
    }

    const wrap = Meteor.makeAsync(insertGenericCheckFn);
    return wrap(genericCheck);
  },
  updateGenericCheck: (genericCheck, genericCheckId) => {
    check(genericCheck, Object);
    check(genericCheckId, String);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'insert.generic-key-metric.unauthorized',
        'The user is not authorized to create a a generic service level indicator',
      );
    }

    const wrap = Meteor.makeAsync(updateGenericCheckFn);
    return wrap(genericCheck, genericCheckId);
  },
  deleteGenericCheck: (id) => {
    check(id, String);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'delete.generic-key-metric.unauthorized',
        'The user is not authorized to delete a generic service level indicator',
      );
    }

    GenericChecks.remove({ _id: id });
  },

  getTemplateDashboardPanels: (params) => {
    check(params, Match.OneOf(undefined, null, Object));
    if (params.params !== null) {
      const grafanaDashboard = GrafanaDashboards.findOne({
        $and: [
          { grafana: params.params.grafanaLabel },
          { uid: params.params.dashboardUid },
        ],
      });

      if (grafanaDashboard) {
        /* for KPI filter out only panels of type graph */
        if (params.params.forKpi) {
          // let filteredPanels = grafanaDashboard.panels.filter( panel => { return panel.type === 'graph' || panel.type === 'timeseries'});
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
          return _.uniq(
            grafanaDashboard.panels.map((p) => ({
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
  },
});

const insertGenericCheckFn = (genericCheck, callback) => {
  genericCheck.checkId =
    genericCheck.profile +
    '-' +
    genericCheck.dashboardUid +
    '-' +
    genericCheck.panel.id;

  GenericChecks.insert(genericCheck, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const updateGenericCheckFn = (genericCheck, genericCheckId, callback) => {
  /* Update all benchmarks based on this genericCheck */

  const benchmarks = Benchmarks.find({
    genericCheckId: genericCheck.$set.checkId,
  }).fetch();

  if (benchmarks.length > 0) {
    benchmarks.forEach((benchmark) => {
      const modifier = {};
      if (genericCheck.$set) {
        modifier.$set = {
          'panel.averageAll': genericCheck.$set['panel.averageAll'],
          'panel.benchmark.operator':
            genericCheck.$set['panel.benchmark.operator'],
          'panel.benchmark.value': genericCheck.$set['panel.benchmark.value'],
          'panel.benchmark.absoluteFailureThreshold':
            genericCheck.$set['panel.benchmark.absoluteFailureThreshold'],
          'panel.requirement.operator':
            genericCheck.$set['panel.requirement.operator'],
          'panel.requirement.value':
            genericCheck.$set['panel.requirement.value'],
          'panel.evaluateType': genericCheck.$set['panel.evaluateType'],
          'panel.excludeRampUpTime':
            genericCheck.$set['panel.excludeRampUpTime'],
          'panel.id': genericCheck.$set['panel.id'],
          'panel.title': genericCheck.$set['panel.title'],
          'panel.matchPattern': benchmark.panel.matchPattern
            ? benchmark.panel.matchPattern
            : genericCheck.$set['panel.matchPattern'],
        };
      }

      if (genericCheck.$unset) {
        modifier.$unset = {};
        if (_.has(genericCheck.$unset, 'panel.benchmark')) {
          modifier.$unset['panel.benchmark'] =
            genericCheck.$unset['panel.benchmark'];
        }
        if (_.has(genericCheck.$unset, 'panel.requirement')) {
          modifier.$unset['panel.requirement'] =
            genericCheck.$unset['panel.requirement'];
        }
      }

      Benchmarks.update(
        {
          _id: benchmark._id,
        },
        modifier,
      );
    });
  }

  const genericCheckModifier = {};
  if (genericCheck.$set) genericCheckModifier.$set = genericCheck.$set;
  if (genericCheck.$unset) genericCheckModifier.$unset = genericCheck.$unset;

  /* set update test runs back to false */
  genericCheckModifier.$set.updateTestRuns = false;

  GenericChecks.update(
    {
      _id: genericCheckId,
    },
    genericCheckModifier,
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    },
  );
};
