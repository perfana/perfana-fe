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

import './ignoredFilter.html';

Template.ignoredFilter.onCreated(function ignoredFilterOnCreated() {
  this.ignored = new ReactiveVar(false);

  this.autorun(() => {
    this.ignored.set(Template.currentData().ignored);
  });
});

Template.ignoredFilter.onRendered(function ignoredFilterOnRendered() {
  const parentInstance = this.view.parentView.parentView.templateInstance();

  // Enable select2
  $('.select2-dropdown#ignored-filter')
    .select2({
      placeholder: 'Ignored',
      allowClear: true,
      // multiple: true,
      tags: true,
    })
    .on('change', function () {
      if (!$('.select2-dropdown#ignored-filter').val()) {
        // self.filter.set(undefined);
        parentInstance.ignoredFilterValue.set(null);
      } else {
        // self.filter.set($(".select2-dropdown#classification-filter").val());
        parentInstance.ignoredFilterValue.set(
          $('.select2-dropdown#ignored-filter').val(),
        );
      }
    })
    .trigger('change');

  $('.select2-dropdown#ignored-filter').on(
    'select2:unselecting',
    function (evt) {
      if (!evt.params.args.originalEvent) return;
      evt.params.args.originalEvent.stopPropagation();
    },
  );
});
