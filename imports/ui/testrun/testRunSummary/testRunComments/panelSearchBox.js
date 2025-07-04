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

// noinspection JSJQueryEfficiency

import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { GrafanaDashboards } from '/imports/collections/grafanaDashboards';

import './panelSearchBox.html';

Template.panelSearchBox.onRendered(function () {
  // Enable select2
  $('.select2-dropdown#panel')
    .select2({
      placeholder: 'Select panel',
      allowClear: true,
    })
    .on('change', function () {
      Session.set('panelId', $('.select2-dropdown#panel').val());
      Session.set(
        'panelTitle',
        $('.select2-dropdown#panel').select2('data')[0].text,
      );
    });
});

Template.panelSearchBox.onCreated(function () {
  const grafanaDashboardsQuery = {
    $and: [{ usedBySUT: Session.get('application') }],
  };

  Meteor.subscribe('grafanaDashboards', grafanaDashboardsQuery);
});

Template.panelSearchBox.helpers({
  panels() {
    const grafanDashboard = GrafanaDashboards.findOne({
      $and: [
        { grafana: Session.get('grafana') },
        { uid: Session.get('dashboardUid') },
      ],
    });

    if (grafanDashboard)
      return grafanDashboard.panels.filter((panel) => {
        return panel.type !== 'row';
      });
  },
});

Template.panelSearchBox.events({});
