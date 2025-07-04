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

import { Template } from 'meteor/templating';

import './testRunReportPanelRequirements.html';
import { ReactiveVar } from 'meteor/reactive-var';
import { slugify } from '../../../helpers/utils';

Template.testRunReportPanelRequirements.onCreated(function () {
  this.dashboardHeaderCollapsed = new ReactiveVar(true);
});

Template.testRunReportPanelRequirements.helpers({
  slug() {
    return slugify(
      `requirements-accordion-${this.testRun.testRunId}-${this.testRunPanel.title}-${this.testRunPanel.id}`,
    );
  },
  panelTitle() {
    return this.testRunPanel.title;
  },
  panelId() {
    return this.testRunPanel.id;
  },
  fields() {
    return [
      { key: 'target', label: 'Series' },
      { key: 'value', label: 'Value' },
      {
        key: 'meetsRequirement',
        label: 'Result',
        fn: (value, object) => {
          return new Spacebars.SafeString(requirementResult(object));
        },
        sortOrder: 0,
        sortDirection: 'descending',
      },
    ];
  },
  settings() {
    return {
      rowsPerPage: 20,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
    };
  },
  dashboardHeaderCollapsed() {
    return Template.instance().dashboardHeaderCollapsed.get();
  },
});

Template.testRunReportPanelRequirements.events({
  'shown.bs.collapse .dashboard-collapse'() {
    Template.instance().dashboardHeaderCollapsed.set(false);
  },
  'hide.bs.collapse .dashboard-collapse'() {
    Template.instance().dashboardHeaderCollapsed.set(true);
  },
});

const requirementResult = (object) => {
  const result = object.meetsRequirement;

  let HTML;

  if (result === true) {
    HTML =
      '<i class="fa fa-check" style="color: green;" aria-hidden="true"></i>';
  } else {
    HTML =
      '<i class="fa fa-exclamation-circle" style="color: red;" aria-hidden="true"></i>';
  }
  return HTML;
};
