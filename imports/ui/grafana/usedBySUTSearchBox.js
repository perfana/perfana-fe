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
import { Applications } from '../../collections/applications';
import './usedBySUTSearchBox.html';

Template.usedBySUTSearchBox.onRendered(function () {
  // Enable select2
  $('.select2-dropdown#application')
    .select2({
      placeholder: 'System under test',
      allowClear: false,
      multiple: false,
    })
    .on('change', function () {
      Session.set('usedBySUT', $('.select2-dropdown#application').val());
    });

  Meteor.setTimeout(() => {
    $('#application option:eq(0)').prop('selected', true).trigger('change');
  }, 100);
});

Template.usedBySUTSearchBox.onCreated(function () {
  Meteor.subscribe('applications');
  // Session.set('usedBySUTSelected', false);
});

Template.usedBySUTSearchBox.helpers({
  applications() {
    return Applications.find({}, { sort: { name: 1 } }).fetch();
  },

  usedBySUTSelected: function () {
    return Session.get('usedBySUTSelected') === true;
  },
});
