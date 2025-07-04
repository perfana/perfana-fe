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

import './versionSearchBox.html';

Template.versionSearchBox.onRendered(function () {
  // Enable select2
  $('.select2-dropdown#version')
    .select2({
      placeholder: 'Version',
      allowClear: true,
    })
    .on('change', function () {
      const queryParams = {};

      if (!$('.select2-dropdown#version').val()) {
        Session.set('version', undefined);

        if (Session.get('testType'))
          queryParams['workload'] = Session.get('testType');
        if (Session.get('application'))
          queryParams['systemUnderTest'] = Session.get('application');
        if (Session.get('testEnvironment'))
          queryParams['testEnvironment'] = Session.get('testEnvironment');

        queryParams['version'] = null;

        FlowRouter.withReplaceState(function () {
          FlowRouter.setQueryParams(queryParams);
        });
      } else {
        Session.set('version', $('.select2-dropdown#version').val());
      }

      if ($('.select2-dropdown#version').val()) {
        if (Session.get('application'))
          queryParams['systemUnderTest'] = Session.get('application');
        if (Session.get('testEnvironment'))
          queryParams['testEnvironment'] = Session.get('testEnvironment');
        if (Session.get('testType'))
          queryParams['workload'] = Session.get('testType');
        if (Session.get('version'))
          queryParams['version'] = Session.get('version');

        // FlowRouter.go('reports', null, queryParams)

        FlowRouter.withReplaceState(function () {
          FlowRouter.setQueryParams(queryParams);
        });
      }
    });

  Meteor.setTimeout(() => {
    if (Session.get('version')) {
      const data = {
        id: Session.get('version'),
        text: Session.get('version'),
      };
      const option = new Option(data.text, data.id, true, true);
      $('.select2-dropdown#version').append(option); //.trigger('change');

      // manually trigger the `select2:select` event
      $('.select2-dropdown#version').trigger({
        type: 'select2:select',
        params: {
          data: data,
        },
      });

      this.select2Data.set(data);
    }
  }, 100);
});

Template.versionSearchBox.onCreated(function () {
  this.results = new ReactiveVar([]);
  this.select2Data = new ReactiveVar();

  this.autorun(() => {
    const additionalQueryItems = [];

    if (Session.get('testType'))
      additionalQueryItems.push({
        queryField: 'testType',
        query: Session.get('testType'),
      });
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

    Meteor.call(
      'getTypeaheadValues',
      '.*',
      'applicationRelease',
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

Template.versionSearchBox.helpers({
  results() {
    const versions = Template.instance().results.get();
    const select2Data = Template.instance().select2Data.get();

    if (select2Data && versions.length > 0) {
      return versions.filter((version) => {
        return version !== select2Data.text;
      });
    } else {
      return versions;
    }
  },
  versionSelected: function () {
    return Session.get('version') !== undefined;
  },
});

Template.versionSearchBox.events({});
