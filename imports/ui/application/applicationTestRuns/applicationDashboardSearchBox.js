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
import { ApplicationDashboards } from '../../../collections/applicationDashboards';

import './applicationDashboardSearchBox.html';
import { getDataRetention, getTestRunById } from '../../../helpers/utils';

Template.snapshotsApplicationDashboardSearchBox.onRendered(function () {
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

Template.snapshotsApplicationDashboardSearchBox.onCreated(
  function snapshotsApplicationDashboardSearchBoxOnCreated() {
    this.applicationDashboards = new ReactiveVar([]);

    if (Session.get('application') && Session.get('testEnvironment')) {
      const query = {
        $and: [
          { application: Session.get('application') },
          { testEnvironment: Session.get('testEnvironment') },
        ],
      };

      Meteor.subscribe('applicationDashboards', query);

      const applicationDashboards = ApplicationDashboards.find(query, {
        sort: { dashboardLabel: 1 },
      }).fetch();

      //TODO: filter out dashboards that no data because of retention settings

      if (applicationDashboards) {
        if (this.data.checkRetention) {
          const testRun = getTestRunById(this.data.selectedTestRunIds[0]);
          if (testRun) {
            const filteredDashboards = applicationDashboards.filter(
              (dashboard) => {
                const retention = getDataRetention(dashboard);
                return (
                  new Date().getTime() - new Date(testRun.end).getTime() <
                  retention * 1000
                );
              },
            );
            this.applicationDashboards.set(filteredDashboards);
          }
        } else {
          return this.applicationDashboards.set(applicationDashboards);
        }
      }
    }
  },
);

Template.snapshotsApplicationDashboardSearchBox.helpers({
  applicationDashboards() {
    return (
      Template.instance().applicationDashboards &&
      Template.instance().applicationDashboards.get()
    );
  },
  applicationDashboardButtonActive: function () {
    return Session.get('applicationDashboardSelected') === false;
  },
});

Template.snapshotsApplicationDashboardSearchBox.events({
  'click #select-dashboards'(event, template) {
    event.preventDefault();

    Meteor.call(
      'updateSnapshots',
      template.data.selectedTestRunIds,
      Session.get('dashboards'),
      (error) => {
        if (error) {
          window.toastr.clear();
          window.toastr['error'](
            error.reason,
            `Error while updating snapshots, error: ${error.reason}`,
          );
        } else {
          window.toastr.clear();
          window.toastr['success'](
            'Done!',
            'Initated snapshot creation, please wait for the process to complete',
          );
        }
      },
    );
    // noinspection JSCheckFunctionSignatures
    Modal.hide('snapshotsApplicationDashboardSearchBox');
    $('input#select-testrun[type="checkbox"]').prop('checked', false);
  },
});
