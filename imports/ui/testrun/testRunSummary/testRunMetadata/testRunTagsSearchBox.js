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

import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Meteor } from 'meteor/meteor';
import { $ } from 'meteor/jquery';
import { log } from '/both/logger';
import './testRunTagsSearchBox.html';
import { getTestRun } from '/imports/helpers/utils';
import { Applications } from '/imports/collections/applications';
import { ReactiveVar } from 'meteor/reactive-var';

Template.testRunTagsSearchBox.onRendered(function () {
  const self = this.data;

  // Enable select2
  $('.select2-dropdown#test-run-tags')
    .select2({
      placeholder: 'Select or add tag',
      allowClear: true,
      multiple: true,
      tags: true,
    })
    .on('change', function () {
      const queryParams = {};

      if (!$('.select2-dropdown#test-run-tags').val()) {
        Meteor.setTimeout(() => {
          Session.set('tags', undefined);
          queryParams['tags'] = null;

          if (Session.get('team')) queryParams['team'] = Session.get('team');
          if (Session.get('application'))
            queryParams['systemUnderTest'] = Session.get('application');
          if (Session.get('testEnvironment'))
            queryParams['testEnvironment'] = Session.get('testEnvironment');
          if (Session.get('testType'))
            queryParams['workload'] = Session.get('testType');

          Session.set('current-page', 0);
          Session.set('rows-per-page', 10);
          Session.set('reset-table', true);

          FlowRouter.withReplaceState(function () {
            FlowRouter.setQueryParams(queryParams);
          });
        }, 100);
      } else {
        if ($('.select2-dropdown#test-run-tags').val()) {
          Meteor.setTimeout(() => {
            Session.set('tags', $('.select2-dropdown#test-run-tags').val());

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

  $('.select2-dropdown#test-run-tags').on(
    'select2:unselecting',
    function (evt) {
      if (!evt.params.args.originalEvent) return;
      evt.params.args.originalEvent.stopPropagation();
    },
  );

  if (self.view === 'testRunInformation') {
    Meteor.setTimeout(() => {
      const testRun = getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        FlowRouter.current().params.testRunId,
      );
      if (testRun && testRun.tags) {
        $('.select2-dropdown#test-run-tags')
          .val(testRun.tags)
          .trigger('change');
        // $('.select2-dropdown#test-run-tags > option').prop('selected', true).trigger('change');
      }
    }, 500);
  } else {
    Meteor.setTimeout(() => {
      if (Session.get('tags')) {
        $('.select2-dropdown#test-run-tags')
          .val(Session.get('tags'))
          .trigger('change');
      }
    }, 500);
  }
});

Template.testRunTagsSearchBox.onCreated(function () {
  // let query =  {
  //     $and: [
  //         {application: Session.get('application') },
  //         {testEnvironment: Session.get('testEnvironment') },
  //         {testType: Session.get('testType') }
  //     ]
  // };

  // Meteor.subscribe('testRuns', 'testRunTagsSearchBox', 50,  query);
  Meteor.subscribe('applications');

  this.results = new ReactiveVar([]);

  const templateInstance = this;

  this.autorun(() => {
    FlowRouter.watchPathChange();

    if (this.data.view === 'reportList') {
      const applicationName = FlowRouter.current().queryParams.systemUnderTest;

      let applications;

      if (applicationName) {
        applications = Applications.find({ name: applicationName }).fetch();
      } else {
        // if(this.data.view === 'reportList'){
        applications = Applications.find({}).fetch();
      }

      const tags = [];

      applications.forEach((application) => {
        application.testEnvironments.forEach((testEnvironment) => {
          testEnvironment.testTypes.forEach((testType) => {
            testType.tags.forEach((tag) => {
              if (tags.indexOf(tag) === -1) tags.push(tag);
            });
          });
        });
      });

      templateInstance.results.set(tags);
    } else {
      Meteor.setTimeout(() => {
        if (!Session.get('tags'))
          $('.select2-dropdown#test-run-tags').val('').trigger('change');

        const additionalQueryItems = [];

        if (Session.get('application'))
          additionalQueryItems.push({
            queryField: 'application',
            query: Session.get('application'),
          });
        if (Session.get('testEnvironment'))
          additionalQueryItems.push({
            queryField: 'testEnvironment',
            query: Session.get('testEnvironment'),
          });
        if (Session.get('testType'))
          additionalQueryItems.push({
            queryField: 'testType',
            query: Session.get('testType'),
          });

        Meteor.call(
          'getTypeaheadValues',
          '.*',
          'tags',
          additionalQueryItems,
          (err, res) => {
            if (res.error) {
              log.error(JSON.stringify(res.error));
              return;
            }
            if (res.data.length > 0) {
              templateInstance.results.set(res.data);
            }
          },
        );
      }, 100);
    }
  });
});

Template.testRunTagsSearchBox.helpers({
  tags() {
    if (Template.instance().results.get().length > 0) {
      return Template.instance().results.get();
    }
  },
});
