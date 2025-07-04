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
import { Teams } from '../../collections/teams';
import { Applications } from '../../collections/applications';
import { ReactiveVar } from 'meteor/reactive-var';

import './teamSuts.html';
import { Session } from 'meteor/session';

Template.teamSuts.onCreated(function teamSutsOnCreated() {
  this.isAdmin = new ReactiveVar();
  Meteor.subscribe('applications');
  Meteor.subscribe('teams');

  Session.set('teamName', this.data.teamName);
});

Template.teamSuts.onRendered(function teamSutsOnRendered() {
  this.isAdmin.set(
    Roles.userHasRole(Meteor.userId(), 'admin') ||
      Roles.userHasRole(Meteor.userId(), 'super-admin'),
  );
});

Template.teamSuts.helpers({
  isAdmin() {
    return Template.instance().isAdmin.get();
  },
  newTeamSuts() {
    const team = Teams.findOne({ name: Session.get('teamName') });
    if (team) {
      return Applications.find({ team: { $ne: team._id } }).fetch().length > 0;
    }
  },
  teamSuts() {
    const team = Teams.findOne({ name: Session.get('teamName') });
    if (team) {
      return Applications.find({ team: team._id });
    }
  },
  fields() {
    return [
      // {key: 'grafana', label: 'Grafana instance'},
      { key: 'name', label: 'Name', cellClass: 'col-md-11' },
      // { key: '_id', label: '',
      //     isVisible: Template.instance().showIcons,
      //     fn: (value, object, key) =>  {
      //         return new Spacebars.SafeString(`<i id="edit-auto-config-dashboard" class="fa fa-pencil" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Edit dashboard"></i>`);
      //     }
      // },

      {
        key: '_id',
        label: '',
        isVisible: Template.instance().isAdmin,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="delete-team-sut" class="fa fa-trash" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete SUT"></i>`,
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
      noDataTmpl: Template.noTeamSuts,
    };
  },
});

Template.teamSuts.events({
  'click .reactive-table.team-suts tbody tr'(event, _template) {
    const afAtts = {};
    switch (event.target.id) {
      case 'delete-team-sut':
        swal({
          title: 'Remove system under test from team',
          text: 'Are you sure?',
          icon: 'warning',
          buttons: ['Cancel', 'OK'],
          dangerMode: true,
        }).then((willDelete) => {
          //bound to the current `this`
          if (willDelete) {
            Meteor.call(
              'removeTeamSut',
              Session.get('teamName'),
              this._id,
              () => {
                // trigger reload
                const teamName = Session.get('teamName');
                Session.set('teamName', undefined);
                Session.set('teamName', teamName);
              },
            );
            swal.close();
          } else {
            swal.close();
          }
        });

        break;

      case 'edit-auto-config-dashboard':
        afAtts['type'] = 'update';
        afAtts['id'] = 'editAutoConfigGrafanaDashboards';
        afAtts['type'] = 'update';
        afAtts['schema'] = 'AutoConfigGrafanaDashboardsSchema';
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
          operation: afAtts['type'],
          collection: 'AutoConfigGrafanaDashboards',
          doc: this._id,
          backdrop: afAtts['backdrop'],
        });

        break;
    }
  },
});
