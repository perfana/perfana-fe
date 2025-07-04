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

"use strict";

AutoForm.addInputType("universe-select", {
  template: "afUniverseSelect",
  valueIsArray: true,
  valueOut() {
    return this.val();
  },
  contextAdjust(context) {
    // build items list

    context.items = _.map(context.selectOptions, function (opt) {
      return {
        label: opt.label,
        value: opt.value,
        selected: _.contains(context.value, opt.value),
      };
    });

    //autosave option
    if (AutoForm && typeof AutoForm.getCurrentDataForForm === "function") {
      context.atts.autosave =
        AutoForm.getCurrentDataForForm().autosave || false;
      context.atts.placeholder =
        AutoForm.getCurrentDataForForm().placeholder ||
        context.atts.uniPlaceholder ||
        null;
      context.atts.uniDisabled =
        !!AutoForm.getCurrentDataForForm().disabled ||
        context.atts.uniDisabled ||
        false;
    }

    context.atts.removeButton =
      context.atts.removeButton || context.atts.remove_button; // support for previous version

    context.atts.dataSchemaKey = context.atts["data-schema-key"];

    return context;
  },
});
