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

import './filterSeriesSearchBox.html';
import { CheckResults } from '../../../collections/checkResults';

Template.filterSeriesSearchBox.onRendered(function () {
  // Enable select2
  $('.select2-dropdown#filter-series')
    .select2({
      placeholder: 'Select series',
      allowClear: false,
      multiple: true,
    })
    .on('change', function () {
      Session.set('selectedSeries', $('.select2-dropdown#filter-series').val());
    });

  Meteor.setTimeout(() => {
    if (this.data.benchmark.panel.matchPattern) {
      const regEx = new RegExp(this.data.benchmark.panel.matchPattern);

      const targets = this.data.targets.filter((target) => {
        return regEx.test(target);
      });

      $('.select2-dropdown#filter-series').val(targets);
      $('.select2-dropdown#filter-series').trigger('change');
    } else {
      $('.select2-dropdown#filter-series > option')
        .prop('selected', true)
        .trigger('change');
    }
  }, 100);
});

Template.filterSeriesSearchBox.onCreated(function () {
  const query = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
    ],
  };

  Meteor.subscribe('checkResults', query, 'filterSeriesSearchBox');
});

Template.filterSeriesSearchBox.helpers({
  series() {
    const checkResult = CheckResults.findOne({
      $and: [
        { application: this.benchmark.application },
        { testEnvironment: this.benchmark.testEnvironment },
        { testType: this.benchmark.testType },
        { dashboardLabel: this.benchmark.dashboardLabel },
        { dashboardUid: this.benchmark.dashboardUid },
        { panelId: this.benchmark.panel.id },
      ],
    });

    if (checkResult) {
      return checkResult.targets;
    }
  },
  seriesSelected: function () {
    return (
      Session.get('selectedSeries') && Session.get('selectedSeries').length > 0
    );
  },
});

Template.filterSeriesSearchBox.events({});
