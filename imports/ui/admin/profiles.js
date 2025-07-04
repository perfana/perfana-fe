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
import { ReactiveVar } from 'meteor/reactive-var';

import './profiles.html';
import './profiles.less';
import { Session } from 'meteor/session';

Template.profiles.onCreated(function profilesOnCreated() {
  this.profileSelected = new ReactiveVar(false);
  this.selectedProfileName = new ReactiveVar();
  this.isAdmin = new ReactiveVar();
  Meteor.subscribe('profiles');

  const grafanaDashboardsQuery = {
    $and: [{ tags: { $in: ['perfana-template', 'Perfana-template'] } }],
  };

  Meteor.subscribe('grafanaDashboards', grafanaDashboardsQuery);

  AutoForm.addHooks(
    'addProfiles',
    {
      onSuccess: function () {
        window.toastr.clear();
        window.toastr['success']('Done!', 'Added profile!');
      },
      onError: function (formType, err) {
        window.toastr.clear();
        window.toastr['error'](err, 'Error');
      },
    },
    false,
  );
});

Template.profiles.onRendered(function profilesonRendered() {
  this.isAdmin.set(
    Roles.userHasRole(Meteor.userId(), 'admin') ||
      Roles.userHasRole(Meteor.userId(), 'super-admin'),
  );
  Session.set('profileReadOnly', false);
});
Template.profiles.helpers({
  isAdmin() {
    return Template.instance().isAdmin.get();
  },

  selectedProfileName() {
    return Template.instance().selectedProfileName.get();
  },
  profileSelected() {
    return Template.instance().profileSelected.get();
  },
  profiles() {
    return Profiles.find();
  },
  fields() {
    return [
      // {key: '_id', label: '',
      //     hidden: true,
      //     fn:  (value, object, key) =>  {
      //         if(Template.instance() && object.name === Template.instance().selectedProfileName.get()){
      //             return true
      //         } else{
      //             return false
      //         }
      //     }
      // },
      { key: 'name', label: 'Name', cellClass: 'col-md-2' },
      { key: 'description', label: 'Description', cellClass: 'col-md-3' },
      { key: 'tags', label: 'Tags', cellClass: 'col-md-3' },
      {
        key: '_id',
        label: '',
        cellClass: 'col-md-4',
        fn: (value, object) => {
          return new Spacebars.SafeString(showGoldenPathLabel(object));
        },
      },
      {
        key: '_id',
        label: '',
        isVisible: Template.instance().isAdmin,
        sortOrder: 0,
        sortDirection: 'ascending',
        hidden: () => {
          return this.readOnly === true;
        },
        fn: (value, object) => {
          return new Spacebars.SafeString(showDeleteButton(object));
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
      noDataTmpl: Template.noProfiles,
    };
  },
  rowClass() {
    if (Template.instance().selectedProfileName.get()) {
      return function (item) {
        if (item.name === this.templateData.selectedProfileName) {
          return 'profile-selected';
        }
      };
    }
  },
});

Template.profiles.events({
  'click .reactive-table.auto-config-profiles tbody tr'(event) {
    switch (event.target.id) {
      case 'delete-profile':
        swal({
          title: 'Delete profile',
          text: 'This will remove all dashboards, service level indicators and report panels linked to this profile. Are you sure?',
          icon: 'warning',
          buttons: ['Cancel', 'OK'],
          dangerMode: true,
        }).then((willDelete) => {
          //bound to the current `this`
          if (willDelete) {
            Meteor.call('deleteProfile', this, (err, result) => {
              if (result.error) {
                window.toastr.clear();
                window.toastr['error'](JSON.stringify(result.error), 'Error');
              } else {
                window.toastr.clear();
                window.toastr['success']('Done!', 'Deleted team!');
              }

              swal.close();
            });
          } else {
            swal.close();
          }
        });

        break;

      default:
        Template.instance().profileSelected.set(true);
        Template.instance().selectedProfileName.set(this.name);
        Session.set('profileName', this.name);
        Session.set(
          'profileReadOnly',
          this.readOnly ? this.readOnly === true : false,
        );

        break;
    }
  },
});

export const showDeleteButton = (object) => {
  let HTML = `<i id="delete-profile" class="fa fa-trash" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete profile"></i>`;

  if (object.readOnly && object.readOnly === true) {
    //HTML = `<!--<i id="duplicate-profile" class="fa fa-clone" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Duplicate profile"></i>-->`
    //HTML ='<div><span style="background-color: gold; color: black;" class="label label-default pull">GOLDEN PATH</span></div>';
    HTML = '<div></div>';
  }

  return new Spacebars.SafeString(HTML);
};

export const showGoldenPathLabel = (object) => {
  let HTML = '<div></div>';

  if (object.readOnly && object.readOnly === true) {
    HTML =
      '<div><span style="background-color: gold; color: black;" class="label label-default">GOLDEN PATH</span></div>';
  }

  return new Spacebars.SafeString(HTML);
};
