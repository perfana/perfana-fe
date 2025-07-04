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

import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Meteor } from 'meteor/meteor';
import { Teams } from '../../collections/teams';
import { $ } from 'meteor/jquery';
import { Applications } from '../../collections/applications';

import './reportTeamSearchBox.html';
import { dynamicSort } from '../../helpers/utils';

Template.reportTeamSearchBox.onRendered(function () {
  // Enable select2
  $('.select2-dropdown#report-team')
    .select2({
      placeholder: 'Team',
      allowClear: true,
      multiple: true,
    })
    .on('change', function () {
      Session.set('reportTeam', $('.select2-dropdown#report-team').val());
    });

  $('.select2-dropdown#report-team').on('select2:unselecting', function (evt) {
    if (!evt.params.args.originalEvent) return;
    evt.params.args.originalEvent.stopPropagation();
  });

  Meteor.setTimeout(() => {
    const user = Meteor.user();

    let teams;

    if (user) {
      if (user.profile.memberOf.teams.length > 0) {
        teams = Teams.find({ _id: { $in: user.profile.memberOf.teams } })
          .fetch()
          .map((team) => team.name);
        $(
          ".select2-dropdown#report-team > option[value='" +
            teams.join("'],[value='") +
            "']",
        )
          .prop('selected', true)
          .trigger('change');
      } else {
        // $('.select2-dropdown#report-team > option').prop('selected',true).trigger('change');
      }
    }
  }, 200);
});

Template.reportTeamSearchBox.onCreated(function () {
  Meteor.subscribe('teams');
  Meteor.subscribe('applications');
});

Template.reportTeamSearchBox.helpers({
  results() {
    const teamIds = Applications.find({
      name: {
        $in: this.profileApplications,
      },
    })
      .fetch()
      .map((application) => application.team);

    return Teams.find({
      _id: {
        $in: teamIds,
      },
    })
      .fetch()
      .sort(dynamicSort('name'));
  },
  teamSelected: function () {
    return Session.get('reportTeam') !== undefined;
  },
});
