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

import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Meteor } from 'meteor/meteor';

import { $ } from 'meteor/jquery';

import './dynatraceSearchBox.html';

Template.dynatraceSearchBox.onRendered(function () {
  // Enable select2
  $('.select2-dropdown#dynatrace')
    .select2({
      placeholder: 'Dynatrace service entity id',
      multiple: true,
      allowClear: false,
    })
    .on('change', function () {
      if (!$('.select2-dropdown#dynatrace').val()) {
        // $("#test-type").find('option:not(:first)').remove().trigger('change');
        // $("#test-environment").find('option:not(:first)').remove().trigger('change');
      } else {
        const dynatraceServiceEntities = $('.select2-dropdown#dynatrace')
          .select2('data')
          .map((item) => {
            return { id: item.id, label: item.text };
          });
        Session.set('dynatraceServiceEntities', dynatraceServiceEntities);

        // Session.set('dynatraceServiceEntityId', $(".select2-dropdown#dynatrace").val() );
        // Session.set('dynatraceServiceEntityLabel', $(".select2-dropdown#dynatrace option:selected").text() );
      }
    });
});

Template.dynatraceSearchBox.onCreated(function () {
  this.results = new ReactiveVar([]);

  Meteor.call(
    'getDynatraceEntities',
    Session.get('application'),
    (err, dynatraceServices) => {
      if (dynatraceServices.error) {
        window.toastr.clear();
        window.toastr['error'](
          JSON.stringify(dynatraceServices.error),
          'Error',
        );
      } else {
        this.results.set(dynatraceServices.data);

        Meteor.setTimeout(() => {
          if (this.data.dynatraceEntities) {
            this.data.dynatraceEntities.forEach((data) => {
              const option = new Option(data.text, data.id, true, true);
              $('.select2-dropdown#dynatrace').append(option); //.trigger('change');

              // manually trigger the `select2:select` event
              $('.select2-dropdown#dynatrace').trigger({
                type: 'select2:select',
                params: {
                  data: data,
                },
              });
              this.select2Data.set(data);
            });
          }
        }, 100);
      }
    },
  );
});

Template.dynatraceSearchBox.helpers({
  results() {
    return Template.instance().results.get();
  },
});
