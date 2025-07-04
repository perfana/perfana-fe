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

import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { Benchmarks } from '../../../collections/benchmarks';

import './selectTrendsPanel.html';

Template.selectTrendsPanel.onRendered(function () {
  // Enable select2
  $('.select2-dropdown#trend-panel')
    .select2({
      placeholder: 'Select panel',
      allowClear: true,
    })
    .on('change', function () {
      Session.set('panelTitle', $('.select2-dropdown#trend-panel').val());
    });
});

Template.selectTrendsPanel.onCreated(function () {
  Meteor.subscribe('benchmarks');
});

Template.selectTrendsPanel.helpers({
  panels() {
    const benchmarks = Benchmarks.find({
      $and: [
        { application: FlowRouter.current().queryParams.systemUnderTest },
        { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
        { testType: FlowRouter.current().queryParams.workload },
        { dashboardLabel: Session.get('dashboardLabel') },
      ],
    }).fetch();

    if (benchmarks) return benchmarks.map((benchmark) => benchmark.panel.title);
  },
});

Template.selectTrendsPanel.events({});
