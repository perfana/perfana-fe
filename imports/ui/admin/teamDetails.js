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

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Teams } from '../../collections/teams';

import './teamDetails.html';

Template.teamDetails.onCreated(function teamsOnCreated() {
  this.teamSelected = new ReactiveVar(false);
  this.activeHref = new ReactiveVar('#users');

  Meteor.subscribe('teams');
});

Template.teamDetails.helpers({
  tabActive(href) {
    return Template.instance().activeHref.get() === href;
  },
  team() {
    return Teams.findOne({ name: this.teamName });
  },

  fields() {
    return [
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
    ];
  },
  settings() {
    return {
      rowsPerPage: 50,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
    };
  },
});

Template.teamDetails.events({
  'click .add-team': (event) => {
    Template.instance().addProfile.set(true);
  },
  'click .nav-tabs  a'(event, template) {
    event.preventDefault();
    // $(this).tab('show');
    template.activeHref.set(event.currentTarget.getAttribute('href'));
  },
});
