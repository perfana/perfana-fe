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
import { ReactiveVar } from 'meteor/reactive-var';
import { log } from '/both/logger';
import './testRunConfig.html';
import { Session } from 'meteor/session';
import { TestRuns } from '/imports/collections/testruns';

import {
  getFixedBaselineTestRun,
  getPreviousTestRun,
  getTestRun,
} from '/imports/helpers/utils';
import tippy from 'tippy.js';
import _ from 'lodash';

Template.testRunConfig.onCreated(function testRunConfigOnCreated() {
  // this.requestNameFilter = new ReactiveVar();
  this.testRunConfig = new ReactiveVar();
  this.testRunConfigTags = new ReactiveVar();
  this.selectedTestRunConfigTags = new ReactiveVar();
  this.testRun = new ReactiveVar();
  this.baselineTestRun = new ReactiveVar();
  this.testRunConfigActiveHref = new ReactiveVar('test-run-config');
  this.showDiffsOnly = new ReactiveVar(true);
  this.testRunConfigFilter = new ReactiveVar();

  const query = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
    ],
  };

  Meteor.subscribe('testRuns', 'testRunConfig', 50, query);

  this.autorun(() => {
    this.testRunConfigActiveHref.get(); // trigger autorun
    this.showDiffsOnly.get();
    this.testRunConfigFilter.get();
    Session.get('testRunConfigBaseline');

    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      this.testRun.set(testRun);

      const testRunConfigQuery = {
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
          { testRunId: testRun.testRunId },
        ],
      };

      if (
        this.selectedTestRunConfigTags.get() !== undefined &&
        this.selectedTestRunConfigTags.get().length > 0
      )
        testRunConfigQuery.$and.push({
          tags: { $all: this.selectedTestRunConfigTags.get() },
        });

      Meteor.call(
        'getTestRunConfig',
        testRunConfigQuery,
        (err, testRunConfigs) => {
          if (testRunConfigs.error) {
            log.error(JSON.stringify(testRunConfigs.error));
          } else {
            let testRunConfig = testRunConfigs.data;

            /* if one of the compare tabs is selected, get baseline testRunConfig */
            if (this.testRunConfigActiveHref.get() !== 'test-run-config') {
              let testRunId;

              switch (this.testRunConfigActiveHref.get()) {
                case 'compared-to-previous-test-run':
                  testRunId = getPreviousTestRun(testRun, true);
                  break;
                case 'compared-to-baseline-test-run':
                  testRunId = getFixedBaselineTestRun(testRun);
                  break;
                case 'compared-to-selected-test-run':
                  testRunId = Session.get('testRunConfigBaseline');
                  break;
              }

              const baselineTestRunConfigQuery = {
                $and: [
                  { application: testRun.application },
                  { testEnvironment: testRun.testEnvironment },
                  { testType: testRun.testType },
                  { testRunId: testRunId },
                ],
              };

              if (
                this.selectedTestRunConfigTags.get() !== undefined &&
                this.selectedTestRunConfigTags.get().length > 0
              )
                baselineTestRunConfigQuery.$and.push({
                  tags: { $all: this.selectedTestRunConfigTags.get() },
                });

              Meteor.call(
                'getTestRunConfig',
                baselineTestRunConfigQuery,
                (err, baselineTestRunConfigs) => {
                  if (baselineTestRunConfigs.error) {
                    log.error(JSON.stringify(baselineTestRunConfigs.error));
                  } else {
                    const baselineTestRunConfig = baselineTestRunConfigs.data;

                    if (baselineTestRunConfig) {
                      const tempTestRunConfig = [];

                      // get key / tags combination that exist in baseline but not in test Run

                      baselineTestRunConfig.forEach(
                        (baselineTestRunConfigItem) => {
                          const baselineKeyIndex = testRunConfig.findIndex(
                            (testRunConfigItem) =>
                              baselineTestRunConfigItem.key ===
                                testRunConfigItem.key &&
                              baselineTestRunConfigItem.tags.length ===
                                testRunConfigItem.tags.length &&
                              baselineTestRunConfigItem.tags.length ===
                                _.intersection(
                                  baselineTestRunConfigItem.tags,
                                  testRunConfigItem.tags,
                                ).length,
                          );
                          if (baselineKeyIndex === -1) {
                            baselineTestRunConfigItem.baselineValue =
                              baselineTestRunConfigItem.value;
                            baselineTestRunConfigItem.value = 'No value found';
                            tempTestRunConfig.push(baselineTestRunConfigItem);
                          }
                        },
                      );

                      // get key / tags combination that exist in test run but not in baseline

                      testRunConfig.forEach((testRunConfigItem) => {
                        const keyIndex = baselineTestRunConfig.findIndex(
                          (baselineTestRunConfigItem) =>
                            baselineTestRunConfigItem.key ===
                              testRunConfigItem.key &&
                            baselineTestRunConfigItem.tags.length ===
                              testRunConfigItem.tags.length &&
                            testRunConfigItem.tags.length ===
                              _.intersection(
                                baselineTestRunConfigItem.tags,
                                testRunConfigItem.tags,
                              ).length,
                        );

                        if (keyIndex === -1) {
                          testRunConfigItem.baselineValue = 'No value found';
                          tempTestRunConfig.push(testRunConfigItem);
                        }
                      });

                      // process keys that are in both config items

                      testRunConfig.forEach((testRunConfigItem) => {
                        baselineTestRunConfig.forEach(
                          (baselineTestRunConfigItem) => {
                            if (
                              baselineTestRunConfigItem.key ===
                                testRunConfigItem.key &&
                              baselineTestRunConfigItem.tags.length ===
                                testRunConfigItem.tags.length &&
                              baselineTestRunConfigItem.tags.length ===
                                _.intersection(
                                  baselineTestRunConfigItem.tags,
                                  testRunConfigItem.tags,
                                ).length
                            ) {
                              if (this.showDiffsOnly.get()) {
                                if (
                                  testRunConfigItem.value !==
                                  baselineTestRunConfigItem.value
                                ) {
                                  testRunConfigItem.baselineValue =
                                    baselineTestRunConfigItem.value;
                                  tempTestRunConfig.push(testRunConfigItem);
                                }
                              } else {
                                testRunConfigItem.baselineValue =
                                  baselineTestRunConfigItem.value;
                                tempTestRunConfig.push(testRunConfigItem);
                              }
                            }
                          },
                        );
                      });

                      testRunConfig = tempTestRunConfig;
                    }

                    if (testRunConfig) {
                      /* get tags */
                      const tags = [];
                      testRunConfig.forEach((item) => {
                        if (item.tags) {
                          item.tags.forEach((tag) => {
                            tags.push(tag);
                          });
                        }
                      });

                      this.testRunConfigTags.set(_.uniq(tags));
                      if (this.testRunConfigFilter.get() === undefined) {
                        this.testRunConfig.set(testRunConfig);
                      } else {
                        this.testRunConfig.set(
                          testRunConfig.filter((item) => {
                            return item.key.match(
                              this.testRunConfigFilter.get(),
                            );
                          }),
                        );
                      }
                    }
                  }
                },
              );
            } else {
              if (testRunConfig) {
                /* get tags */
                const tags = [];
                testRunConfig.forEach((item) => {
                  if (item.tags) {
                    item.tags.forEach((tag) => {
                      tags.push(tag);
                    });
                  }
                });

                this.testRunConfigTags.set(_.uniq(tags));
                if (this.testRunConfigFilter.get() === undefined) {
                  this.testRunConfig.set(testRunConfig);
                } else {
                  this.testRunConfig.set(
                    testRunConfig.filter((item) => {
                      return item.key.match(this.testRunConfigFilter.get());
                    }),
                  );
                }
              }
            }
          }
        },
      );
    }
  });
});

Template.testRunConfig.helpers({
  fields() {
    return [
      { key: 'key', label: 'Key', sortable: false, cellClass: 'col-md-2' },
      {
        key: 'value',
        label: 'Value',
        sortable: false,
        cellClass: 'config-table-line-break',
      },
    ];
  },

  settings() {
    return {
      rowsPerPage: 50,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
    };
  },
  hasDiffs() {
    return (
      Template.instance()
        .testRunConfig.get()
        .filter((item) => {
          return !item.tags.includes('GitHub');
        }).length > 0
    );
  },
  hasGitHubDiffs() {
    return (
      Template.instance()
        .testRunConfig.get()
        .filter((item) => {
          return item.tags.includes('GitHub');
        }).length > 0
    );
  },
  testRunConfig() {
    return Template.instance().testRunConfig.get();
  },
  hasTestRunConfig() {
    return (
      Template.instance().testRunConfig.get() &&
      Template.instance().testRunConfig.get().length > 0
    );
  },
  showDiffsOnly() {
    return Template.instance().showDiffsOnly.get();
  },

  testRunConfigTags() {
    if (
      Array.isArray(Template.instance().selectedTestRunConfigTags) &&
      Template.instance().selectedTestRunConfigTags.get().length > 0
    ) {
      return Template.instance().selectedTestRunConfigTags.get();
    } else {
      return Template.instance().testRunConfigTags.get();
    }
  },
  selectedTestRunConfigTags() {
    return Template.instance().selectedTestRunConfigTags;
  },
  testRunConfigBaselineSelected() {
    return Session.get('testRunConfigBaseline') !== undefined;
  },
  testRunConfigTabActive(href) {
    return (
      Template.instance().testRunConfigActiveHref.get() === href.toString()
    );
  },
  containsGitHub() {
    if (
      Array.isArray(Template.instance().selectedTestRunConfigTags) &&
      Template.instance().selectedTestRunConfigTags.get().length > 0
    ) {
      return (
        Template.instance().selectedTestRunConfigTags.get() &&
        Template.instance().selectedTestRunConfigTags.get().includes('GitHub')
      );
    } else {
      return (
        Template.instance().testRunConfigTags.get() &&
        Template.instance().testRunConfigTags.get().includes('GitHub')
      );
    }
  },
  testRunConfigActiveHref() {
    return Template.instance().testRunConfigActiveHref.get();
  },
  multipleTestRuns() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const multipleTestRuns = TestRuns.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
        ],
      }).fetch();

      return multipleTestRuns.length > 1;
    }
  },
  hasBaseLineTestRun() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const baselineTestRun = getFixedBaselineTestRun(testRun);
      return baselineTestRun !== undefined;
    }
  },
  testRunConfigFilter() {
    return Template.instance().testRunConfigFilter.get();
  },
});

Template.testRunConfig.events({
  'mouseenter i#previous-test-run-info'(event) {
    event.preventDefault();

    tippy('[data-tippy-content]', {
      theme: 'light-border',
    });
  },
  'click .nav-tabs.test-run-config-tags  a'(event, template) {
    event.preventDefault();
    template.testRunConfigActiveHref.set(
      event.currentTarget.getAttribute('href').replace('#', ''),
    );
  },
  'change input#showDiffsOnlyCheckbox'(event, template) {
    template.showDiffsOnly.set(event.currentTarget.checked);
  },
  'keyup #test-run-config-filter'(event, template) {
    template.testRunConfigFilter.set(event.target.value);
  },
  'click .clear-filter'(event, template) {
    event.preventDefault();
    template.testRunConfigFilter.set(undefined);
  },
});

Template.testRunConfigPanel.helpers({
  fields() {
    return [
      {
        key: 'key',
        label: () => {
          if (this.tag !== 'GitHub') {
            return 'Key';
          } else {
            return 'Repository';
          }
        },
        sortable: false,
        cellClass: 'col-md-3',
      },
      {
        key: 'baselineValue',
        label: () => {
          if (this.tag !== 'GitHub') {
            return 'Baseline value';
          } else {
            return 'Baseline commit';
          }
        },
        sortable: false,
        cellClass: 'config-table-line-break',
        hidden: () => {
          return this.testRunConfigActiveHref === 'test-run-config';
        },
        fn: (value, object) => {
          if (this.tag === 'GitHub') {
            return new Spacebars.SafeString(
              `<a target="_blank" href="${object.key}/commit/${object.baselineValue}">${value}</a>`,
            );
          } else {
            // Handle comma-separated values specially
            if (typeof value === 'string' && value.includes(',')) {
              const values = value.split(',').map((v) => v.trim());
              return new Spacebars.SafeString(
                `<div >${values.join(',<br/>')}</div>`,
              );
            } else {
              return value;
            }
          }
        },
      },
      {
        key: 'value',
        label: () => {
          if (this.tag !== 'GitHub') {
            return 'Value';
          } else {
            return 'Commit';
          }
        },
        sortable: false,
        cellClass: 'config-table-line-break',
        fn: (value, object) => {
          if (this.tag === 'GitHub') {
            return new Spacebars.SafeString(
              `<a target="_blank" href="${object.key}/commit/${object.value}">${value}</a>`,
            );
          } else {
            // Handle comma-separated values specially
            if (typeof value === 'string' && value.includes(',')) {
              const values = value.split(',').map((v) => v.trim());
              return new Spacebars.SafeString(
                `<div >${values.join(',<br/>')}</div>`,
              );
            } else {
              return value;
            }
          }
        },
      },

      {
        key: 'key',
        label: 'View diff in Github',
        sortable: false,
        hidden: () => {
          return (
            this.tag !== 'GitHub' ||
            this.testRunConfigActiveHref === 'test-run-config'
          );
        },
        fn: (value, object) => {
          // let url = object.value.split( '//' );
          // const protocol = url[0] + "//";
          // const host = url[1].split('/')[0];
          // const path = object.value.split(protocol + host)[1];
          // const strippedPath = path.split('/').slice(0, path.split('/').length - 2);
          // const compareUrl = protocol + host + strippedPath.join('/') + '/compare/';
          // const testRunValue = object.value.split('/')[object.value.split('/').length -1];
          // const baselineValue = object.baselineValue.split('/')[object.baselineValue.split('/').length -1];

          return new Spacebars.SafeString(
            `<a target="_blank" href="${object.key}/compare/${object.baselineValue}...${object.value}"> <i class="fa fa-external-link pointer"></i></a>`,
          );
        },
      },
      {
        key: 'tags',
        label: 'Tags',
        sortable: false,
        fn: (value, object) => {
          return new Spacebars.SafeString(getTagsSpan(object));
        },
      },
    ];
  },

  settings() {
    return {
      rowsPerPage: 500,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
    };
  },

  testRunConfig() {
    if (Template.instance().data.tag === 'GitHub') {
      return (
        Template.instance().data.testRunConfig &&
        Template.instance().data.testRunConfig.filter((item) => {
          return item.tags.includes(Template.instance().data.tag);
        })
      );
    } else {
      return (
        Template.instance().data.testRunConfig &&
        Template.instance().data.testRunConfig.filter((item) => {
          return !item.tags.includes('GitHub');
        })
      );
    }
  },
});

const getTagsSpan = (object) => {
  let HTML = '';
  object.tags.forEach((tag) => {
    HTML += `<span class="break-word label label-default" style="margin-right: 5px;">${tag}</span>`;
  });
  return HTML;
};
