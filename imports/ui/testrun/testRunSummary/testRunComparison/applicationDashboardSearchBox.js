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
import { $ } from 'meteor/jquery';
import { ApplicationDashboards } from '/imports/collections/applicationDashboards';

import './applicationDashboardSearchBox.html';

Template.applicationDashboardSearchBox.onRendered(function () {
  // Enable select2
  $('.select2-dropdown#application-dashboard')
    .select2({
      placeholder: 'Select dashboards',
      allowClear: true,
      multiple: true,
    })
    .on('change', function () {
      Session.set(
        'dashboards',
        $('.select2-dropdown#application-dashboard').val(),
      );
    });

  $('.select2-dropdown#application-dashboard').on(
    'select2:unselecting',
    function (evt) {
      if (!evt.params.args.originalEvent) return;
      evt.params.args.originalEvent.stopPropagation();
    },
  );

  Meteor.setTimeout(() => {
    $('.select2-dropdown#application-dashboard > option')
      .prop('selected', true)
      .trigger('change');
  }, 200);
});

Template.applicationDashboardSearchBox.onCreated(function () {
  const query = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
    ],
  };

  Meteor.subscribe('applicationDashboards', query);

  Session.set('applicationDashboardSelected', false);

  // this.addTeamMembers = new ReactiveVar;

  // this.autorun(() => {
  //     Meteor.call('getNewTeamMembers', Session.get('teamName'), (err, newTeamMembers) => {
  //
  //         if (err) {
  //
  //             log.error(err);
  //
  //         } else {
  //
  //             this.addTeamMembers.set(newTeamMembers);
  //         }
  //
  //     })
  // })
});

Template.applicationDashboardSearchBox.helpers({
  applicationDashboards() {
    const applicationDashboards = ApplicationDashboards.find(
      {
        $and: [
          { application: Session.get('application') },
          { testEnvironment: Session.get('testEnvironment') },
        ],
      },
      { sort: { dashboardLabel: 1 } },
    );

    if (applicationDashboards) return applicationDashboards;
  },
  applicationDashboardButtonActive: function () {
    return Session.get('applicationDashboardSelected') === false;
  },

  applicationDashboardsSelected() {
    return Session.get('dashboards').length > 0;
  },

  selectedApplicationDashboards() {
    if (Session.get('dashboards').length > 0) return Session.get('dashboards');
  },
});

Template.applicationDashboardSearchBox.events({
  'click #select-dashboards'() {
    //TODO check if snapshots exist!

    Session.set('applicationDashboardSelected', true);
    $('.select2-dropdown#application-dashboard').prop('disabled', true);
  },
});
