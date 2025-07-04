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

import './keyMetricsPanelSearchBox.html';
import { Benchmarks } from '../../../collections/benchmarks';
import { GrafanaDashboards } from '../../../collections/grafanaDashboards';

Template.keyMetricsPanelSearchBox.onRendered(function () {
  // Enable select2
  $('.select2-dropdown#key-metrics-modal-panel')
    .select2({
      placeholder: 'Select panel',
      allowClear: true,
    })
    .on('change', function () {
      Session.set(
        'keyMetricPanelId',
        $('.select2-dropdown#key-metrics-modal-panel').val().split('-')[0],
      );
      Session.set(
        'keyMetricPanelType',
        $('.select2-dropdown#key-metrics-modal-panel').val().split('-')[1],
      );
      Session.set(
        'keyMetricPanelTitle',
        $('.select2-dropdown#key-metrics-modal-panel').select2('data')[0].text,
      );
    });
});

Template.keyMetricsPanelSearchBox.onCreated(function () {
  const grafanaDashboardsQuery = {
    $and: [{ usedBySUT: Session.get('application') }],
  };

  const benchmarksQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
    ],
  };

  Meteor.subscribe('grafanaDashboards', grafanaDashboardsQuery);
  Meteor.subscribe('benchmarks', benchmarksQuery);
});

Template.keyMetricsPanelSearchBox.helpers({
  panels() {
    const benchmarks = Benchmarks.find({
      $and: [
        { application: this.application },
        { testEnvironment: this.testEnvironment },
        { testType: this.testType },
        { dashboardUid: this.dashboardUid },
      ],
    }).fetch();

    if (benchmarks) {
      const existingKeyMetrics = benchmarks.map((benchmark) => {
        return benchmark.panel.id;
      });

      const grafanDashboard = GrafanaDashboards.findOne({
        $and: [{ grafana: this.grafana }, { uid: this.dashboardUid }],
      });

      if (grafanDashboard)
        return grafanDashboard.panels.filter((panel) => {
          return existingKeyMetrics.indexOf(panel.id) === -1;
        });
    }
  },
});
