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

import './conclusionFilter.html';

Template.conclusionFilter.onCreated(function () {
  // this.filter = new ReactiveTable.Filter('conclusionFilter', ['conclusion.label']);
  this.conclusions = new ReactiveVar([]);

  this.autorun(() => {
    this.conclusions.set(Template.currentData().conclusions);
  });
});

Template.conclusionFilter.onRendered(function conclusionFilterOnRendered() {
  const parentInstance = this.view.parentView.parentView.templateInstance();

  // Enable select2
  $('.select2-dropdown#conclusion-filter')
    .select2({
      placeholder: 'Conclusion',
      allowClear: true,
      // multiple: true,
      tags: true,
    })
    .on('change', function () {
      if (!$('.select2-dropdown#conclusion-filter').val()) {
        // self.filter.set(null);
        parentInstance.conclusionFilterValue.set(undefined);
      } else {
        // self.filter.set($(".select2-dropdown#conclusion-filter").val());
        parentInstance.conclusionFilterValue.set(
          $('.select2-dropdown#conclusion-filter').val(),
        );
      }
    })
    .trigger('change');

  // .on('select2:select', function (e) {
  //     let newValue = e.params.data.id;
  //     if (!newValue) {
  //         self.filter.set(null);
  //         parentInstance.conclusionFilterValue.set(undefined);
  //     } else {
  //         self.filter.set(newValue);
  //         parentInstance.conclusionFilterValue.set(newValue);
  //     }
  // });

  $('.select2-dropdown#conclusion-filter').on(
    'select2:unselecting',
    function (evt) {
      if (!evt.params.args.originalEvent) return;
      evt.params.args.originalEvent.stopPropagation();
    },
  );

  // this.autorun(() => {
  //     Meteor.setTimeout(() => {
  //         if (this.conclusions.get()) {
  //             $('.select2-dropdown#conclusion-filter').val(this.conclusions).trigger('change');
  //         }
  //     });
  // });
});

Template.conclusionFilter.helpers({
  conclusions() {
    const conclusionLabels = [
      { value: 'regression', label: 'regression' },
      { value: 'partial regression', label: 'partial regression' },
      { value: 'improvement', label: 'improvement' },
      { value: 'partial improvement', label: 'partial improvement' },
      { value: 'increase', label: 'increase' },
      { value: 'partial increase', label: 'partial increase' },
      { value: 'decrease', label: 'decrease' },
      { value: 'partial decrease', label: 'partial decrease' },
      { value: 'no difference', label: 'no difference' },
      { value: 'incomparable', label: 'incomparable' },
    ];

    const relevantConclusions = Template.instance().conclusions.get();

    if (relevantConclusions) {
      const relevantConclusionsOptions = relevantConclusions.map(
        (conclusion) => {
          return {
            value: conclusion,
            label: conclusionLabels.find((item) => item.value === conclusion)
              .label,
          };
        },
      );

      if (relevantConclusionsOptions.length > 1) {
        relevantConclusionsOptions.unshift({ value: '', label: '' });
      }

      return relevantConclusionsOptions;
    } else {
      return [];
    }
  },
});
