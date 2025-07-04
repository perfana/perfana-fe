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

// noinspection JSJQueryEfficiency

import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Meteor } from 'meteor/meteor';
import { Applications } from '../../collections/applications';
import { Teams } from '../../collections/teams';
import { $ } from 'meteor/jquery';
import { log } from '/both/logger';

import './applicationSearchBox.html';
import './applicationSearchBox.less';

Template.applicationSearchBox.onRendered(function () {
  // Enable select2
  $('.select2-dropdown#application')
    .select2({
      placeholder: 'System under test',
      allowClear: true,
    })
    .on('change', function () {
      const queryParams = {};

      if (!$('.select2-dropdown#application').val()) {
        // $("#test-type").find('option:not(:first)').remove().trigger('change');
        // $("#test-environment").find('option:not(:first)').remove().trigger('change');

        Meteor.setTimeout(() => {
          Session.set('application', undefined);
          queryParams['systemUnderTest'] = null;
          Session.set('testEnvironment', undefined);
          queryParams['testEnvironment'] = null;
          Session.set('testType', undefined);
          queryParams['workload'] = null;
          Session.set('tags', undefined);
          queryParams['tags'] = null;

          if (Session.get('team')) queryParams['team'] = Session.get('team');

          // FlowRouter.go('testRuns', null, queryParams)
          FlowRouter.withReplaceState(function () {
            FlowRouter.setQueryParams(queryParams);
          });

          $('.select2-dropdown#test-environment').val('').trigger('change');
          $('.select2-dropdown#test-type').val('').trigger('change');
          $('.select2-dropdown#test-run-tags').val('').trigger('change');
        }, 100);
      } else {
        if ($('.select2-dropdown#application').val()) {
          Session.set('testEnvironment', undefined);
          queryParams['testEnvironment'] = null;
          Session.set('testType', undefined);
          queryParams['workload'] = null;
          Session.set('tags', undefined);
          queryParams['tags'] = null;

          $('.select2-dropdown#test-environment').val('').trigger('change');
          $('.select2-dropdown#test-type').val('').trigger('change');
          $('.select2-dropdown#test-run-tags').val('').trigger('change');

          Meteor.setTimeout(() => {
            Session.set(
              'application',
              $('.select2-dropdown#application').val(),
            );

            if (
              Session.get('application') !==
              FlowRouter.current().queryParams.systemUnderTest
            ) {
              Session.set('current-page', 0);
              Session.set('rows-per-page', 10);
              Session.set('reset-table', true);
            }

            if (Session.get('team')) queryParams['team'] = Session.get('team');
            if (Session.get('application')) {
              queryParams['systemUnderTest'] = Session.get('application');
              const singleTestEnvironment = getSingleTestEnvironment(
                Session.get('application'),
              );
              if (singleTestEnvironment) {
                Session.set('testEnvironment', singleTestEnvironment);
                queryParams['testEnvironment'] = singleTestEnvironment;
                $('.select2-dropdown#test-environment')
                  .val(singleTestEnvironment)
                  .trigger('change');
                const singleTestType = getSingleTestType(
                  Session.get('application'),
                  singleTestEnvironment,
                );
                if (singleTestType) {
                  Session.set('testType', singleTestType);
                  queryParams['workload'] = singleTestType;
                  $('.select2-dropdown#test-type')
                    .val(singleTestType)
                    .trigger('change');
                }
              }
            }

            // FlowRouter.go('testRuns', null, queryParams)
            FlowRouter.withReplaceState(function () {
              FlowRouter.setQueryParams(queryParams);
            });
          }, 100);
        }
      }
    });

  Meteor.setTimeout(() => {
    if (Session.get('application')) {
      const data = {
        id: Session.get('application'),
        text: Session.get('application'),
      };
      const option = new Option(data.text, data.id, true, true);
      $('.select2-dropdown#application').append(option); //.trigger('change');

      // manually trigger the `select2:select` event
      $('.select2-dropdown#application').trigger({
        type: 'select2:select',
        params: {
          data: data,
        },
      });
      this.select2Data.set(data);
    }
  }, 100);
});

const getSingleTestEnvironment = (applicationName) => {
  const application = Applications.findOne({
    name: applicationName,
  });

  if (application) {
    if (application.testEnvironments.length === 1) {
      return application.testEnvironments[0].name;
    } else {
      return undefined;
    }
  }
};

const getSingleTestType = (applicationName, testEnvironmentName) => {
  const application = Applications.findOne({
    name: applicationName,
  });

  if (application) {
    const testEnvironmentIndex = application.testEnvironments
      .map((testEnvironment) => testEnvironment.name)
      .indexOf(testEnvironmentName);

    if (
      application.testEnvironments[testEnvironmentIndex].testTypes.length === 1
    ) {
      return application.testEnvironments[testEnvironmentIndex].testTypes[0]
        .name;
    } else {
      return undefined;
    }
  }
};

Template.applicationSearchBox.onCreated(function () {
  this.results = new ReactiveVar([]);
  this.select2Data = new ReactiveVar();
  this.query = new ReactiveVar('.*');

  Meteor.subscribe('teams');
  Meteor.subscribe('applications');

  this.autorun(() => {
    // let applications;
    //
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
    //         if(applications.fetch().length >0) {
    //
    //             this.results.set(applications.fetch().map(application => {
    //                 return application.name;
    //             }));
    //         }
    //
    //
    //     }
    //
    // } else {

    // if (!Session.get('application')) $(".select2-dropdown#application").val('').trigger('change');

    FlowRouter.watchPathChange();

    const additionalQueryItems = [];

    if (Session.get('team')) {
      const team = Teams.findOne({ name: Session.get('team') });

      if (team) {
        Meteor.call(
          'getTypeaheadValues',
          team._id,
          'team',
          additionalQueryItems,
          (err, res) => {
            if (res.error) {
              log.error(JSON.stringify(res.error));
              return;
            }
            if (res.length > 0) this.results.set(res);
          },
        );
      }
    } else {
      // if (Session.get('testEnvironment')) additionalQueryItems.push({
      //     queryField: 'testEnvironment',
      //     query: Session.get('testEnvironment')
      // });
      // if (Session.get('testType')) additionalQueryItems.push({
      //     queryField: 'testType',
      //     query: Session.get('testType')
      // });
      // if (Session.get('tags')) additionalQueryItems.push({
      //     queryField: 'tags',
      //     query: {$all: Session.get('tags')}
      // });

      Meteor.call(
        'getTypeaheadValues',
        '.*',
        'application',
        additionalQueryItems,
        (err, res) => {
          if (res.error) {
            log.error(JSON.stringify(res.error));
            return;
          }
          Meteor.setTimeout(() => {
            if (res.data.length > 0) this.results.set(res.data);
          }, 100);
        },
      );
    }
    // }
  });
});

Template.applicationSearchBox.helpers({
  results() {
    if (Template.instance().results.get().length > 0) {
      const applications = Template.instance().results.get();
      const select2Data = Template.instance().select2Data.get();

      if (select2Data && applications.length > 0) {
        if (applications.indexOf(select2Data.text) === -1) {
          $(
            `.select2-dropdown#applications option[value='${select2Data.text}']`,
          ).remove();
        }

        return applications.filter((application) => {
          return application !== select2Data.text;
        });
      } else {
        return applications;
      }
    }
  },
  applicationSelected: function () {
    return Session.get('application') !== undefined;
  },
});

Template.applicationSearchBox.events({});
