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

import './selectDynatraceEntity.html';

Template.selectDynatraceEntity.onRendered(function () {
  // Enable select2
  $('.select2-dropdown#select-dynatrace-entity')
    .select2({
      placeholder: 'Select Dynatrace entity',
      allowClear: false,
      multiple: false,
    })
    .on('change', function () {
      Session.set(
        'selectedDynatraceEntity',
        $('.select2-dropdown#select-dynatrace-entity').val(),
      );
    });

  $('.select2-dropdown#select-dynatrace-entity').on(
    'select2:unselecting',
    function (evt) {
      if (!evt.params.args.originalEvent) return;
      evt.params.args.originalEvent.stopPropagation();
    },
  );

  Meteor.setTimeout(() => {
    $('.select2-dropdown#select-dynatrace-entity option:eq(0)')
      .prop('selected', true)
      .trigger('change');
  }, 100);
});

Template.selectDynatraceEntity.onCreated(function () {
  Session.set('requestsSelected', false);
});

Template.selectDynatraceEntity.helpers({
  // dynatraceEntities () {
  //
  //     return this.dynatraceEntities;
  //
  // },
  //
});

Template.selectDynatraceEntity.events({
  'click #select-dynatrace-entity'() {
    //TODO check if snapshots exist!

    Session.set('requestsSelected', true);
    $('.select2-dropdown#select-dynatrace-entity').prop('disabled', true);
  },
});
