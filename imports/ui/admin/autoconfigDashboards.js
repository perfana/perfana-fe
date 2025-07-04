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
import { AutoConfigGrafanaDashboards } from '../../collections/autoConfigGrafanaDashboards';
import { Profiles } from '../../collections/profiles';
import { ReactiveVar } from 'meteor/reactive-var';

import './autoconfigDashboards.html';

Template.autoconfigDashboards.onCreated(function profilesOnCreated() {
  this.isAdmin = new ReactiveVar();
  Meteor.subscribe('autoConfigGrafanaDashboards');
  Meteor.subscribe('profiles');

  Session.set('profileName', this.data.profileName);

  AutoForm.addHooks(
    'editAutoConfigGrafanaDashboards',
    {
      onSuccess: function () {
        window.toastr.clear();
        window.toastr['success']('Done!', 'Updated dashboard!');
      },
      onError: function (formType, err) {
        window.toastr.clear();
        window.toastr['error'](err, 'Error');
      },
    },
    false,
  );

  AutoForm.addHooks(
    'addAutoConfigGrafanaDashboards',
    {
      onSuccess: function () {
        window.toastr.clear();
        window.toastr['success']('Done!', 'Added dashboard!');
      },
      onError: function (formType, err) {
        window.toastr.clear();
        window.toastr['error'](err, 'Error');
      },
    },
    false,
  );
});

Template.autoconfigDashboards.onRendered(function profilesOnRendered() {
  this.isAdmin.set(
    Roles.userHasRole(Meteor.userId(), 'admin') ||
      Roles.userHasRole(Meteor.userId(), 'super-admin'),
  );
});

Template.autoconfigDashboards.helpers({
  isAdmin() {
    return Template.instance().isAdmin.get();
  },
  notReadOnly() {
    const profile = Profiles.findOne({ name: this.profileName });
    if (profile) {
      return !(profile.readOnly && profile.readOnly === true);
    }
  },

  // selectedProfileId() {
  //
  //     return Template.instance().selectedProfileId.get();
  //
  // },
  // profileSelected() {
  //
  //     return Template.instance().profileSelected.get();
  //
  // },
  dashboards() {
    return AutoConfigGrafanaDashboards.find({ profile: this.profileName });
  },
  fields() {
    return [
      // {key: 'grafana', label: 'Grafana instance'},
      { key: 'dashboardName', label: 'Dashboard', cellClass: 'col-md-2' },
      // {key: 'removeTemplatingVariables', label: 'Replace templating variables', cellClass: 'col-md-2'},
      {
        key: 'createSeparateDashboardForVariable',
        label: 'Separate dashboard for variable',
        cellClass: 'col-md-2',
      },
      {
        key: 'setHardcodedValueForVariables',
        label: 'Override variable values',
        cellClass: 'col-md-2',
        fn: (value) => {
          return new Spacebars.SafeString(createHardcodedValuesSpan(value));
        },
      },
      {
        key: 'matchRegexForVariables',
        label: 'Filter variable values by regex',
        cellClass: 'col-md-4',
        fn: (value) => {
          return new Spacebars.SafeString(createMatchRegexSpan(value));
        },
      },
      {
        key: '_id',
        label: '',
        isVisible: Template.instance().isAdmin,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="edit-auto-config-dashboard" class="fa fa-pencil" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Edit dashboard"></i>`,
          );
        },
      },

      {
        key: '_id',
        label: '',
        isVisible: Template.instance().isAdmin,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="delete-auto-config-dashboard" class="fa fa-trash" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete dashboard"></i>`,
          );
        },
      },
    ];
  },
  settings() {
    return {
      rowsPerPage: 50,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      noDataTmpl: Template.noTemplateDashboards,
    };
  },
});

Template.autoconfigDashboards.events({
  'click .reactive-table.auto-config-grafana-dashboards tbody tr'(event) {
    const afAtts = {};

    switch (event.target.id) {
      case 'delete-auto-config-dashboard':
        swal({
          title: 'Delete dashboard',
          text: 'Are you sure?',
          icon: 'warning',
          buttons: ['Cancel', 'OK'],
          dangerMode: true,
        }).then((willDelete) => {
          //bound to the current `this`
          if (willDelete) {
            Meteor.call(
              'deleteAutoConfigGrafanaDashboard',
              this,
              (err, result) => {
                if (result.error) {
                  window.toastr.clear();
                  window.toastr['error'](JSON.stringify(result.error), 'Error');
                } else {
                  window.toastr.clear();
                  window.toastr['success']('Done!', 'Deleted dashboard!');
                }

                swal.close();
              },
            );
          } else {
            swal.close();
          }
        });

        break;

      case 'edit-auto-config-dashboard':
        afAtts['type'] = 'method-update';
        afAtts['meteormethod'] = 'updateAutoConfigGrafanaDashboard';
        afAtts['id'] = 'editAutoConfigGrafanaDashboards';
        afAtts['schema'] = 'AutoConfigGrafanaDashboardSchema';
        afAtts['collection'] = 'AutoConfigGrafanaDashboards';
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
          title: 'Update dashboard',
          dialogClass: '',
          afAtts: afAtts,
          operation: 'update',
          collection: 'AutoConfigGrafanaDashboards',
          doc: this,
          backdrop: afAtts['backdrop'],
        });

        break;
    }
  },
});

const createMatchRegexSpan = (matchRegexVariables) => {
  let HTML = '';
  if (matchRegexVariables && matchRegexVariables.length > 0) {
    matchRegexVariables.forEach((matchRegexVariable) => {
      HTML += `<span class="break-word label label-default" style="margin:5px;">${matchRegexVariable.name}=~${matchRegexVariable.regex}</span>`;
    });
  } else {
    HTML = '<span></span>';
  }

  return HTML;
};

const createHardcodedValuesSpan = (hardCodedValues) => {
  let HTML = '';
  if (hardCodedValues && hardCodedValues.length > 0) {
    hardCodedValues.forEach((hardCodedValue) => {
      let values = '';

      hardCodedValue.values.forEach((value, index) => {
        if (index !== 0) {
          values += `, ${value}`;
        } else {
          values += `${value}`;
        }
      });

      HTML += `<span class="break-word label label-default" style="margin:5px;">${hardCodedValue.name}=${values}</span>`;
    });
  } else {
    HTML = '<span></span>';
  }

  return HTML;
};
