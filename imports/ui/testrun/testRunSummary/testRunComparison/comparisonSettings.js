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

import './comparisonSettings.html';

Template.comparisonSettings.onRendered(function () {});

Template.comparisonSettings.onCreated(function () {
  // this.autorun(() => {

  Session.set('settingsConfirmed', false);
  Session.set('excludeRampUpTime', false);
  Session.set('averageAll', false);
  Session.set('evaluateResults', false);
  Session.set('evaluateType', 'avg');
  Session.set('matchPattern', undefined);
  Session.set('benchmarkOperator', 'pst');
  Session.set('benchmarkValue', undefined);
  // });
});

Template.comparisonSettings.helpers({
  confirmSettingsButtonActive() {
    return Session.equals('settingsConfirmed', false);
  },
  excludeRampUpTime() {
    return Session.get('excludeRampUpTime');
  },
  averageAll() {
    return Session.get('averageAll');
  },
  matchPattern() {
    return Session.get('matchPattern');
  },
  benchmarkOperator() {
    return Session.get('benchmarkOperator');
  },
  benchmarkValue() {
    return Session.get('benchmarkValue');
  },

  evaluateResults() {
    return Session.equals('evaluateResults', true);
  },
});

Template.comparisonSettings.events({
  'click #confirm-settings'() {
    if (Session.get('evaluateResults') === true) {
      if (Session.get('benchmarkValue') === undefined) {
        toastr.clear();
        toastr['error']('Comparison threshold required!', 'Error');

        return;
      }
    }

    Session.set('settingsConfirmed', true);

    $('#excludeRampUpTime').prop('disabled', true);
    $('#averageAll').prop('disabled', true);
    $('#evaluateResults').prop('disabled', true);
    $('#evaluateType').prop('disabled', true);
    $('#matchPattern').prop('disabled', true);
    $('#benchmarkOperator').prop('disabled', true);
    $('#benchmarkValue').prop('disabled', true);
  },

  'change #excludeRampUpTime'() {
    if (Session.equals('excludeRampUpTime', false)) {
      Session.set('excludeRampUpTime', true);
    } else {
      Session.set('excludeRampUpTime', false);
    }
  },
  'change #averageAll'() {
    if (Session.equals('averageAll', false)) {
      Session.set('averageAll', true);
    } else {
      Session.set('averageAll', false);
    }
  },
  'change #evaluateResults'() {
    if (Session.equals('evaluateResults', false)) {
      Session.set('evaluateResults', true);
    } else {
      Session.set('evaluateResults', false);
    }
  },
  'change #evaluateType'(event) {
    Session.set('evaluateType', event.target.value);
  },
  'change #matchPattern'(event) {
    Session.set('matchPattern', event.target.value);
  },
  'change #benchmarkOperator'(event) {
    Session.set('benchmarkOperator', event.target.value);
  },
  'change #benchmarkValue'(event) {
    Session.set('benchmarkValue', event.target.value);
  },
});
