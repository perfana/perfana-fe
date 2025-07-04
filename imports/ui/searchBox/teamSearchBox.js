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
import { Teams } from '../../collections/teams';
import { $ } from 'meteor/jquery';
import { Applications } from '../../collections/applications';

import './teamSearchBox.html';

Template.teamSearchBox.onRendered(function () {
  // Enable select2
  $('.select2-dropdown#team')
    .select2({
      placeholder: 'Team',
      allowClear: true,
    })
    .on('change', function () {
      const queryParams = {};

      if (!$('.select2-dropdown#team').val()) {
        Meteor.setTimeout(() => {
          Session.set('team', '');
          queryParams['team'] = '';

          if (Session.get('application'))
            queryParams['systemUnderTest'] = Session.get('application');
          if (Session.get('testEnvironment'))
            queryParams['testEnvironment'] = Session.get('testEnvironment');
          if (Session.get('testType'))
            queryParams['workload'] = Session.get('testType');
          if (Session.get('tags')) {
            let queryParamTags = '';
            Session.get('tags').forEach((tag, tagIndex) => {
              if (tagIndex === 0) {
                queryParamTags += tag;
              } else {
                queryParamTags += `,${tag}`;
              }
            });

            queryParams['tags'] = queryParamTags;
          }

          if (Session.get('team') !== FlowRouter.current().queryParams.team) {
            Session.set('current-page', 0);
            Session.set('rows-per-page', 10);
            Session.set('reset-table', true);
          }

          FlowRouter.withReplaceState(function () {
            FlowRouter.setQueryParams(queryParams);
          });
        }, 100);
      } else {
        Session.set('team', $('.select2-dropdown#team').val());

        Meteor.setTimeout(() => {
          Session.set('application', $('.select2-dropdown#application').val());

          if (Session.get('team')) queryParams['team'] = Session.get('team');
          if (Session.get('application'))
            queryParams['systemUnderTest'] = Session.get('application');
          if (Session.get('testEnvironment'))
            queryParams['testEnvironment'] = Session.get('testEnvironment');
          if (Session.get('testType'))
            queryParams['workload'] = Session.get('testType');
          if (Session.get('tags')) {
            let queryParamTags = '';
            Session.get('tags').forEach((tag, tagIndex) => {
              if (tagIndex === 0) {
                queryParamTags += tag;
              } else {
                queryParamTags += `,${tag}`;
              }
            });

            queryParams['tags'] = queryParamTags;
          }

          if (Session.get('team') !== FlowRouter.current().queryParams.team) {
            Session.set('current-page', 0);
            Session.set('rows-per-page', 10);
            Session.set('reset-table', true);
          }

          FlowRouter.withReplaceState(function () {
            FlowRouter.setQueryParams(queryParams);
          });
        }, 100);
      }
    });

  Meteor.setTimeout(() => {
    if (Session.get('team')) {
      const data = {
        id: Session.get('team'),
        text: Session.get('team'),
      };
      const option = new Option(data.text, data.id, true, true);
      $('.select2-dropdown#team').append(option); //.trigger('change');
      // $('.select2-dropdown#team').select2('data', data);
      // manually trigger the `select2:select` event
      $('.select2-dropdown#team').trigger({
        type: 'select2:select',
        params: {
          data: data,
        },
      });
    }
  }, 100);
});

Template.teamSearchBox.onCreated(function () {
  this.select2Data = new ReactiveVar();
  this.results = new ReactiveVar([]);

  Meteor.subscribe('teams');
  Meteor.subscribe('applications');

  this.autorun(() => {
    FlowRouter.watchPathChange();

    const teams = Teams.find({}, { sort: { name } }).fetch();
    if (teams) {
      this.results.set(teams.map((t) => t.name));
    }

    // Meteor.setTimeout(() =>{
    //     if (!Session.get('teams') || Session.get('teams') === '') $(".select2-dropdown#team").val('').trigger('change');
    // })
  });
});

Template.teamSearchBox.helpers({
  results() {
    if (Template.instance().results && Template.instance().results.get()) {
      const teams = Template.instance().results.get();
      const select2Data = Template.instance().select2Data.get();

      if (select2Data && teams.length > 0) {
        return teams.filter((team) => {
          return team.name !== select2Data.text;
        });
      } else {
        return teams;
      }
    }
  },
  teamSelected: function () {
    return Session.get('team') !== undefined;
  },
});
