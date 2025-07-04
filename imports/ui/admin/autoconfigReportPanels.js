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
import { GenericReportPanels } from '../../collections/genericReportPanels';
import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';

import './autoconfigReportPanels.html';

Template.autoconfigReportPanels.onCreated(function profilesOnCreated() {
  this.isAdmin = new ReactiveVar();
  Meteor.subscribe('genericReportPanels');

  Session.set('profileName', this.data.profileName);

  AutoForm.addHooks('editGenericReportPanels', {
    onSuccess: function () {
      window.toastr.clear();
      window.toastr['success']('Done!', 'Updated report panel!');
    },
    onError: function (formType, err) {
      window.toastr.clear();
      window.toastr['error'](err, 'Error');
    },
  }, false);

  AutoForm.addHooks('addGenericReportPanels', {
    onSuccess: function () {
      window.toastr.clear();
      window.toastr['success']('Done!', 'Added report panel!');
    },
    onError: function (formType, err) {
      window.toastr.clear();
      window.toastr['error'](err, 'Error');
    },
  }, false);
});

Template.autoconfigReportPanels.onRendered(function profilesOnRendered() {
  this.isAdmin.set(
    Roles.userHasRole(Meteor.userId(), 'admin') ||
      Roles.userHasRole(Meteor.userId(), 'super-admin'),
  );
});
Template.autoconfigReportPanels.helpers({
  isAdmin() {
    return Template.instance().isAdmin.get();
  },

  reportPanels() {
    return GenericReportPanels.find({ profile: this.profileName });
  },
  fields() {
    return [
      {
        key: 'index',
        label: '#',
        sortOrder: 0,
        sortDirection: 'ascending',
        sortable: false,
        hidden: true,
      },

      {
        key: 'index',
        label: '',
        fn: (value, object) => {
          if (object.index > 0)
            return new Spacebars.SafeString(
              `<i id="move-panel-up" class="fa fa-arrow-up reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Move up"></i>`,
            );
        },
      },
      {
        key: '_id',
        label: '',
        sortable: false,
        fn: (value, object) => {
          const reportPanels = GenericReportPanels.find({
            profile: this.profileName,
          }).fetch();

          if (object.index < reportPanels.length - 1)
            return new Spacebars.SafeString(
              `<i id="move-panel-down" class="fa fa-arrow-down reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Move down"></i>`,
            );
        },
      },
      { key: 'dashboardName', label: 'Dashboard', cellClass: 'col-md-2' },
      { key: 'panel.title', label: 'Metric', cellClass: 'col-md-3' },
      {
        key: 'panel.annotation',
        label: 'Default annotation',
        cellClass: 'col-md-6',
      },
      {
        key: '_id',
        label: '',
        isVisible: Template.instance().isAdmin,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="edit-auto-config-report-panel" class="fa fa-pencil" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Edit report panel"></i>`,
          );
        },
      },

      {
        key: '_id',
        label: '',
        isVisible: Template.instance().isAdmin,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="delete-auto-config-report-panel" class="fa fa-trash" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete report panel"></i>`,
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
      noDataTmpl: Template.noReportPanels,
    };
  },
});

Template.autoconfigReportPanels.events({
  'click .reactive-table.auto-config-report-panels tbody tr'(event) {
    let currentIndex;
    const afAtts = {};
    switch (event.target.id) {
      case 'delete-auto-config-report-panel':
        swal({
          title: 'Delete report panel',
          text: 'Are you sure?',
          icon: 'warning',
          buttons: ['Cancel', 'OK'],
          dangerMode: true,
        }).then((willDelete) => {
          //bound to the current `this`
          if (willDelete) {
            Meteor.call('deleteGenericReportPanel', this, (err, result) => {
              if (result.error) {
                window.toastr.clear();
                window.toastr['error'](JSON.stringify(result.error), 'Error');
              } else {
                window.toastr.clear();
                window.toastr['success']('Done!', 'Deleted report panel!');
              }
            });

            swal.close();
          } else {
            swal.close();
          }
        });

        break;

      case 'edit-auto-config-report-panel':
        afAtts['type'] = 'method-update';
        afAtts['meteormethod'] = 'updateGenericReportPanel';
        afAtts['id'] = 'editGenericReportPanels';
        afAtts['schema'] = 'GenericReportPanelsSchema';
        afAtts['collection'] = 'GenericReportPanels';
        afAtts['buttonContent'] = 'Update';
        afAtts['backdrop'] = 'static';

        AutoForm.addHooks(afAtts['id'], {
          onSuccess: function () {
            // noinspection JSCheckFunctionSignatures
            Modal.hide('afModalWindow');
          },
        }, false);

        Modal.show('afModalWindow', {
          title: 'Update report panel',
          dialogClass: '',
          afAtts: afAtts,
          operation: 'update',
          collection: 'GenericReportPanels',
          doc: this,
          backdrop: afAtts['backdrop'],
        });

        break;

      case 'move-panel-up':
        currentIndex = this.index;

        /* first set temp index*/
        Meteor.call(
          'updateGenericReportPanelsByIndex',
          currentIndex - 1,
          9999,
          this.profile,
        );

        /* first set temp index*/
        Meteor.call(
          'updateGenericReportPanelsByIndex',
          currentIndex,
          currentIndex - 1,
          this.profile,
        );

        /* first set temp index*/
        Meteor.call(
          'updateGenericReportPanelsByIndex',
          9999,
          currentIndex,
          this.profile,
        );

        break;

      case 'move-panel-down':
        currentIndex = this.index;

        /* first set temp index*/
        Meteor.call(
          'updateGenericReportPanelsByIndex',
          currentIndex + 1,
          9999,
          this.profile,
        );

        /* first set temp index*/
        Meteor.call(
          'updateGenericReportPanelsByIndex',
          currentIndex,
          currentIndex + 1,
          this.profile,
        );

        /* first set temp index*/
        Meteor.call(
          'updateGenericReportPanelsByIndex',
          9999,
          currentIndex,
          this.profile,
        );

        break;
    }
  },
});
