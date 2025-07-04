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
import { Meteor } from 'meteor/meteor';
import { $ } from 'meteor/jquery';
import {
  getTestRun,
  renderGrafanaSnapshotPanelUrl,
} from '/imports/helpers/utils';
import { Grafanas } from '/imports/collections/grafanas';
import { GrafanaDashboards } from '/imports/collections/grafanaDashboards';

import { Snapshots } from '/imports/collections/snapshots';

import './modalPanelSearchBox.html';

Template.modalPanelSearchBox.onRendered(function () {
  // Enable select2
  $('.select2-dropdown#modal-panel')
    .select2({
      placeholder: 'Select panel',
      allowClear: true,
    })
    .on('change', function () {
      Session.set('panelId', $('.select2-dropdown#modal-panel').val());
      Session.set(
        'panelTitle',
        $('.select2-dropdown#modal-panel').select2('data')[0].text,
      );

      if (
        Session.get('dashboardUid') !== undefined &&
        Session.get('dashboardLabel') !== undefined &&
        Session.get('panelId') !== undefined
      ) {
        const testRun = getTestRun(
          FlowRouter.current().queryParams.systemUnderTest,
          FlowRouter.current().params.testRunId,
        );

        if (testRun) {
          /* get snapshot */

          const snapshot = Snapshots.findOne({
            $and: [
              { application: testRun.application },
              { testEnvironment: testRun.testEnvironment },
              { testType: testRun.testType },
              { testRunId: testRun.testRunId },
              { dashboardUid: Session.get('dashboardUid') },
              { dashboardLabel: Session.get('dashboardLabel') },
            ],
          });

          if (snapshot) {
            const grafana = Grafanas.findOne({ label: snapshot.grafana });

            /* get element width */

            const queryParams = `&fullscreen`;

            const url = renderGrafanaSnapshotPanelUrl(
              snapshot.url /*.replace('/dashboard/', '/render/dashboard-solo/')*/,
              Session.get('panelId'),
              testRun,
              snapshot,
              grafana,
              queryParams,
            );

            Meteor.setTimeout(() => {
              self
                .$('iframe.grafana-iframe.comments-graph-preview')
                .attr('src', url);
            }, 100);
          }
        }
      }
    });
});

Template.modalPanelSearchBox.onCreated(function () {
  const grafanaDashboardsQuery = {
    $and: [{ usedBySUT: Session.get('application') }],
  };

  Meteor.subscribe('grafanaDashboards', grafanaDashboardsQuery);
});

Template.modalPanelSearchBox.helpers({
  panels() {
    const grafanDashboard = GrafanaDashboards.findOne({
      $and: [
        { grafana: Session.get('grafana') },
        { uid: Session.get('dashboardUid') },
      ],
    });

    if (grafanDashboard) return grafanDashboard.panels;
  },
});

Template.modalPanelSearchBox.events({});
