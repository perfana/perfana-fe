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

import './reportsFilter.html';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';

Template.reportsFilter.helpers({
  systemUnderTest() {
    if (Session.get('application') !== null) return Session.get('application');
  },
  team() {
    if (Session.get('team') !== null) return Session.get('team');
  },
});

Template.reportsFilter.events({
  'click #switch-system-mode'() {
    Session.set('team', undefined);
  },
  'click #switch-team-mode'() {
    Session.set('team', '');
  },

  'click #clear-all-filters'() {
    Session.set('application', undefined);
    Session.set('testEnvironment', undefined);
    Session.set('testType', undefined);
    Session.set('tags', undefined);
    const queryParams = {};
    queryParams['systemUnderTest'] = null;
    queryParams['testEnvironment'] = null;
    queryParams['workload'] = null;
    queryParams['tags'] = null;

    FlowRouter.withReplaceState(function () {
      FlowRouter.setQueryParams(queryParams);
    });

    $('.select2-dropdown#application').val('').trigger('change');
    $('.select2-dropdown#test-environment').val('').trigger('change');
    $('.select2-dropdown#test-type').val('').trigger('change');
    $('.select2-dropdown#test-run-tags').val('').trigger('change');
  },
});
