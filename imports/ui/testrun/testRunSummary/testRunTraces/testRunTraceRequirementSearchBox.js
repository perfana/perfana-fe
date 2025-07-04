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

import './testRunTraceRequirementSearchBox.html';

Template.testRunTraceRequirementSearchBox.onRendered(function () {
  // Enable select2
  $('.select2-dropdown#trace-requirement')
    .select2({
      placeholder: 'Select Service Level Objective',
      allowClear: true,
      multiple: false,
    })
    .on('change', function () {
      if (
        $('.select2-dropdown#trace-requirement').val().indexOf('lt') !== -1 ||
        $('.select2-dropdown#trace-requirement').val().indexOf('st') !== -1
      ) {
        const value = $('.select2-dropdown#trace-requirement')
          .val()
          .replace('st-', '')
          .replace('lt-', '');

        Session.set('minDuration', `${value}`);
        Session.set('maxDuration', undefined);
      } else {
        const value = $('.select2-dropdown#trace-requirement')
          .val()
          .replace('gt-', '');

        Session.set('maxDuration', `${value}`);
        Session.set('minDuration', undefined);
      }
    });

  // Meteor.setTimeout(()=> {
  //
  //     $('#trace-requirement option:eq(0)').prop('selected',true).trigger('change');
  // })
});

Template.testRunTraceRequirementSearchBox.onCreated(function () {});

Template.testRunTraceRequirementSearchBox.helpers({});

Template.testRunTraceRequirementSearchBox.events({});
