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
import { ReactiveDict } from 'meteor/reactive-dict';
import { formatDate } from '../../../helpers/utils';

import './applicationReleases.html';

import { TestRuns } from '../../../collections/testruns';
import _ from 'lodash';

Template.applicationReleases.onCreated(function () {
  this.state = new ReactiveDict();
  Meteor.subscribe('applicationTestRuns', Session.get('application'));
});

Template.applicationReleases.helpers({
  applicationReleases() {
    const applicationTestRuns = TestRuns.find(
      {
        application: this.application,
      },
      { sort: { end: -1 } },
    ).fetch();

    if (applicationTestRuns) {
      const applicationReleases = [];

      _.each(applicationTestRuns, (testRun) => {
        if (
          _.has(testRun, 'reportAnnotations') &&
          testRun.reportAnnotations.length > 0
        ) {
          const releaseIndex = applicationReleases
            .map((applicationRelease) => applicationRelease.applicationRelease)
            .indexOf(testRun.applicationRelease);

          if (releaseIndex === -1) {
            applicationReleases.push({
              application: testRun.application,
              applicationRelease: testRun.applicationRelease,
              lastTestRunEnded: testRun.end,
            });
          }
        }
      });

      return applicationReleases;
    }
  },
  fields() {
    return [
      { key: 'application', label: 'Application' },
      { key: 'applicationRelease', label: 'Release' },
      {
        key: 'lastTestRunEnded',
        hidden: true,
        sortOrder: 0,
        sortDirection: 'descending',
      }, //hidden column to sort unformatted date
      {
        key: 'lastTestRunEnded',
        label: 'Last test run ended',
        fn: (value) => {
          return formatDate(value);
        },
      },
    ];
  },
  settings() {
    return {
      rowsPerPage: 20,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      noDataTmpl: Template.noReleases,
    };
  },
});

Template.applicationReleases.events({
  'click .reactive-table tbody tr'(event) {
    if (event.target.id === 'delete-reports-for-release') {
      swal({
        title: 'Delete release reports',
        text: 'This will delete all test run reports for this release. Are you sure?',
        icon: 'warning',
        buttons: ['Cancel', 'OK'],
        dangerMode: true,
      }).then((willDelete) => {
        //bound to the current `this`
        if (willDelete) {
          Meteor.call('deleteBenchmark');
          swal.close();
        } else {
          swal.close();
        }
      });
    } else {
      const queryParams = {
        systemUnderTest: this.application,
        release: this.applicationRelease,
      };

      FlowRouter.go('releases', null, queryParams);
    }
  },
});
