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
import { log } from '/both/logger';
import { Applications } from '/imports/collections/applications';
import './testRunAlerts.html';
import { ReactiveVar } from 'meteor/reactive-var';

Template.alerts.onCreated(function testRunAlertsOnCreated() {
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
              if (err) {
                log.error(JSON.stringify(err));
              } else {
                if (result.error) {
                  log.error(JSON.stringify(result.error));
                } else {
                  this.userHasPermissionForApplication.set(result.data);
                }
              }
            },
          );
        }
      },
    },
  );
});

Template.alerts.helpers({
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
  hasUrl(alert) {
    return alert.panelUrl !== undefined || alert.url !== undefined;
  },
  hasConfigUrl(alert) {
    return alert.generatorUrl !== undefined || alert.url !== undefined;
  },
  url(alert) {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest ?
        FlowRouter.current().queryParams.systemUnderTest
      : FlowRouter.current().params.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    const start = new Date(testRun.start).getTime();
    const end = new Date(testRun.end).getTime();

    const theme = Meteor.settings.theme ? Meteor.settings.theme : 'light';

    if (alert.panelUrl) {
      return `${alert.panelUrl}&from=${start}&to=${end}&kiosk&theme=${theme}`;
    } else {
      return (
        alert.url
          .replace('tab=alert', '')
          .replace('&editPanel=', 'viewPanel=') +
        `&from=${start}&to=${end}&kiosk&theme=${theme}`
      );
    }
  },
  grafanaConfigUrl(alert) {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest ?
        FlowRouter.current().queryParams.systemUnderTest
      : FlowRouter.current().params.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    const start = new Date(testRun.start).getTime();
    const end = new Date(testRun.end).getTime();

    const theme = Meteor.settings.theme ? Meteor.settings.theme : 'light';

    if (alert.generatorUrl) {
      return `${alert.generatorUrl}?theme=${theme}`;
    } else {
      return (
        alert.url.replace('viewPanel=', 'editPanel=') +
        `&from=${start}&to=${end}&kiosk&theme=${theme}`
      );
    }
  },
});

Template.alerts.events({
  'click i#alert-modal'(event) {
    const url = $(event.target).attr('url');

    const alertModalParams = {
      alertUrl: url,
    };

    Modal.show('alertModal', alertModalParams);
  },
  'click i#show-alert-config'(event) {
    const url = $(event.target).attr('url');

    window.open(url, '_blank');
  },
  'click i#delete-alert'(event) {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    const alertIndex = parseInt(
      $(event.currentTarget).attr('data-alert-index'),
    );

    testRun.alerts.splice(alertIndex, 1);

    swal({
      title: 'Delete alert',
      text: 'Are you sure?',
      icon: 'warning',
      buttons: ['Cancel', 'OK'],
      dangerMode: true,
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
              window.toastr['success']('Done!', 'Deleted alert!');
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

Template.alertModal.helpers({
  url() {
    const user = Meteor.user();

    if (user)
      return this.alertUrl.replace(
        /theme=(dark|light)/,
        `theme=${user.profile.theme}`,
      );
  },
});
