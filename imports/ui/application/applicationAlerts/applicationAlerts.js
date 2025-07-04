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
import { ReactiveDict } from 'meteor/reactive-dict';
import { Alerts } from '../../../collections/alerts';

import { GrafanaDashboards } from '../../../collections/grafanaDashboards';
import { ReactiveVar } from 'meteor/reactive-var';

import './applicationAlerts.html';

Template.applicationAlerts.onCreated(function grafanaDashboardsOnCreated() {
  this.state = new ReactiveDict();

  const applicationDashboardQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
    ],
  };

  Meteor.subscribe('alerts');
  Meteor.subscribe('applicationDashboards', applicationDashboardQuery);
  Meteor.subscribe('applications');

  const grafanaDashboardsQuery = {
    $and: [{ usedBySUT: Session.get('application') }],
  };

  Meteor.subscribe('grafanaDashboards', grafanaDashboardsQuery);

  this.showIcons = new ReactiveVar(true);

  Template.instance().showIcons.set(Session.get('userIsAllowed'));

  this.autorun(() => {
    Template.instance().showIcons.set(Session.get('userIsAllowed'));
  });
});

Template.applicationAlerts.helpers({
  applicationAlerts() {
    const alerts = Alerts.find(
      {
        $and: [
          { application: this.application },
          { testEnvironment: this.testEnvironment },
        ],
      },
      { sort: { dashboardLabel: 1 } },
    );

    if (alerts) {
      return alerts;
    } else {
      return [];
    }
  },
  fields() {
    return [
      {
        key: 'dashboardLabel',
        label: 'Dashboard',
        sortOrder: 0,
        sortDirection: 'ascending',
      },
      {
        key: 'panelTitle',
        label: 'Metric',
        fn: (value) => {
          return value.replace(/[0-9]+-(.*)/, '$1');
        },
      },
      { key: 'field', label: 'Field' },
      {
        key: '_id',
        label: 'Alert condition',
        fn: (value, object) => {
          return new Spacebars.SafeString(createAlertConditionSpan(object));
        },
      },
      { key: 'period', label: 'Period' },
      { key: 'interval', label: 'Interval' },
      {
        key: 'enabled',
        label: 'Status',
        fn: (value, object) => {
          return new Spacebars.SafeString(createAlertStatusSpan(object));
        },
      },

      {
        key: 'enabled',
        label: ' ',
        isVisible: Template.instance().showIcons,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="toggle-alert"  aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Enable / disable alert"></i>`,
          );
        },
        cellClass: function (value) {
          // noinspection UnnecessaryLocalVariableJS
          const css =
            value ?
              'fa fa-stop reactive-table-icon'
            : 'fa fa-play reactive-table-icon';
          return css;
        },
      },
      {
        key: '_id',
        label: ' ',
        isVisible: Template.instance().showIcons,

        fn: () => {
          return new Spacebars.SafeString(
            `<i id="edit-alert" class="fa fa-pencil reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Edit alert"></i>`,
          );
        },
      },
      {
        key: '_id',
        label: ' ',
        isVisible: Template.instance().showIcons,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="delete-alert" class="fa fa-trash reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete alert"></i>`,
          );
        },
      },
    ];
  },
  settings() {
    return {
      rowsPerPage: 20,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      noDataTmpl: Template.noApplicationAlerts,
    };
  },

  hasGrafanaDashboards() {
    const grafanaDashboards = GrafanaDashboards.find().fetch();
    if (grafanaDashboards) return grafanaDashboards.length > 0;
  },
});

const createAlertConditionSpan = (alert) => {
  return `<span>${alert.alertOperator} ${alert.alertValue}</span>`;
};

const createAlertStatusSpan = (alert) => {
  if (alert.enabled) {
    return `<span>Enabled</span>`;
  } else {
    return `<span>Disabled</span>`;
  }
};

Template.applicationAlerts.events({
  'click .reactive-table tbody tr'(event) {
    const afAtts = {};
    switch (event.target.id) {
      case 'delete-alert':
        swal({
          title: 'Delete alert',
          text: 'Are you sure?',
          icon: 'warning',
          buttons: ['Cancel', 'OK'],
          dangerMode: true,
        }).then((willDelete) => {
          //bound to the current `this`
          if (willDelete) {
            Meteor.call('deleteTask', this, (error, alert) => {
              if (alert.error) {
                window.toastr.clear();
                window.toastr['error'](JSON.stringify(alert.error), 'Error');

                swal.close();
              } else {
                Meteor.call('deleteAlert', this._id);

                window.toastr.clear();
                window.toastr['success']('Done!', 'Deleted alert');

                swal.close();
              }
            });
          } else {
            swal.close();
          }
        });

        break;

      case 'edit-alert':
        afAtts['type'] = 'update';
        afAtts['id'] = 'editAlerts';
        afAtts['schema'] = 'AlertSchema';
        afAtts['collection'] = 'Alerts';
        afAtts['buttonContent'] = 'Update';
        afAtts['backdrop'] = 'static';

        AutoForm.addHooks(
          afAtts['id'],
          {
            onSuccess: function () {
              // noinspection JSCheckFunctionSignatures
              Modal.hide('afModalWindow');
            },
          },
          false,
        );

        Modal.show('afModalWindow', {
          title: 'Edit alert',
          dialogClass: '',
          afAtts: afAtts,
          operation: afAtts['type'],
          collection: 'Alerts',
          doc: this._id,
          backdrop: afAtts['backdrop'],
        });

        break;

      case 'alert-settings':
        // if(userHasPermissionForApplicationFn(this)){
        Modal.show('alertWhereFilterModal', this);
        // }

        break;
      default:
        if (this.enabled === true) {
          Meteor.call('disableTask', this, (error, alert) => {
            if (alert.error) {
              window.toastr.clear();
              window.toastr['error'](JSON.stringify(alert.error), 'Error');

              Alerts.update(
                {
                  _id: this._id,
                },
                {
                  $set: {
                    error: error,
                  },
                },
              );
            } else {
              window.toastr.clear();
              window.toastr['success']('Done!', 'Disabled alert');

              Alerts.update(
                {
                  _id: this._id,
                },
                {
                  $set: {
                    enabled: false,
                    error: undefined,
                  },
                },
              );
            }
          });
        } else {
          Meteor.call('enableTask', this, (error, alert) => {
            if (alert.error) {
              window.toastr.clear();
              window.toastr['error'](JSON.stringify(alert.error), 'Error');

              Alerts.update(
                {
                  _id: this._id,
                },
                {
                  $set: {
                    error: error,
                  },
                },
              );
            } else {
              window.toastr.clear();
              window.toastr['success']('Done!', 'Enabled alert');

              Alerts.update(
                {
                  _id: this._id,
                },
                {
                  $set: {
                    enabled: true,
                    error: undefined,
                  },
                },
              );
            }
          });
        }

        break;
    }
  },
});

Template.noApplicationAlerts.helpers({
  hasGrafanaDashboards() {
    const grafanaDashboards = GrafanaDashboards.find().fetch();
    if (grafanaDashboards) return grafanaDashboards.length > 0;
  },
});
