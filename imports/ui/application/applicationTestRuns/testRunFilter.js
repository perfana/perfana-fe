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
import { ReactiveVar } from 'meteor/reactive-var';

import './testRunFilter.html';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';

Template.testRunFilter.onCreated(function testRunFilterOnCreated() {
  this.team = new ReactiveVar();

  this.autorun(() => {
    this.team.set(Session.get('team'));
  });
});

Template.testRunFilter.helpers({
  teamsInLicense() {
    return true;
  },
  applicationSelected: function () {
    return Session.get('application') !== undefined;
  },
  teamSelected: function () {
    return (
      Template.instance().team &&
      (Template.instance().team.get() !== undefined ||
        Template.instance().team.get() === '')
    );
  },
  selectedTeam: function () {
    return Session.get('team');
  },
  systemUnderTest() {
    if (Session.get('application') !== null) return Session.get('application');
  },
  team() {
    if (Session.get('team') !== null) return Session.get('team');
  },
});

Template.testRunFilter.events({
  'click #switch-system-mode'() {
    Session.set('team', undefined);
  },
  'click #switch-team-mode'() {
    Session.set('team', '');
  },
  'click #change-team'() {
    FlowRouter.go('landingPage', null, null);
  },
  'click #clear-all-filters'() {
    Session.set('reset-table', true);
    if (Session.get('team') !== undefined) Session.set('team', '');
    Session.set('application', undefined);
    Session.set('testEnvironment', undefined);
    Session.set('testType', undefined);
    Session.set('tags', undefined);
    const queryParams = {};
    queryParams['team'] = null;
    queryParams['systemUnderTest'] = null;
    queryParams['testEnvironment'] = null;
    queryParams['workload'] = null;
    queryParams['tags'] = null;

    FlowRouter.withReplaceState(function () {
      FlowRouter.setQueryParams(queryParams);
    });

    $('.select2-dropdown#team').val('').trigger('change');
    $('.select2-dropdown#application').val('').trigger('change');
    $('.select2-dropdown#test-environment').val('').trigger('change');
    $('.select2-dropdown#test-type').val('').trigger('change');
    $('.select2-dropdown#test-run-tags').val('').trigger('change');
  },
});
