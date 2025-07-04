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

import { GenericReportPanels } from '../collections/genericReportPanels';
import _ from 'lodash';

if (Meteor.isServer) {
  Meteor.publish('genericReportPanels', () => GenericReportPanels.find());
}

// noinspection JSUnusedGlobalSymbols
Meteor.methods({
  insertGenericReportPanel: (genericReportPanel) => {
    check(genericReportPanel, Object);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'insert.generic-report-panel.unauthorized',
        'The user is not authorized to create a generic report panel',
      );
    }

    const wrap = Meteor.makeAsync(insertGenericReportPanelFn);
    return wrap(genericReportPanel);
  },
  updateGenericReportPanel: (genericReportPanel, genericReportPanelId) => {
    check(genericReportPanel, Object);
    check(genericReportPanelId, String);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'insert.generic-report-panel.unauthorized',
        'The user is not authorized to create a a generic report panel',
      );
    }

    const wrap = Meteor.makeAsync(updateGenericReportPanelFn);
    return wrap(genericReportPanel, genericReportPanelId);
  },
  deleteGenericReportPanel: (genericReportPanel) => {
    check(genericReportPanel, Object);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'delete.generic-report-panel.unauthorized',
        'The user is not authorized to delete a generic report panel',
      );
    }

    GenericReportPanels.remove({ _id: genericReportPanel._id });

    /* update indexes */

    const updateReportPanels = GenericReportPanels.find(
      {
        index: { $gt: genericReportPanel.index },
      },
      { sort: { index: 1 } },
    ).fetch();

    _.each(updateReportPanels, (panel) => {
      GenericReportPanels.update(
        {
          index: panel.index,
        },
        {
          $set: {
            index: panel.index - 1,
          },
        },
      );
    });
  },
  updateGenericReportPanelsByIndex: (oldIndex, newIndex, profile) => {
    check(oldIndex, Number);
    check(newIndex, Number);
    check(profile, String);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'insert.generic-report-panel.unauthorized',
        'The user is not authorized to update a generic report panel',
      );
    }

    const wrap = Meteor.makeAsync(updateGenericReportPanelsByIndexFn);
    return wrap(oldIndex, newIndex, profile);
  },
});

const insertGenericReportPanelFn = (genericReportPanel, callback) => {
  genericReportPanel.reportPanelId =
    genericReportPanel.profile +
    '-' +
    genericReportPanel.dashboardUid +
    '-' +
    genericReportPanel.panel.id;

  const genericReportPanels = GenericReportPanels.find({
    profile: genericReportPanel.profile,
  }).fetch();

  genericReportPanel.index = genericReportPanels.length;

  GenericReportPanels.insert(genericReportPanel, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const updateGenericReportPanelFn = (
  genericReportPanel,
  genericReportPanelId,
  callback,
) => {
  GenericReportPanels.update(
    {
      _id: genericReportPanelId,
    },
    {
      $set: genericReportPanel.$set,
    },
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    },
  );
};
const updateGenericReportPanelsByIndexFn = (
  oldIndex,
  newIndex,
  profile,
  callback,
) => {
  GenericReportPanels.update(
    {
      $and: [{ profile: profile }, { index: oldIndex }],
    },
    {
      $set: {
        index: newIndex,
      },
    },
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    },
  );
};
