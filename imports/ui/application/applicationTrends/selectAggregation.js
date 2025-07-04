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

import { Template } from 'meteor/templating';
import { Meteor } from 'meteor/meteor';
import { $ } from 'meteor/jquery';

import './selectAggregation.html';

Template.selectAggregation.onCreated(function () {});

Template.selectAggregation.onRendered(function selectAggregationOnRendered() {
  const parentInstance = this.view.parentView.templateInstance();

  // Enable select2
  $('.select2-dropdown#aggregation')
    .select2({
      placeholder: 'Select aggregation',
      allowClear: false,
    })
    .on('change', function () {
      parentInstance.aggregation.set($('.select2-dropdown#aggregation').val());
      parentInstance.selectedMetricName.set(undefined);
    });

  Meteor.setTimeout(() => {
    $('.select2-dropdown#aggregation').val('median').trigger('change');
  }, 100);
});

Template.selectAggregation.helpers({
  aggregations() {
    return [
      { label: 'Median', value: 'median' },
      { label: 'Mean', value: 'mean' },
      { label: 'Minimum', value: 'min' },
      { label: 'Maximum', value: 'max' },
    ];
  },
});
