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
import './testRunConfigTagsSearchBox.html';
import _ from 'lodash';

Template.testRunConfigTagsSearchBox.onCreated(
  function testRunConfigTagsSearchBoxOnCreated() {
    this.testRunConfigTags = new ReactiveVar([]);

    const query = {
      $and: [
        { application: Session.get('application') },
        { testEnvironment: Session.get('testEnvironment') },
        { testType: Session.get('testType') },
      ],
    };

    Meteor.subscribe('testRuns', 'testRunConfigTagsSearchBox', 50, query);

    const testRunConfigQuery = {
      $and: [
        { application: FlowRouter.current().queryParams.systemUnderTest },
        { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
        { testType: FlowRouter.current().queryParams.workload },
        { testRunId: FlowRouter.current().params.testRunId },
      ],
    };

    Meteor.call(
      'getTestRunConfig',
      testRunConfigQuery,
      (err, testRunConfigs) => {
        if (testRunConfigs.error) {
          log.error(JSON.stringify(testRunConfigs.error));
        } else {
          const tags = [];
          testRunConfigs.data.forEach((item) => {
            if (item.tags) {
              item.tags.forEach((tag) => {
                tags.push(tag);
              });
            }
          });

          Meteor.setTimeout(() => {
            this.testRunConfigTags.set(_.uniq(tags));
          }, 100);
        }
      },
    );
  },
);

Template.testRunConfigTagsSearchBox.onRendered(
  function testRunConfigTagsSearchBoxOnRendered() {
    const self = this.data;

    // Enable select2
    $('.select2-dropdown#test-run-tags')
      .select2({
        placeholder: 'Filter on tag(s)',
        allowClear: true,
        multiple: true,
        tags: true,
      })
      .on('change', function () {
        if (!$('.select2-dropdown#test-run-tags').val()) {
          self.selectedTestRunConfigTags.set(undefined);
        } else {
          self.selectedTestRunConfigTags.set(
            $('.select2-dropdown#test-run-tags').val(),
          );
        }
      });

    $('.select2-dropdown#test-run-tags').on(
      'select2:unselecting',
      function (evt) {
        if (!evt.params.args.originalEvent) return;
        evt.params.args.originalEvent.stopPropagation();
      },
    );

    Meteor.setTimeout(() => {
      if (Session.get('tags')) {
        $('.select2-dropdown#test-run-tags')
          .val(Session.get('tags'))
          .trigger('change');
      }
    }, 100);
  },
);

Template.testRunConfigTagsSearchBox.helpers({
  tags() {
    return (
      Template.instance().testRunConfigTags &&
      Template.instance().testRunConfigTags.get()
    );
  },
});
