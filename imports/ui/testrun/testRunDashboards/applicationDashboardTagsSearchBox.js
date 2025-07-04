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
import { $ } from 'meteor/jquery';
import { ApplicationDashboards } from '../../../collections/applicationDashboards';

import './applicationDashboardTagsSearchBox.html';

Template.applicationDashboardTagsSearchBox.onRendered(function () {
  // Enable select2
  $('.select2-dropdown#application-dashboard-tags')
    .select2({
      placeholder: 'Select tags',
      allowClear: true,
      multiple: true,
    })
    .on('change', function () {
      if (!$('.select2-dropdown#application-dashboard-tags').val()) {
        Session.set('dashboardTags', undefined);
      } else {
        Session.set(
          'dashboardTags',
          $('.select2-dropdown#application-dashboard-tags').val(),
        );
      }
    });

  $('.select2-dropdown#application-dashboard-tags').on(
    'select2:unselecting',
    function (evt) {
      if (!evt.params.args.originalEvent) return;
      evt.params.args.originalEvent.stopPropagation();
    },
  );

  // Meteor.setTimeout(()=> {
  //
  //     $('.select2-dropdown#application-dashboard-tags > option').prop('selected',true).trigger('change');
  // })
});

Template.applicationDashboardTagsSearchBox.onCreated(function () {
  const query = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
    ],
  };

  Meteor.subscribe('applicationDashboards', query);
  Session.set('dashboardTags', undefined);
});

Template.applicationDashboardTagsSearchBox.helpers({
  applicationDashboardsTags() {
    const applicationDashboards = ApplicationDashboards.find({
      $and: [
        { application: Session.get('application') },
        { testEnvironment: Session.get('testEnvironment') },
      ],
    }).fetch();

    if (applicationDashboards) {
      const tags = [];

      applicationDashboards.forEach((applicationDashboard) => {
        applicationDashboard.tags.forEach((tag) => {
          if (tags.indexOf(tag) === -1) tags.push(tag);
        });
      });

      return tags.filter((tag) => {
        const perfanaRegExp = new RegExp('.*perfana.*', 'ig');
        return !perfanaRegExp.test(tag);
      });
    }
  },
});

Template.applicationDashboardTagsSearchBox.events({
  'click #select-dashboards'() {
    //TODO check if snapshots exist!

    Session.set('applicationDashboardSelected', true);
    $('.select2-dropdown#application-dashboard-tags').prop('disabled', true);
  },
});
