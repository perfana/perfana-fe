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

/* eslint-disable quotes */
// noinspection JSJQueryEfficiency

import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Meteor } from 'meteor/meteor';
import { Applications } from '../../collections/applications';
import { $ } from 'meteor/jquery';

import './reportApplicationSearchBox.html';
import { dynamicSort } from '../../helpers/utils';

Template.reportApplicationSearchBox.onRendered(function () {
  // Enable select2
  $('.select2-dropdown#report-application')
    .select2({
      placeholder: 'System under test',
      allowClear: true,
      multiple: true,
    })
    .on('change', function () {
      Session.set(
        'reportApplication',
        $('.select2-dropdown#report-application').val(),
      );
    });

  $('.select2-dropdown#report-application').on(
    'select2:unselecting',
    function (evt) {
      if (!evt.params.args.originalEvent) return;
      evt.params.args.originalEvent.stopPropagation();
    },
  );

  Meteor.setTimeout(() => {
    const user = Meteor.user();
    let applications;

    if (user) {
      if (user.profile.memberOf.teams.length > 0) {
        applications = Applications.find({
          team: { $in: user.profile.memberOf.teams },
        })
          .fetch()
          .map((application) => application.name);
        $(
          ".select2-dropdown#report-application > option[value='" +
            applications.join("'],[value='") +
            "']",
        )
          .prop('selected', true)
          .trigger('change');
      } else {
        // $(".select2-dropdown#report-application > option").prop('selected',true).trigger('change');
      }
    }
  }, 200);
});

Template.reportApplicationSearchBox.onCreated(function () {
  this.results = new ReactiveVar([]);
  this.select2Data = new ReactiveVar();
  this.query = new ReactiveVar('.*');

  Meteor.subscribe('teams');
  Meteor.subscribe('applications');

  // this.autorun(() => {
  //
  //     let applications;

  // if(Session.get('team') && Session.get('team') !== null){
  //
  //     let applicationTeam = Teams.findOne({ name: Session.get('team')});
  //
  //     if(applicationTeam){
  //
  //         let applications =  Applications.find({ $and: [
  //                 {team: applicationTeam._id},
  //             ]
  //         }, {sort:{ name}});
  //
  //         if(applications.fetch().length >0) this.results.set(applications.fetch());
  //
  //     }
  //
  // } else {
  //
  //     applications = Applications.find({ name: {$regex: new RegExp(this.query.get(),'ig')}}, {sort:{ name}});
  //
  //     if(applications && applications.fetch().length >0) this.results.set(applications.fetch());
  //
  // }

  // });
});

Template.reportApplicationSearchBox.helpers({
  results() {
    return Applications.find({
      name: {
        $in: this.profileApplications,
      },
    })
      .fetch()
      .sort(dynamicSort('name'));
  },
  applicationSelected: function () {
    return Session.get('reportApplication') !== undefined;
  },
});

Template.reportApplicationSearchBox.events({});
