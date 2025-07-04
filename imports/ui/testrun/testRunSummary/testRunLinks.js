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

/* eslint-disable no-useless-escape */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { getTestRun } from '../../../helpers/utils';
import { log } from '/both/logger';
import './testRunLinks.html';

Template.testRunLinks.onCreated(function testRunLinksOnCreated() {
  this.deepLinks = new ReactiveVar([]);

  Meteor.subscribe('deepLinks');
});

Template.testRunLinks.onRendered(function testRunLinksOnRendered() {
  this.autorun(() => {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      Meteor.call(
        'getDeepLinks',
        Session.get('application'),
        Session.get('testEnvironment'),
        Session.get('testType'),
        testRun,
        (err, deepLinks) => {
          if (deepLinks.error) {
            log.error(JSON.stringify(deepLinks.error));
          } else {
            this.deepLinks.set(deepLinks.data);
          }
        },
      );
    }
  });
});

Template.testRunLinks.helpers({
  validUrl(url) {
    return url.indexOf('{') === -1 && url.indexOf('}') === -1;
  },
  links() {
    if (Template.instance().deepLinks.get()) {
      const deepLinks = Template.instance().deepLinks.get();

      const variablePattern = new RegExp('\{[^\}]+\}', 'g');

      deepLinks.forEach((deepLink, index) => {
        const matches = deepLink.url.match(variablePattern);

        if (matches) {
          deepLinks[index].name =
            deepLinks[index].name +
            ' url cannot be rendered, variables are missing: ';

          matches.forEach((match, i) => {
            if (i === 0) {
              deepLinks[index].name += match;
            } else {
              deepLinks[index].name += ', ' + match;
            }
          });
        }
      });

      return deepLinks;
    }
  },
});
