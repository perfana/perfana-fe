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
import { getTestRun } from '/imports/helpers/utils';

import { Applications } from '/imports/collections/applications';
import './testRunEvents.html';
import { ReactiveVar } from 'meteor/reactive-var';
import { log } from '/both/logger';

Template.testRunEvents.onCreated(function testRunEventsOnCreated() {
  this.userHasPermissionForApplication = new ReactiveVar(false);

  Meteor.subscribe(
    'applications',
    {},
    {
      onReady: () => {
        const application = Applications.findOne({
          name: FlowRouter.current().queryParams.systemUnderTest,
        });

        if (application) {
          Meteor.call(
            'userHasPermissionForApplication',
            application.name,
            (err, result) => {
              if (result.error) {
                log.error(JSON.stringify(result.error));
              } else {
                this.userHasPermissionForApplication.set(result.data);
              }
            },
          );
        }
      },
    },
  );
});

Template.testRunEvents.helpers({
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
});

Template.testRunEvents.events({
  'click i#delete-event'(event) {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    const alertIndex = parseInt(
      $(event.currentTarget).attr('data-event-index'),
    );

    testRun.events.splice(alertIndex, 1);

    swal({
      title: 'Delete event',
      text: 'Are you sure?',
      icon: 'warning',
      buttons: ['Cancel', 'OK'],
      dangerMode: true,
      // dangerMode: true,
    }).then((willDelete) => {
      //bound to the current `this`
      if (willDelete) {
        Meteor.call(
          'deleteTestRunAlertOrEvent',
          testRun,
          this.annotations,
          (result) => {
            if (result.error) {
              window.toastr.clear();
              window.toastr['error'](JSON.stringify(result.error), 'Error');
            } else {
              window.toastr.clear();
              window.toastr['success']('Done!', 'Deleted event!');
            }
          },
        );
        swal.close();
      } else {
        swal.close();
      }
    });
  },
});
