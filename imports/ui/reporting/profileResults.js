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
import { Grafanas } from '../../collections/grafanas';
import { Session } from 'meteor/session';

import './profileResults.html';
import { GenericChecks } from '../../collections/genericChecks';
import _ from 'lodash';

Template.profileResults.onCreated(function profilesOnCreated() {
  this.profileSelected = new ReactiveVar(false);
  this.selectedProfileName = new ReactiveVar();
  this.profileApplications = new ReactiveVar();
  this.activeHref = new ReactiveVar('#overall');

  Meteor.subscribe('profiles');
  Meteor.subscribe('genericChecks');

  this.autorun(() => {
    if (Session.get('profileName')) {
      Meteor.call(
        'getDistinctApplicationsForProfile',
        Session.get('profileName'),
        (err, profileApplications) => {
          this.profileApplications.set(profileApplications.data);
        },
      );
    }
  });
});

Template.profileResults.helpers({
  profileApplications() {
    return Template.instance().profileApplications.get();
  },
  tabActive(href) {
    return Template.instance().activeHref.get() === href;
  },
  perApplicationUrl() {
    return renderProfileResultUrl(
      Template.instance().selectedProfileName.get(),
      Session.get('period'),
      'perfana-check-results-per-sut',
      'pf-check-results-sut',
      Session.get('reportApplication'),
      Session.get('reportTeam'),
    );
  },
  perTeamUrl() {
    return renderProfileResultUrl(
      Template.instance().selectedProfileName.get(),
      Session.get('period'),
      'perfana-check-results-per-team',
      'pf-check-results-team',
      Session.get('reportApplication'),
      Session.get('reportTeam'),
    );
  },
  overAllUrl() {
    return renderProfileResultUrl(
      Template.instance().selectedProfileName.get(),
      Session.get('period'),
      'perfana-check-results',
      'pf-check-results',
      Session.get('reportApplication'),
      Session.get('reportTeam'),
    );
  },
  periodSelected() {
    return Session.get('period') !== undefined;
  },
  selectedProfile() {
    return (
      Session.get('profileName') ===
      Template.instance().selectedProfileName.get()
    );
  },

  selectedProfileName() {
    return Template.instance().selectedProfileName.get();
  },
  profileSelected() {
    return Template.instance().profileSelected.get();
  },
  profiles() {
    const genericChecks = GenericChecks.find().fetch();
    const genericCheckProfiles = _.uniq(
      genericChecks.map((genericCheck) => {
        return genericCheck.profile;
      }),
    );
    return Profiles.find({
      name: { $in: genericCheckProfiles },
    });
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
      { key: 'tags', label: 'Tags', cellClass: 'col-md-6' },
      // { key: '_id', label: '',
      //     isVisible: Template.instance().showIcons,
      //     fn: (value, object, key) =>  {
      //         return new Spacebars.SafeString(`<i id="edit-profile" class="fa fa-pencil" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Edit profile"></i>`);
      //     }
      // },
      //
      // {key: '_id', label: '',
      //     isVisible: Template.instance().showIcons,
      //     fn: (value, object, key) =>  {
      //         return new Spacebars.SafeString(`<i id="delete-profile" class="fa fa-trash" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete profile"></i>`);
      //     }
      // },
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

Template.profileResults.events({
  'click .reactive-table.auto-config-profiles tbody tr'(event) {
    const afAtts = {};
    switch (event.target.id) {
      case 'delete-profile':
        swal({
          title: 'Delete profile',
          text: 'Are you sure?',
          icon: 'warning',
          buttons: ['Cancel', 'OK'],
          dangerMode: true,
        }).then((willDelete) => {
          //bound to the current `this`
          if (willDelete) {
            Meteor.call('deleteProfile', this._id);
            swal.close();
          } else {
            swal.close();
          }
        });

        break;

      case 'edit-profile':
        afAtts['type'] = 'update';
        afAtts['id'] = 'editProfiles';
        afAtts['type'] = 'update';
        afAtts['schema'] = 'ProfilesSchema';
        afAtts['collection'] = 'Profiles';
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
          title: 'Update profile',
          dialogClass: '',
          afAtts: afAtts,
          operation: afAtts['type'],
          collection: 'Profiles',
          doc: this._id,
          backdrop: afAtts['backdrop'],
        });

        break;

      default:
        Template.instance().profileSelected.set(true);
        Template.instance().selectedProfileName.set(this.name);
        Session.set('profileName', undefined);
        Session.set('reportApplication', undefined);
        Session.set('reportTeam', undefined);
        Meteor.setTimeout(() => {
          Session.set('profileName', this.name);
        }, 100);
        break;
    }
  },

  'click .nav-tabs  a'(event, template) {
    event.preventDefault();
    // $(this).tab('show');
    template.activeHref.set(event.currentTarget.getAttribute('href'));
  },
});

const renderProfileResultUrl = (
  profileName,
  period,
  dashboardSlug,
  dashboardUid,
  applications,
  teams,
) => {
  let applicationVars = '';

  if (applications) {
    applications.forEach((application) => {
      applicationVars += `&var-systemUnderTest=${application}`;
    });
  }

  let teamVars = '';

  if (teams) {
    teams.forEach((team) => {
      teamVars += `&var-team=${team}`;
    });
  }

  const grafana = Grafanas.findOne({ trendsInstance: true });

  const theme =
    Meteor.user().profile.theme ? Meteor.user().profile.theme : 'light';

  const result = `/d/${dashboardUid}/${dashboardSlug}?orgId=1&var-profileName=${profileName}${applicationVars}${teamVars}&var-requirementLabel=All&fullscreen${period}&kiosk&theme=${theme}`;

  return grafana.clientUrl + encodeURI(result);
};
