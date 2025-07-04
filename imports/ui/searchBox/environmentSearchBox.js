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
import { Applications } from '../../collections/applications';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { log } from '/both/logger';

import './environmentSearchBox.html';
// import './environmentSearchBox.less';

Template.environmentSearchBox.onRendered(function () {
  // Enable select2
  $('.select2-dropdown#test-environment')
    .select2({
      placeholder: 'Test environment',
      allowClear: true,
    })
    .on('change', function () {
      const queryParams = {};

      if (!$('.select2-dropdown#test-environment').val()) {
        Meteor.setTimeout(() => {
          Session.set('testEnvironment', undefined);
          queryParams['testEnvironment'] = null;
          Session.set('testType', undefined);
          queryParams['workload'] = null;
          Session.set('tags', undefined);
          queryParams['tags'] = null;

          if (Session.get('team')) queryParams['team'] = Session.get('team');
          if (Session.get('application'))
            queryParams['systemUnderTest'] = Session.get('application');
          // if (Session.get('testType')) queryParams['workload'] = Session.get('testType')
          // if (Session.get('tags')) {
          //     let queryParamTags = '';
          //     Session.get('tags').forEach((tag, tagIndex) => {
          //         if (tagIndex === 0) {
          //             queryParamTags += tag;
          //         } else {
          //             queryParamTags += `,${tag}`;
          //         }
          //     })
          //
          //     queryParams['tags'] = queryParamTags
          // }

          if (
            Session.get('testEnvironment') !==
            FlowRouter.current().queryParams.testEnvironment
          ) {
            Session.set('current-page', 0);
            Session.set('rows-per-page', 10);
            Session.set('reset-table', true);
          }

          FlowRouter.withReplaceState(function () {
            FlowRouter.setQueryParams(queryParams);
          });

          $('.select2-dropdown#test-type').val('').trigger('change');
          $('.select2-dropdown#test-run-tags').val('').trigger('change');

          // queryParams['worklo
        }, 100);
      } else {
        if ($('.select2-dropdown#test-environment').val()) {
          Session.set('testType', undefined);
          queryParams['workload'] = null;
          Session.set('tags', undefined);
          queryParams['tags'] = null;

          $('.select2-dropdown#test-type').val('').trigger('change');
          $('.select2-dropdown#test-run-tags').val('').trigger('change');

          Meteor.setTimeout(() => {
            Session.set(
              'testEnvironment',
              $('.select2-dropdown#test-environment').val(),
            );

            if (
              Session.get('testEnvironment') !==
              FlowRouter.current().queryParams.testEnvironment
            ) {
              Session.set('current-page', 0);
              Session.set('rows-per-page', 10);
              Session.set('reset-table', true);
            }

            if (Session.get('team')) queryParams['team'] = Session.get('team');
            if (Session.get('application'))
              queryParams['systemUnderTest'] = Session.get('application');
            if (Session.get('testEnvironment')) {
              queryParams['testEnvironment'] = Session.get('testEnvironment');
              const singleTestType = getSingleTestType(
                Session.get('application'),
                Session.get('testEnvironment'),
              );
              if (singleTestType) {
                Session.set('testType', singleTestType);
                queryParams['workload'] = singleTestType;
                $('.select2-dropdown#test-type')
                  .val(singleTestType)
                  .trigger('change');
              }
            }
            // if (Session.get('testEnvironment')) queryParams['testEnvironment'] = Session.get('testEnvironment')
            if (Session.get('testType'))
              queryParams['workload'] = Session.get('testType');
            if (Session.get('tags')) {
              let queryParamTags = '';
              Session.get('tags').forEach((tag, tagIndex) => {
                if (tagIndex === 0) {
                  queryParamTags += tag;
                } else {
                  queryParamTags += `,${tag}`;
                }
              });

              queryParams['tags'] = queryParamTags;
            }

            FlowRouter.withReplaceState(function () {
              FlowRouter.setQueryParams(queryParams);
            });
          }, 100);
        }
      }
    });

  Meteor.setTimeout(() => {
    if (Session.get('testEnvironment')) {
      const data = {
        id: Session.get('testEnvironment'),
        text: Session.get('testEnvironment'),
      };
      const option = new Option(data.text, data.id, false, true);
      $('.select2-dropdown#test-environment').append(option); //.trigger('change');

      // manually trigger the `select2:select` event
      $('.select2-dropdown#test-environment').trigger({
        type: 'select2:select',
        params: {
          data: data,
        },
      });

      this.select2Data.set(data);
    }
  }, 100);
});

Template.environmentSearchBox.onCreated(function () {
  this.results = new ReactiveVar([]);
  this.select2Data = new ReactiveVar();

  this.autorun(() => {
    // if (!Session.get('testEnvironment')) $(".select2-dropdown#test-environment").val('').trigger('change');

    const additionalQueryItems = [];

    if (Session.get('application'))
      additionalQueryItems.push({
        queryField: 'application',
        query: Session.get('application'),
      });
    if (Session.get('testEnvironment')) {
      const singleTestType = getSingleTestType(
        Session.get('application'),
        Session.get('testEnvironment'),
      );
      if (singleTestType) {
        Session.set('testType', singleTestType);
      }
    }
    if (Session.get('testType'))
      additionalQueryItems.push({
        queryField: 'testType',
        query: Session.get('testType'),
      });
    if (Session.get('tags'))
      additionalQueryItems.push({
        queryField: 'tags',
        query: { $all: Session.get('tags') },
      });

    Meteor.call(
      'getTypeaheadValues',
      '.*',
      'testEnvironment',
      additionalQueryItems,
      (err, res) => {
        if (res.error) {
          log.error(JSON.stringify(res.error));
          return;
        }
        if (res.data.length > 0) this.results.set(res.data);
      },
    );
  });
});

Template.environmentSearchBox.helpers({
  results() {
    const environments = Template.instance().results.get();
    const select2Data = Template.instance().select2Data.get();

    if (select2Data && environments.length > 0) {
      if (environments.indexOf(select2Data.text) === -1) {
        $(
          `.select2-dropdown#test-environment option[value='${select2Data.text}']`,
        ).remove();
      }
      return environments.filter((environment) => {
        return environment !== select2Data.text;
      });
    } else {
      return environments;
    }
  },
  testEnvironmentSelected() {
    return Session.get('testEnvironment') !== undefined;
  },
});

Template.environmentSearchBox.events({});

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
