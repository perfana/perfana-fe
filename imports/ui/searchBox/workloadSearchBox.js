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
import { $ } from 'meteor/jquery';
import { log } from '/both/logger';
import './workloadSearchBox.html';
import './workloadSearchBox.less';

Template.workloadSearchBox.onRendered(function () {
  // Enable select2
  $('.select2-dropdown#test-type')
    .select2({
      placeholder: 'Workload',
      allowClear: true,
    })
    .on('change', function () {
      const queryParams = {};

      if (!$('.select2-dropdown#test-type').val()) {
        Session.set('testType', undefined);
        queryParams['workload'] = null;
        Session.set('tags', undefined);
        queryParams['tags'] = null;

        if (Session.get('team')) queryParams['team'] = Session.get('team');
        if (Session.get('application'))
          queryParams['systemUnderTest'] = Session.get('application');
        if (Session.get('testEnvironment'))
          queryParams['testEnvironment'] = Session.get('testEnvironment');
        // if (Session.get('tags')) {
        //     let queryParamTags = '';
        //     Session.get('tags').forEach((tag, tagIndex) => {
        //         if(tagIndex === 0){
        //             queryParamTags += tag;
        //         } else {
        //             queryParamTags += `,${tag}`;
        //         }
        //     })
        //
        //     queryParams['tags'] = queryParamTags
        // }

        if (
          Session.get('testType') !== FlowRouter.current().queryParams.workload
        ) {
          Session.set('current-page', 0);
          Session.set('rows-per-page', 10);
          Session.set('reset-table', true);
        }

        FlowRouter.withReplaceState(function () {
          FlowRouter.setQueryParams(queryParams);
        });

        $('.select2-dropdown#test-run-tags').val('').trigger('change');
      } else {
        if ($('.select2-dropdown#test-type').val()) {
          Session.set('tags', undefined);
          queryParams['tags'] = null;
          $('.select2-dropdown#test-run-tags').val('').trigger('change');

          Meteor.setTimeout(() => {
            Session.set('testType', $('.select2-dropdown#test-type').val());

            if (
              Session.get('testType') !==
              FlowRouter.current().queryParams.workload
            ) {
              Session.set('current-page', 0);
              Session.set('rows-per-page', 10);
              Session.set('reset-table', true);
            }

            if (Session.get('team')) queryParams['team'] = Session.get('team');
            if (Session.get('application'))
              queryParams['systemUnderTest'] = Session.get('application');
            if (Session.get('testEnvironment'))
              queryParams['testEnvironment'] = Session.get('testEnvironment');
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
    if (Session.get('testType')) {
      const data = {
        id: Session.get('testType'),
        text: Session.get('testType'),
      };
      const option = new Option(data.text, data.id, true, true);
      $('.select2-dropdown#test-type').append(option); //.trigger('change');

      // manually trigger the `select2:select` event
      $('.select2-dropdown#test-type').trigger({
        type: 'select2:select',
        params: {
          data: data,
        },
      });

      this.select2Data.set(data);
    }
  }, 100);
});

Template.workloadSearchBox.onCreated(function () {
  this.results = new ReactiveVar([]);
  this.select2Data = new ReactiveVar();

  this.autorun(() => {
    // if (!Session.get('testType')) $(".select2-dropdown#test-type").val('').trigger('change');

    FlowRouter.watchPathChange();

    const additionalQueryItems = [];

    if (Session.get('testEnvironment'))
      additionalQueryItems.push({
        queryField: 'testEnvironment',
        query: Session.get('testEnvironment'),
      });
    if (Session.get('application'))
      additionalQueryItems.push({
        queryField: 'application',
        query: Session.get('application'),
      });
    if (Session.get('tags'))
      additionalQueryItems.push({
        queryField: 'tags',
        query: { $all: Session.get('tags') },
      });

    Meteor.call(
      'getTypeaheadValues',
      '.*',
      'testType',
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

Template.workloadSearchBox.helpers({
  results() {
    const testTypes = Template.instance().results.get();
    const select2Data = Template.instance().select2Data.get();

    if (select2Data && testTypes.length > 0) {
      if (testTypes.indexOf(select2Data.text) === -1) {
        $(
          `.select2-dropdown#test-type option[value='${select2Data.text}']`,
        ).remove();
      }
      return testTypes.filter((testType) => {
        return testType !== select2Data.text;
      });
    } else {
      return testTypes;
    }
  },
  testTypeSelected: function () {
    return Session.get('testType') !== undefined;
  },
});

Template.workloadSearchBox.events({});
