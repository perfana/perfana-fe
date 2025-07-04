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

/* eslint-disable */
// noinspection HtmlUnknownAttribute,JSJQueryEfficiency

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';
import { ApplicationDashboards } from '../../../collections/applicationDashboards';
import { GrafanaDashboards } from '../../../collections/grafanaDashboards';
import { AutoConfigGrafanaDashboards } from '../../../collections/autoConfigGrafanaDashboards';
import { Profiles } from '../../../collections/profiles';

import { ReactiveVar } from 'meteor/reactive-var';

import './applicationGrafanaDashboards.html';

import { Applications } from '../../../collections/applications';
import { renderGrafanaUrl } from '../../../helpers/utils';
import { Grafanas } from '../../../collections/grafanas';
import { TestRuns } from '../../../collections/testruns';
import swal from 'sweetalert';
import _ from 'lodash';

Template.grafanaDashboards.onCreated(function grafanaDashboardsOnCreated() {
  this.state = new ReactiveDict();

  const grafanaDashboardsQuery = {
    $or: [
      { usedBySUT: Session.get('application') },
      { usedBySUT: { $exists: false } },
      { usedBySUT: { $size: 0 } },
    ],
  };

  Meteor.subscribe('grafanaDashboards', grafanaDashboardsQuery);

  Meteor.subscribe('applications');
  Meteor.subscribe('autoConfigGrafanaDashboards');
  Meteor.subscribe('profiles');

  this.userHasPermissionForApplication = new ReactiveVar(false);
  this.numberOfApplicationDashboards = new ReactiveVar();
  this.showFilter = new ReactiveVar(false);
  this.selectedDashboards = new ReactiveArray();

  this.autorun(() => {
    Template.instance().showFilter.set(
      Template.instance().numberOfApplicationDashboards.get() > 5,
    );

    /* update subscription based on filters*/

    const query = { $and: [] };

    if (Session.get('application'))
      query.$and.push({ application: Session.get('application') });
    if (Session.get('testEnvironment'))
      query.$and.push({ testEnvironment: Session.get('testEnvironment') });

    if (query.$and.length > 0) this.subscribe('applicationDashboards', query);

    const application = Applications.findOne({
      name: Session.get('application'),
    });

    if (application) {
      Meteor.call(
        'userHasPermissionForApplication',
        application.name,
        (err, result) => {
          if (err) {
            console.log(JSON.stringify(err));
          } else {
            if (result.error) {
              console.log(JSON.stringify(result.error));
            } else {
              this.userHasPermissionForApplication.set(result.data);
            }
          }
        },
      );
    }
  });
});

Template.grafanaDashboards.helpers({
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
  application() {
    return Session.get('application');
  },
  testEnvironment() {
    return Session.get('testEnvironment');
  },

  dashboardAreAvailableToClone() {
    const testEnvironmentsWithDashboards = getTestEnvironmentsToCloneFrom(
      this.application,
      this.testEnvironment,
    );
    return testEnvironmentsWithDashboards.length > 0;
  },

  grafanaDashboards() {
    const application = Applications.findOne({
      name: FlowRouter.current().queryParams.systemUnderTest,
    });

    if (application) {
      const environmentDashboards = ApplicationDashboards.find(
        {
          $and: [
            { application: FlowRouter.current().queryParams.systemUnderTest },
            {
              testEnvironment: FlowRouter.current().queryParams.testEnvironment,
            },
          ],
        },
        { sort: { dashboardLabel: 1 } },
      ).fetch();

      Template.instance().numberOfApplicationDashboards.set(
        environmentDashboards.length,
      );

      return environmentDashboards;
    } else {
      return [];
    }
  },
  fields() {
    return [
      { key: 'grafana', label: 'Grafana instance' },
      { key: 'dashboardName', label: 'Dashboard name' },
      {
        key: 'dashboardLabel',
        label: 'Dashboard label',
        sortOrder: 0,
        sortDirection: 'asscending',
      },
      { key: 'testEnvironment', label: 'Test environment' },
      {
        key: '_id',
        label: 'Profile',
        sortOrder: 0,
        sortDirection: 'ascending',
        fn: (value, object) => {
          return new Spacebars.SafeString(createProfileLabel(object));
        },
      },
      {
        key: '_id',
        label: '',

        isVisible: Template.instance().userHasPermissionForApplication,

        fn: () => {
          return new Spacebars.SafeString(
            `<i id="edit-application-dashboard" class="fa fa-pencil reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Edit dashboard"></i>`,
          );
        },
      },

      {
        key: '_id',
        label: '',
        isVisible: Template.instance().userHasPermissionForApplication,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="grafana-dashboard-link" class="fa fa-external-link reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Open in Grafana"></i>`,
          );
        },
      },
      {
        key: '_id',
        label: () => {
          return new Spacebars.SafeString(
            `<i id="delete-selected-dashboards" class="fa fa-trash reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete selected dashboards"></i>`,
          );
        },
        sortable: false,
        isVisible: Template.instance().userHasPermissionForApplication,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="delete-application-dashboard" class="fa fa-trash reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete dashboard"></i>`,
          );
        },
      },

      {
        key: '_id',
        sortable: false,
        label: () => {
          return new Spacebars.SafeString(
            `<input id="select-all-dashboards" class="reactive-table-icon" type='checkbox' />`,
          );
        },
        fn: (value, object) => {
          return new Spacebars.SafeString(
            `<input dashboard-id=${object._id} id="select-dashboard" class="reactive-table-icon" type='checkbox' />`,
          );
        },
        cellClass: 'select-dashboard',
      },
      {
        key: '_id',
        sortable: false,
        label: '',
        cellClass: 'align-left-column',
        headerClass: 'align-left-column',
        fn: (value, object) => {
          return new Spacebars.SafeString(getExportMenu(object));
        },
      },
    ];
  },
  settings() {
    return {
      rowsPerPage: 20,
      showFilter: Template.instance().showFilter.get(),
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      noDataTmpl: Template.noApplicationDashboards,
    };
  },
  hasGrafanaDashboards() {
    return (
      Template.instance().numberOfApplicationDashboards &&
      Template.instance().numberOfApplicationDashboards.get() > 0
    );
  },
});

Template.grafanaDashboards.events({
  'click #classifications'(event) {
    event.preventDefault();
    const applicationDashboardId = event.currentTarget.getAttribute(
      'applicationDashboard-id',
    );
    const applicationDashboardLabel = event.currentTarget.getAttribute(
      'applicationDashboard-label',
    );
    Meteor.call(
      'getMetricClassificationsYaml',
      applicationDashboardId,
      (err, exportResponse) => {
        if (exportResponse.error) {
          console.log(JSON.stringify(exportResponse.error));
        } else {
          const blob = new Blob([exportResponse.data], { type: 'text/yaml' });
          saveAs(blob, `${applicationDashboardLabel}.yaml`);
        }
      },
    );
  },
  'click #genericChecks'(event) {
    event.preventDefault();
    const applicationDashboardId = event.currentTarget.getAttribute(
      'applicationDashboard-id',
    );
    const applicationDashboardLabel = event.currentTarget.getAttribute(
      'applicationDashboard-label',
    );
    Meteor.call(
      'getMetricGenericChecksYaml',
      applicationDashboardId,
      (err, exportResponse) => {
        if (exportResponse.error) {
          console.log(JSON.stringify(exportResponse.error));
        } else {
          const blob = new Blob([exportResponse.data], { type: 'text/yaml' });
          saveAs(blob, `${applicationDashboardLabel}.yaml`);
        }
      },
    );
  },
});
const getExportMenu = (object) => {
  return `
        <div class="testrun-menu">
            <div class="dropdown btn-group ">
              <i class="fa fa-bars dropdown-toggle"  id="dropdownMenuIcon" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"></i>
              <div class="dropdown-menu test-run-menu-lef" aria-labelledby="dropdownMenuIcon">
                <h6 class="dropdown-header">Export for provisioning</h6>
                <li class="test-run-menu"><a class="dropdown-item" id="classifications" applicationDashboard-id=${object._id} applicationDashboard-label=${object.dashboardLabel.replaceAll(' ', '_')} href="#">Metric classification</a></li>
                <li class="test-run-menu"><a class="dropdown-item" id="genericChecks" applicationDashboard-id=${object._id} applicationDashboard-label=${object.dashboardLabel.replaceAll(' ', '_')} href="#">Generic checks</a></li>
              </div>
          </div>
        </div>`;
};
const createProfileLabel = (applicationDashboard) => {
  if (applicationDashboard.templateDashboardUid) {
    const autoConfigGrafanaDashboard = AutoConfigGrafanaDashboards.findOne({
      dashboardUid: applicationDashboard.templateDashboardUid,
    });

    if (autoConfigGrafanaDashboard) {
      const profile = Profiles.findOne({
        name: autoConfigGrafanaDashboard.profile,
      });

      if (profile) {
        if (profile.readOnly) {
          return `<span class="golden-path-label break-word label label-default">${autoConfigGrafanaDashboard.profile}</span>`;
        } else {
          return `<span class=" break-word label label-default">${autoConfigGrafanaDashboard.profile}</span>`;
        }
      } else {
        return '';
      }
    } else {
      return '';
    }
  } else {
    return '';
  }
};

const getTestEnvironmentsToCloneFrom = (
  selectedApplication,
  selectedTestEnvironment,
) => {
  const application = Applications.findOne({ name: selectedApplication });

  const environmentsWithDashboards = [];

  if (application) {
    _.each(application.testEnvironments, (testEnvironment) => {
      if (testEnvironment.name !== selectedTestEnvironment) {
        const applicationDashboardsCount = ApplicationDashboards.find({
          $and: [
            { application: selectedApplication },
            // {testEnvironment: testEnvironment.name},
          ],
        }).count();

        if (applicationDashboardsCount > 0) {
          environmentsWithDashboards.push({
            testEnvironment: testEnvironment.name,
          });
        }
      }
    });
  }

  return environmentsWithDashboards;
};

Template.grafanaDashboards.events({
  'click .back'() {
    history.back();
  },
  'click #delete-selected-dashboards'(event, template) {
    swal({
      title: 'Delete selected dashboards',
      text: 'This will also delete any service level indicators and report panels based on the deleted dashboards!',
      icon: 'warning',
      buttons: true,
      cancel: true,
      confirm: 'Confirm',
    }).then((willDelete) => {
      //bound to the current `this`
      if (willDelete) {
        _.each(template.selectedDashboards, (dashboardId) => {
          Meteor.call('deleteApplicationDashboard', dashboardId);
        });

        template.selectedDashboards.clear();
      } else {
        swal.close();
      }
    });
  },
  'click .reactive-table tbody tr'(event, template) {
    const afAtts = {};
    switch (event.target.id) {
      case 'delete-application-dashboard':
        swal({
          title: 'Delete dashboard',
          text: 'This will also delete any service level indicators and report panels based on this dashboard!',
          icon: 'warning',
          buttons: ['Cancel', 'OK'],
          dangerMode: true,
        }).then((willDelete) => {
          //bound to the current `this`
          if (willDelete) {
            Meteor.call('deleteApplicationDashboard', this._id);
            swal.close();
          } else {
            swal.close();
          }
        });

        break;
      case 'select-dashboard':
        if (event.target.checked) {
          template.selectedDashboards.push(this._id);
        } else {
          const index = template.selectedDashboards
            .map((dashboard) => {
              return dashboard;
            })
            .indexOf(this._id);
          template.selectedDashboards.splice(index, 1);
        }

        break;

      case 'edit-application-dashboard':
        afAtts['type'] = 'method-update';
        afAtts['meteormethod'] = 'updateApplicationDashboard';
        afAtts['id'] = 'editApplicationDashboards';
        afAtts['schema'] = 'ApplicationDashboardsSchema';
        afAtts['collection'] = 'ApplicationDashboards';
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
          collection: 'ApplicationDashboards',
          doc: this,
          backdrop: afAtts['backdrop'],
        });

        break;

      case 'grafana-dashboard-link':
        const grafana = Grafanas.findOne({ label: this.grafana });

        const grafanaDashboard = GrafanaDashboards.findOne({
          $and: [{ grafana: this.grafana }, { uid: this.dashboardUid }],
        });

        /* take latest Run and override start and end */

        let testRun = TestRuns.findOne({
          $and: [
            { application: this.application },
            { testEnvironment: this.testEnvironment },
          ],
        });

        if (testRun) {
          testRun['start'] = 'now-15m';
          testRun['end'] = 'now';
        } else {
          // if no test run is available create dummy test run

          testRun = {};

          testRun['start'] = 'now-15m';
          testRun['end'] = 'now';
          testRun['application'] = this.application;
          testRun['testEnvironment'] = this.testEnvironment;
        }

        const grafanaUrl = renderGrafanaUrl(
          testRun,
          this,
          grafana,
          grafanaDashboard,
          false,
        );
        window.open(grafanaUrl, '_blank');
        break;
    }
  },
  'click .grafana-configuration': () => {
    FlowRouter.go('grafana', null, null);
  },
  'click .clone-dashboards': (event, template) => {
    Modal.show('cloneFromTestEnvironment', template);
  },
  'click #select-all-dashboards'(event, template) {
    if (event.target.checked) {
      $('input#select-dashboard[type="checkbox"]')
        .not(event.target)
        .prop('checked', event.target.checked);
      // $('input#select-dashboard[type="checkbox"]').attr('Checked','Checked');
      // $('input#select-dashboard[type="checkbox"]').attr('Checked','Checked');

      $('input#select-dashboard[type="checkbox"]').each(function () {
        if ($(this).is(':checked'))
          template.selectedDashboards.push($(this).attr('dashboard-id'));
      });
    } else {
      template.selectedDashboards.clear();

      $('input#select-dashboard[type="checkbox"]')
        .not(event.target)
        .prop('checked', event.target.checked);
    }
  },
});

Template.noApplicationDashboards.onCreated(
  function applicationBenchmarksOnCreated() {
    this.userHasPermissionForApplication = new ReactiveVar(false);

    Meteor.subscribe('applications');

    this.autorun(() => {
      const application = Applications.findOne({
        name: Session.get('application'),
      });

      if (application) {
        Meteor.call(
          'userHasPermissionForApplication',
          application.name,
          (err, result) => {
            if (err) {
              console.log(JSON.stringify(err));
            } else {
              if (result.error) {
                console.log(JSON.stringify(result.error));
              } else {
                this.userHasPermissionForApplication.set(result.data);
              }
            }
          },
        );
      }
    });
  },
);

Template.noApplicationDashboards.helpers({
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
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
    afAtts['type'] = 'method';
    afAtts['meteormethod'] = 'insertApplicationDashboard';
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

Template.cloneFromTestEnvironment.helpers({
  applicationTestEnvironments() {
    return getTestEnvironmentsToCloneFrom(
      this.data.application,
      this.data.testEnvironment,
    );
  },
});

Template.cloneFromTestEnvironment.events({
  'click #clone-dashboards-from-env': (event, template) => {
    const selectedTestEnvironment = $(
      'select.select-clone-test-environment',
    ).val();

    Meteor.call(
      'cloneApplicationDashboards',
      template.data.data.application,
      template.data.data.testEnvironment,
      selectedTestEnvironment,
      (err, result) => {
        if (result.error) {
          window.toastr.clear();
          window.toastr['error'](JSON.stringify(result.error), 'Error');
        } else {
          window.toastr.clear();
          window.toastr['success'](
            'Done!',
            `Added ${result.data.addedDashboards} dashboards`,
          );
        }
      },
    );
  },
});
