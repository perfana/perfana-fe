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
import { Teams } from '../../collections/teams';
import { $ } from 'meteor/jquery';

import './teamsSearchBox.html';

Template.teamsSearchBox.onRendered(function () {
  // Enable select2
  $('.select2-dropdown#teams')
    .select2({
      placeholder: 'Add team',
      allowClear: true,
      multiple: true,
    })
    .on('change', function () {
      Session.set('selectedTeams', $('.select2-dropdown#teams').val());
    });

  Meteor.setTimeout(() => {
    if (this.data.teams && this.data.teams.length > 0) {
      // $('.select2-dropdown#filter-series').val(this.data.benchmark.panel.series);
      $('.select2-dropdown#teams').val(this.data.teams);
      $('.select2-dropdown#teams').trigger('change');
    }
  }, 100);
});

Template.teamsSearchBox.onCreated(function () {
  Meteor.subscribe('teams');
});

Template.teamsSearchBox.helpers({
  teams() {
    return Teams.find();
  },
  teamsSelected: function () {
    return (
      Session.get('selectedTeams') && Session.get('selectedTeams').length > 0
    );
  },
});

Template.teamsSearchBox.events({});
