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

/* eslint-disable no-case-declarations */
// noinspection HtmlUnknownAttribute

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import {
  formatDate,
  getDataRetention,
  getTestRun,
} from '/imports/helpers/utils';
import { Applications } from '/imports/collections/applications';
import { ApplicationDashboards } from '/imports/collections/applicationDashboards';
import { TestRuns } from '/imports/collections/testruns';

import { ReactiveVar } from 'meteor/reactive-var';
import { Snapshots } from '../../../collections/snapshots';
import { Session } from 'meteor/session';

import './testRunGrafanaSnapshots.html';
import { log } from '/both/logger';

toastr.options = {
  closeButton: false,
  debug: false,
  newestOnTop: false,
  progressBar: false,
  positionClass: 'toast-top-right',
  preventDuplicates: false,
  onclick: null,
  showDuration: '300',
  hideDuration: '1000',
  timeOut: '5000',
  extendedTimeOut: '1000',
  showEasing: 'swing',
  hideEasing: 'linear',
  showMethod: 'fadeIn',
  hideMethod: 'fadeOut',
};

Template.snapshotModal.onCreated(() => {});

Template.snapshotModal.helpers({
  hasUrl() {
    return this.snapshotUrl !== undefined;
  },
  url() {
    const theme =
      Meteor.user().profile.theme ? Meteor.user().profile.theme : 'light';
    return this.snapshotUrl + `?kiosk&theme=${theme}`;
  },
});

Template.grafanaSnapshots.onCreated(function grafanaSnapshotsOnCreated() {
  const query = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
    ],
  };

  const snapshotQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
      { testRunId: FlowRouter.current().params.testRunId },
    ],
  };

  const applicationDashboardQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
    ],
  };

  Meteor.subscribe('testRuns', 'testRunGrafanaSnapshots', 50, query);

  Meteor.subscribe('grafanas');
  Meteor.subscribe('applications');
  Meteor.subscribe('configuration');
  Meteor.subscribe('applicationDashboards', applicationDashboardQuery);
  Meteor.subscribe('snapshots', snapshotQuery, 'testRunGrafanaSnapshots');
  Meteor.subscribe('benchmarks', query);

  this.creatingSnaphotsVar = new ReactiveVar(false);
  this.numberOfSnapshots = new ReactiveVar();
  this.showFilter = new ReactiveVar(false);
  this.userHasPermissionForApplication = new ReactiveVar(false);

  this.autorun(() => {
    if (Session.get('creatingSnaphots'))
      Template.instance().creatingSnaphotsVar.set(
        Session.get('creatingSnaphots'),
      );
    Template.instance().showFilter.set(
      Template.instance().numberOfSnapshots.get() > 5,
    );

    const application = Applications.findOne({
      name: Session.get('application'),
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

    const grafanaDashboardsQuery = {
      $and: [{ usedBySUT: Session.get('application') }],
    };

    Meteor.subscribe('grafanaDashboards', grafanaDashboardsQuery);
  });
});

Template.grafanaSnapshots.helpers({
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
  testRunHasSnapshots() {
    const snapshots = Snapshots.find({
      $and: [
        { application: Session.get('application') },
        { testEnvironment: Session.get('testEnvironment') },
        { testType: Session.get('testType') },
        { testRunId: FlowRouter.current().params.testRunId },
      ],
    });

    if (snapshots) return snapshots.fetch().length > 0;
  },
  testRunSnapshots() {
    const snapshots = Snapshots.find({
      $and: [
        { application: Session.get('application') },
        { testEnvironment: Session.get('testEnvironment') },
        { testType: Session.get('testType') },
        { testRunId: FlowRouter.current().params.testRunId },
      ],
    });

    if (snapshots) return snapshots;

    // let testRun = getTestRun(FlowRouter.current().queryParams.systemUnderTest, FlowRouter.current().params.testRunId);
    //
    // if(testRun){
    //
    //     if(testRun.snapshots) {
    //
    //         Template.instance().numberOfSnapshots.set(testRun.snapshots.length);
    //         return testRun.snapshots;
    //
    //     } else {
    //
    //         return [];
    //     }
    // }
  },
  hasNoSnapshots() {
    const snapshots = Snapshots.find({
      $and: [
        { application: Session.get('application') },
        { testEnvironment: Session.get('testEnvironment') },
        { testType: Session.get('testType') },
        { testRunId: FlowRouter.current().params.testRunId },
      ],
    }).fetch();

    if (snapshots) return snapshots.length === 0;
  },
  testRunHasAllSnapshots() {
    const snapshots = Snapshots.find({
      $and: [
        { application: Session.get('application') },
        { testEnvironment: Session.get('testEnvironment') },
        { testType: Session.get('testType') },
        { testRunId: FlowRouter.current().params.testRunId },
      ],
    }).fetch();

    if (snapshots) {
      Template.instance().numberOfSnapshots.set(snapshots.length);

      const applicationDashboards = ApplicationDashboards.find({
        $and: [
          { application: Session.get('application') },
          { testEnvironment: Session.get('testEnvironment') },
        ],
      }).fetch();

      return (
        snapshots.length >= applicationDashboards.length &&
        Template.instance().creatingSnaphotsVar.get() === false
      );
    }
  },

  creatingSnaphots() {
    return Template.instance().creatingSnaphotsVar.get();
  },

  dataRetentionNotExpired() {
    let dataRetentionNotExpired = false;
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    if (testRun) {
      const applicationDashboards = ApplicationDashboards.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
        ],
      }).fetch();

      applicationDashboards.forEach((applicationDashboard) => {
        const retention = getDataRetention(applicationDashboard);
        if (
          new Date().getTime() - new Date(testRun.end).getTime() <
          retention * 1000
        ) {
          dataRetentionNotExpired = true;
        }
      });

      return dataRetentionNotExpired;
    }
  },
  userHasPermission() {
    const user = Meteor.user();
    const role = FlowRouter.current().queryParams.systemUnderTest;
    return (
      user &&
      (Roles.userHasRole(user._id, role) ||
        Roles.userHasRole(user._id, 'admin') ||
        Roles.userHasRole(user._id, 'super-admin'))
    );
  },
  snapshotHasExpiry() {
    return this.expires !== 0;
  },
  fields() {
    return [
      { key: 'grafana', label: 'Grafana instance' },
      {
        key: 'dashboardLabel',
        label: 'Dashboard label',
        sortOrder: 0,
        sortDirection: 'asscending',
      },
      {
        key: 'expiry',
        label: 'Expires',
        fn: (value, object) => {
          return humanReadableExpiryHelper(this.testRun, object.expires);
        },
      },
      {
        key: '_id',
        label: '',
        isVisible: Template.instance().userHasPermissionForApplication,
        fn: (value, object) => {
          if (object.status === 'COMPLETE' || object.status === 'ERROR')
            return new Spacebars.SafeString(
              `<i id="delete-snapshot" snapshot-dashboard-label="${object.dashboardLabel}" snapshot-dashboard-uid="${object.dashboardUid}" snapshot-grafana="${object.grafana}" snapshot-url="${object.url}" snapshot-delete-url="${object.deleteUrl}" class="fa fa-trash reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete snapshot"></i>`,
            );
        },
      },
      {
        key: '_id',
        label: '',
        isVisible: Template.instance().userHasPermissionForApplication,
        fn: (value, object) => {
          if (object.status === 'COMPLETE' || object.status === 'ERROR')
            return new Spacebars.SafeString(getUpdateSnapshotIcon(object));
        },
      },
      // {key: '_id', label: '',
      //     isVisible: Template.instance().userHasPermissionForApplication,
      //     fn:  (value, object, key) =>  {
      //         if(object.status === 'COMPLETE' || (object.status === 'ERROR' && object.error === 'Incomplete snapshot')) return new Spacebars.SafeString(`<i id="save-snapshot" snapshot-dashboard-name="${object.dashboardName}" snapshot-dashboard-uid="${object.dashboardUid}" snapshot-dashboard-label="${object.dashboardLabel}" snapshot-grafana="${object.grafana}" snapshot-url="${object.url}" snapshot-delete-url="${object.deleteUrl}" class="fa fa-floppy-o reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Set to never expire"></i>`);
      //     }
      // },
      {
        key: '_id',
        label: '',
        fn: (value, object) => {
          if (
            object.status === 'COMPLETE' ||
            (object.status === 'ERROR' &&
              object.error === 'Incomplete snapshot')
          )
            return new Spacebars.SafeString(
              `<i id="snapshot-modal" class="fa fa-eye reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Quick look"></i>`,
            );
        },
      },

      {
        key: 'status',
        label: '',
        fn: (value, object) => {
          switch (true) {
            case value === 'NEW':
              return new Spacebars.SafeString(
                `<i  class="fa fa-refresh fa-spin reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Busy creating snapshot"></i>`,
              );
            case value.includes('IN_PROGRESS'):
              return new Spacebars.SafeString(
                `<i  class="fa fa-refresh fa-spin reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Busy creating snapshot"></i>`,
              );
            case value.includes('RETRY'):
              return new Spacebars.SafeString(
                `<i  class="fa fa-refresh fa-spin reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Retrying creating snapshot"></i>`,
              );
            case value === 'ERROR':
              return new Spacebars.SafeString(
                `<i  class="fa fa-exclamation-triangle reactive-table-icon danger" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="${object.error}"></i>`,
              );
            default:
          }
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
      // noDataTmpl: Template.noSnapshots
    };
  },
});

Template.grafanaSnapshots.events({
  'click .reactive-table tbody tr'(event) {
    event.preventDefault();

    switch (event.target.id) {
      case 'delete-snapshot':
        swal({
          title: 'Delete snapshot',
          text: 'Are you sure?',
          icon: 'warning',
          buttons: ['Cancel', 'OK'],
          dangerMode: true,
        }).then((willDelete) => {
          //bound to the current `this`
          if (willDelete) {
            const snapshotDeleteUrl = $(event.target).attr(
              'snapshot-delete-url',
            );
            const grafana = $(event.target).attr('snapshot-grafana');
            const dashboardLabel = $(event.target).attr(
              'snapshot-dashboard-label',
            );
            const dashboardUid = $(event.target).attr('snapshot-dashboard-uid');
            const testRun = getTestRun(
              FlowRouter.current().queryParams.systemUnderTest,
              FlowRouter.current().params.testRunId,
            );

            Meteor.call(
              'deleteSnapshot',
              testRun,
              grafana,
              dashboardUid,
              dashboardLabel,
              snapshotDeleteUrl,
              this,
              () => {},
            );
          } else {
            swal.close();
          }
        });

        break;

      case 'update-snapshot':
        const testRun = getTestRun(
          FlowRouter.current().queryParams.systemUnderTest,
          FlowRouter.current().params.testRunId,
        );

        if (testRun) {
          swal({
            title: 'Update snapshot',
            text: 'Are you sure?',
            icon: 'warning',
            buttons: ['Cancel', 'OK'],
            dangerMode: true,
          }).then((willDelete) => {
            //bound to the current `this`
            if (willDelete) {
              toastr['info']('This might take a while', 'Updating snapshot');

              Meteor.call('updateSnapshotStatus', this, (error) => {
                if (error) toastr['error'](error.reason, 'Error');
              });

              // // template.creatingSnaphotsVar.set(true);
              //
              // let snapshotUrl = $(event.target).attr('snapshot-url')
              // let snapshotDeleteUrl = $(event.target).attr('snapshot-delete-url')
              // let grafana = $(event.target).attr('snapshot-grafana');
              // let dashboardLabel = $(event.target).attr('snapshot-dashboard-label');
              // let dashboardUid = $(event.target).attr('snapshot-dashboard-uid');
              // let testRun = getTestRun(FlowRouter.current().queryParams.systemUnderTest, FlowRouter.current().params.testRunId);
              //
              // Meteor.call('deleteSnapshot', testRun, grafana, dashboardUid, dashboardLabel, snapshotDeleteUrl, this._id, (error, testRun) => {
              //
              //     Meteor.call('createSnapshot', getTestRun(FlowRouter.current().queryParams.systemUnderTest, FlowRouter.current().params.testRunId), grafana, dashboardUid, dashboardLabel, (error, snapshot) => {
              //
              //     });
              //
              // });
            } else {
              swal.close();
            }
          });
        }

        break;

      case 'save-snapshot':
        swal({
          title: 'Set snapshot to never expire',
          text: 'Are you sure?',
          icon: 'warning',
          buttons: ['Cancel', 'OK'],
          dangerMode: true,
        }).then((willSave) => {
          //bound to the current `this`
          if (willSave) {
            const testRun = getTestRun(
              FlowRouter.current().queryParams.systemUnderTest,
              FlowRouter.current().params.testRunId,
            );

            const snapshot = {
              url: $(event.target).attr('snapshot-url'),
              snapshotDeleteUrl: $(event.target).attr('snapshot-delete-url'),
              grafana: $(event.target).attr('snapshot-grafana'),
              dashboard: $(event.target).attr('snapshot-dashboard-label'),
              dashboardUid: $(event.target).attr('snapshot-dashboard-uid'),
              dashboardLabel: $(event.target).attr('snapshot-dashboard-label'),
            };

            Meteor.call('updateSnapshot', testRun, snapshot, 0, () => {
              // set expiry to 0
            });
          } else {
            swal.close();
          }
        });

        break;

      case 'snapshot-modal':
        const snapshotModalParams = {
          snapshotUrl: this.url,
        };

        Modal.show('snapshotModal', snapshotModalParams);
        break;
    }
  },

  'click div #save-all-snapshots'(event) {
    event.preventDefault();
    swal({
      title: 'Set all snapshots to never expire',
      text: 'Are you sure?',
      icon: 'warning',
      buttons: ['Cancel', 'OK'],
      dangerMode: true,
    }).then((willSave) => {
      //bound to the current `this`
      if (willSave) {
        const testRun = getTestRun(
          FlowRouter.current().queryParams.systemUnderTest,
          FlowRouter.current().params.testRunId,
        );

        const snapshots = Snapshots.find({
          $and: [
            { application: testRun.application },
            { testEnvironment: testRun.testEnvironment },
            { testType: testRun.testType },
            { testRunId: testRun.testRunId },
          ],
        }).fetch();

        if (snapshots) {
          snapshots.forEach((snapshot) => {
            Meteor.call('updateSnapshot', testRun, snapshot, 0, () => {
              // set expiry to 0
            });
          });
        }
      } else {
        swal.close();
      }
    });
  },
  'click div #delete-all-snapshots'(event) {
    event.preventDefault();
    swal({
      title: 'Delete all snapshots',
      text: 'Are you sure?',
      icon: 'warning',
      buttons: ['Cancel', 'OK'],
      dangerMode: true,
    }).then((willDelete) => {
      //bound to the current `this`
      if (willDelete) {
        const testRun = getTestRun(
          FlowRouter.current().queryParams.systemUnderTest,
          FlowRouter.current().params.testRunId,
        );

        Meteor.call('deleteAllSnapshots', testRun, (error, testRun) => {
          if (testRun.error) {
            if (testRun.error)
              toastr['error'](JSON.stringify(testRun.error), 'Error');
          }
        });
      } else {
        swal.close();
      }
    });
  },
  'click div #update-snapshots'(event) {
    event.preventDefault();
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    if (testRun) {
      Modal.show('updateSnapshotsModal', {
        selectedTestRunIds: [testRun._id],
        checkRetention: true,
      });
      return false;
    }
  },
  'click div .create-snapshot'(event, template) {
    event.preventDefault();
    // event.target.innerHTML = '<i class="fa fa-spinner fa-spin" aria-hidden="true"></i>';

    template.creatingSnaphotsVar.set(true);

    toastr['info']('This might take a while', 'Creating snapshots');

    Meteor.call(
      'createSnapshots',
      getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        FlowRouter.current().params.testRunId,
      ),
      (error) => {
        template.creatingSnaphotsVar.set(false);
        if (error) toastr['error'](error.reason, 'Error');
      },
    );
  },
});

const humanReadableExpiryHelper = (testRun, expires) => {
  if (!expires || expires === 0) {
    return 'Never';
  } else {
    return formatDate(
      new Date(testRun.end).setSeconds(
        new Date(testRun.end).getSeconds() + parseInt(expires),
      ),
    );
  }
};

Template.snapshotModal.helpers({
  themeUrl(url) {
    const user = Meteor.user();

    if (user && url)
      return url.replace(/theme=(dark|light)/, `theme=${user.profile.theme}`);
  },
});
Template.noSnapshots.helpers({
  hasGrafanaDashboards() {
    const applicationDashboards = ApplicationDashboards.find({
      $and: [
        { application: Session.get('application') },
        { testEnvironment: Session.get('testEnvironment') },
      ],
    });
    if (applicationDashboards) return applicationDashboards.fetch().length > 0;
  },
});

const getUpdateSnapshotIcon = (snapshot) => {
  let HTML = '';
  let retention;
  const applicationDashboard = ApplicationDashboards.findOne({
    dashboardUid: snapshot.dashboardUid,
  });
  if (applicationDashboard) {
    retention = getDataRetention(applicationDashboard);
    const testRun = TestRuns.findOne({ testRunId: snapshot.testRunId });
    if (testRun) {
      if (
        new Date().getTime() - new Date(testRun.end).getTime() <
        retention * 1000
      ) {
        HTML = `<i id="update-snapshot" snapshot-dashboard-label="${snapshot.dashboardLabel}" snapshot-dashboard-uid="${snapshot.dashboardUid}" snapshot-grafana="${snapshot.grafana}" snapshot-url="${snapshot.url}" snapshot-delete-url="${snapshot.deleteUrl}" class="fa fa-refresh reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Update snapshot"></i>`;
      } else {
        HTML = `<i id="update-snapshot-inactive"  style="color: lightgrey;"  class="fa fa-refresh reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Data is no longer available"></i>`;
      }
    }
  } else {
    HTML = `<i id="update-snapshot-inactive"  style="color: lightgrey;"  class="fa fa-refresh reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Grafana dashboard is missing in configuration"></i>`;
  }
  return HTML;
};
