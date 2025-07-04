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

import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';

import './classificationFilter.html';

Template.classificationFilter.onCreated(function () {
  // this.filter = new ReactiveTable.Filter('classificationFilter', ['category']);
  this.classifications = new ReactiveVar([]);

  this.autorun(() => {
    this.classifications.set(Template.currentData().classifications);
  });
});

Template.classificationFilter.onRendered(
  function classificationFilterOnRendered() {
    const parentInstance = this.view.parentView.parentView.templateInstance();

    // Enable select2
    $('.select2-dropdown#classification-filter')
      .select2({
        placeholder: 'Select classification',
        allowClear: true,
        // multiple: true,
        tags: true,
      })
      .on('change', function () {
        if (!$('.select2-dropdown#classification-filter').val()) {
          // self.filter.set(undefined);
          parentInstance.classificationFilterValue.set(null);
          parentInstance.selectedMetricName.set(undefined);
        } else {
          // self.filter.set($(".select2-dropdown#classification-filter").val());
          parentInstance.classificationFilterValue.set(
            $('.select2-dropdown#classification-filter').val(),
          );
          parentInstance.selectedMetricName.set(undefined);
        }
      })
      .trigger('change');

    $('.select2-dropdown#classification-filter').on(
      'select2:unselecting',
      function (evt) {
        if (!evt.params.args.originalEvent) return;
        evt.params.args.originalEvent.stopPropagation();
      },
    );
  },
);

Template.classificationFilter.helpers({
  classifications() {
    const classificationLabels = [
      { value: '', label: '' },
      { value: 'UNKNOWN', label: 'Unclassified' },
      { value: 'RED_rate', label: 'RED rate' },
      { value: 'RED_errors', label: 'RED errors' },
      { value: 'RED_duration', label: 'RED duration' },
      { value: 'USE_usage', label: 'USE usage' },
      { value: 'USE_saturation', label: 'USE saturation' },
      { value: 'USE_errors', label: 'USE errors' },
    ];

    const relevantClassifications = Template.instance().classifications.get();

    if (relevantClassifications) {
      const relevantClassificationsOptions = relevantClassifications.map(
        (classification) => {
          return {
            value: classification,
            label: classificationLabels.find(
              (item) => item.value === classification,
            ).label,
          };
        },
      );

      if (relevantClassificationsOptions.length > 1) {
        relevantClassificationsOptions.unshift({ value: '', label: '' });
      }
      return relevantClassificationsOptions;
    }
  },
});
