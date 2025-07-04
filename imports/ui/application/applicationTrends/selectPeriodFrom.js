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
import { Meteor } from 'meteor/meteor';
import { $ } from 'meteor/jquery';

import './selectPeriodFrom.html';

Template.selectPeriodFrom.onCreated(function () {});

Template.selectPeriodFrom.onRendered(function selectPeriodFromOnRendered() {
  const parentInstance = this.view.parentView.templateInstance();

  // Enable select2
  $('.select2-dropdown#period')
    .select2({
      placeholder: 'Select period',
      allowClear: false,
    })
    .on('change', function () {
      parentInstance.period.set($('.select2-dropdown#period').val());
      parentInstance.selectedMetricName.set(undefined);
    });

  Meteor.setTimeout(() => {
    $('.select2-dropdown#period').val('2w').trigger('change');
  }, 100);
});

Template.selectPeriodFrom.helpers({
  periods() {
    return [
      { label: 'Last week', value: '1w' },
      { label: 'Last two weeks', value: '2w' },
      { label: 'Last three weeks', value: '3w' },
      { label: 'Last month', value: '1m' },
      { label: 'Last two months', value: '2m' },
      { label: 'Last three months', value: '3m' },
      { label: 'Last six months', value: '6m' },
      { label: 'Last year', value: '1y' },
      { label: 'All', value: 'all' },
    ];
  },
  periodSelected: function () {
    return Session.get('period') !== undefined;
  },
});
