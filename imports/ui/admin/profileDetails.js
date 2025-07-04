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
import { Profiles } from '../../collections/profiles';
import { AutoConfigGrafanaDashboards } from '../../collections/autoConfigGrafanaDashboards';
import { ReactiveVar } from 'meteor/reactive-var';

import './profileDetails.html';

Template.profileDetails.onCreated(function profilesOnCreated() {
  this.profileSelected = new ReactiveVar(false);

  Meteor.subscribe('profiles');
  Meteor.subscribe('genericChecks');
  Meteor.subscribe('genericReportPanels');
});

Template.profileDetails.helpers({
  entrepriseKpiInLicense() {
    return true;
  },
  profile() {
    return Profiles.findOne({ name: this.profileName });
  },
  hasDashboards() {
    const autoConfigGrafanaDashboards = AutoConfigGrafanaDashboards.find({
      profile: this.profileName,
    }).fetch();
    return autoConfigGrafanaDashboards.length > 0;
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
      noDataTmpl: Template.noProfiles,
    };
  },
});

Template.profileDetails.events({
  'click .add-profile': () => {
    Template.instance().addProfile.set(true);
  },
});

Template.noApplicationDashboards.helpers({
  hasGrafanaDashboards() {
    const grafanaDashboards = GrafanaDashboards.find().fetch();
    if (grafanaDashboards) return grafanaDashboards.length > 0;
  },
});

Template.noApplicationDashboards.events({
  'click .add-grafana-dashboard'() {
    /* show add dashboard afModal*/

    const afAtts = {};

    afAtts['id'] = 'addApplicationDashboards';
    afAtts['type'] = 'insert';
    afAtts['schema'] = 'ApplicationDashboardsSchema';
    afAtts['collection'] = 'ApplicationDashboards';
    afAtts['buttonContent'] = 'Add';
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
      title: 'Add Grafana dashboard',
      dialogClass: '',
      afAtts: afAtts,
      operation: afAtts['type'],
      collection: 'ApplicationDashboards',
      backdrop: afAtts['backdrop'],
    });
  },
});

// Template.cloneFromTestEnvironment.helpers({
//
//     applicationTestEnvironments() {
//
//         return getTestEnvironmentsToCloneFrom(this.data.application, this.data.testEnvironment);
//     },
//
// });

// Template.cloneFromTestEnvironment.events({
//
//     'click #clone-dashboards-from-env': (event, template) => {
//
//         let selectedTestEnvironment = $('select.select-clone-test-environment').val();
//
//         Meteor.call('cloneApplicationDashboards', template.data.data.application, template.data.data.testEnvironment, selectedTestEnvironment, (err, result) => {
//
//             if (err){
//
//                 window.toastr.clear();
//                 window.toastr["error"](err.reason, "Error")
//
//             } else {
//
//                 window.toastr.clear();
//                 window.toastr["success"]("Done!", `Added ${result.addedDashboards} dashboards`)
//
//             }
//
//         })
//     }
// });
