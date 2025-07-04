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

// noinspection HttpUrlsUsage

import { Meteor } from 'meteor/meteor';
import fetch from 'node-fetch';
import { NotificationsChannels } from '/imports/collections/notificationChannels';
import { Applications } from '/imports/collections/applications';
import { Teams } from '/imports/collections/teams';
import { log } from '/both/logger';

export const sendTestRunResultNotifications = (testRun) => {
  let teamApplicationQuery = {};

  const application = Applications.findOne({ name: testRun.application });

  if (application.team) {
    const team = Teams.findOne({
      _id: application.team,
    });

    if (team) {
      teamApplicationQuery.$or = [
        { application: application.name },
        { team: team.name },
      ];
    } else {
      teamApplicationQuery['application'] = application.name;
    }
  } else {
    teamApplicationQuery = { application: application.name };
  }

  const notificationsChannels = NotificationsChannels.find({
    $and: [teamApplicationQuery, { notifyWhenTestRunFinished: true }],
  }).fetch();

  if (notificationsChannels.length > 0) {
    const testRunDeeplink = generateDeeplink(testRun);

    notificationsChannels.forEach((notificationsChannel) => {
      if (
        testRun.consolidatedResult.overall === false ||
        (notificationsChannel.notifyWhenTestRunFailed === false &&
          testRun.consolidatedResult.overall === true)
      ) {
        let message;
        const testRunResultsMessage =
          testRun.consolidatedResult.overall === false ?
            `Test run failed!`
          : `Test run passed!`;

        switch (notificationsChannel.type) {
          case 'slack':
            message = createSlackTestRunResultMessage(
              testRun,
              testRunDeeplink,
              testRunResultsMessage,
            );
            break;
          case 'teams':
            message = createTeamsTestRunResultMessage(
              testRun,
              testRunDeeplink,
              testRunResultsMessage,
            );
            break;
          case 'google':
            message = createGoogleChatTestRunResultMessage(
              testRun,
              testRunDeeplink,
              testRunResultsMessage,
            );
            break;
        }

        fetch(notificationsChannel.webHookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            // noinspection JSCheckFunctionSignatures
            log.info('Log: Message Delivered');
          })
          .catch((error) => {
            log.error('Log: Error, Reason: ' + error.message);
          });
      }
    });
  }
};

export const sendCommentsNotifications = (
  testRun,
  comment,
  notificationsChannels,
  callback,
) => {
  try {
    if (notificationsChannels.length > 0) {
      const testRunDeeplink = generateDeeplink(testRun);

      notificationsChannels.forEach((notificationsChannel) => {
        let message;

        switch (notificationsChannel.type) {
          case 'slack':
            message = createSlackCommentMessage(
              comment,
              testRunDeeplink,
              testRun,
            );
            break;
          case 'teams':
            message = createTeamsCommentMessage(
              comment,
              testRunDeeplink,
              testRun,
            );
            break;
          case 'google':
            message = createGoogleChatsCommentMessage(
              comment,
              testRunDeeplink,
              testRun,
            );
            break;
        }

        fetch(notificationsChannel.webHookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            // noinspection JSCheckFunctionSignatures
            log.info('Log: Message Delivered');
          })
          .catch((error) => {
            log.error('Log: Error, Reason: ' + error.message);
          });
      });
    }

    callback(null, true);
  } catch (e) {
    callback(e, null);
  }
};

const createSlackCommentMessage = (comment, testRunDeeplink, testRun) => {
  const activity =
    comment.replies && comment.replies.length > 0 ?
      `${comment.replies[comment.replies.length - 1].createdByUsername} replied on comment by ${comment.createdByUsername}`
    : `${comment.createdByUsername} commented on test run`;

  return {
    text:
      comment.replies && comment.replies.length > 0 ?
        comment.replies[comment.replies.length - 1]
      : comment.content,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${activity}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            text: `${testRun.application} | ${testRun.applicationRelease} | ${testRun.testRunId}`,
            type: 'mrkdwn',
          },
        ],
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Dashboard:* ${comment.dashboardLabel}\n*Graph*: ${comment.panelTitle}\n`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            comment.replies && comment.replies.length > 0 ?
              comment.replies[comment.replies.length - 1]
            : comment.content,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<${testRunDeeplink}&tab=comments| view comments in Perfana>`,
        },
      },
    ],
  };
};
const createSlackTestRunResultMessage = (
  testRun,
  testRunDeeplink,
  testRunResultsMessage,
) => {
  const testRunId = testRun.testRunId
    .replace(/\//g, '-')
    .replace(/\s/g, '-')
    .replace(/\|/g, '-')
    .replace(/=/g, '-')
    .replace(/\(/g, '-')
    .replace(/\)/g, '-');

  return {
    text: testRunResultsMessage,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${testRunResultsMessage} `,
        },
      },
      {
        type: 'context',
        elements: [
          {
            text: `${testRun.application} | ${testRun.applicationRelease} | ${testRunId} | ${testRun.testType} | ${testRun.testEnvironment}`,
            type: 'mrkdwn',
          },
        ],
      },
      // {
      //     'type': 'divider'
      // },
      // {
      //     'type': 'section',
      //     'text': {
      //         'type': 'mrkdwn',
      //         'text': `*Dashboard:* ${comment.dashboardLabel}\n*Graph*: ${comment.panelTitle}\n`
      //     }
      // },
      // {
      //     'type': 'section',
      //     'text': {
      //         'type': 'mrkdwn',
      //         'text': comment.content
      //
      //     },
      // },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<${testRunDeeplink}| view test run in Perfana>`,
        },
      },
    ],
  };
};
const createTeamsCommentMessage = (comment, testRunDeeplink, testRun) => {
  const activity =
    comment.replies && comment.replies.length > 0 ?
      `${comment.replies[comment.replies.length - 1].createdByUsername} replied on comment by ${comment.createdByUsername}`
    : `${comment.createdByUsername} commented on test run`;
  return {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: '0076D7',
    summary: `${comment.createdByUsername} commented on test run`,
    sections: [
      {
        activityTitle: `${activity}`,
        activitySubtitle: `${testRun.application} | ${testRun.applicationRelease} | ${testRun.testRunId}`,
        facts: [
          {
            name: 'Dashboard',
            value: `${comment.dashboardLabel}`,
          },
          {
            name: 'Graph',
            value: `${comment.panelTitle}`,
          },
        ],
        text:
          comment.replies && comment.replies.length > 0 ?
            comment.replies[comment.replies.length - 1]
          : comment.content,
        markdown: true,
      },
    ],

    potentialAction: [
      {
        '@type': 'OpenUri',
        name: 'View comments in Perfana',
        targets: [
          {
            os: 'default',
            uri: `${testRunDeeplink}&tab=comments`,
          },
        ],
      },
    ],
  };
};

const createTeamsTestRunResultMessage = (
  testRun,
  testRunDeeplink,
  testRunResultsMessage,
) => {
  const color =
    testRun.consolidatedResult.overall === false ? 'd7000b' : '0bd700';

  return {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: color,
    summary: `${testRunResultsMessage}`,
    sections: [
      {
        activityTitle: `${testRunResultsMessage}`,
        activitySubtitle: `${testRun.application} | ${testRun.applicationRelease} | ${testRun.testRunId} | ${testRun.testType} | ${testRun.testEnvironment}`,
        // "facts": [{
        //     "name": "Dashboard",
        //     "value": `${comment.dashboardLabel}`
        // }, {
        //     "name": "Graph",
        //     "value": `${comment.panelTitle}`
        // },
        // ],
        // "text": `${comment.content}`,
        markdown: true,
      },
    ],

    potentialAction: [
      {
        '@type': 'OpenUri',
        name: 'View test run in Perfana',
        targets: [
          {
            os: 'default',
            uri: `${testRunDeeplink}`,
          },
        ],
      },
    ],
  };
};
const createGoogleChatsCommentMessage = (comment, testRunDeeplink, testRun) => {
  const activity =
    comment.replies && comment.replies.length > 0 ?
      `${comment.replies[comment.replies.length - 1].createdByUsername} replied on comment by ${comment.createdByUsername}`
    : `${comment.createdByUsername} commented on test run`;

  return {
    cards: [
      {
        header: {
          title: activity,
          subtitle: `${testRun.application} | ${testRun.applicationRelease} | ${testRun.testRunId}`,
        },
        sections: [
          {
            widgets: [
              {
                keyValue: {
                  topLabel: 'Dashboard',
                  content: comment.dashboardLabel,
                },
              },
              {
                keyValue: {
                  topLabel: 'Graph',
                  content: comment.panelTitle,
                },
              },
              {
                keyValue: {
                  content:
                    comment.replies && comment.replies.length > 0 ?
                      comment.replies[comment.replies.length - 1]
                    : comment.content,
                },
              },
            ],
          },

          {
            widgets: [
              {
                buttons: [
                  {
                    textButton: {
                      text: 'view comments in Perfana',
                      onClick: {
                        openLink: {
                          url: `${testRunDeeplink}&tab=comments`,
                        },
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
};

const createGoogleChatTestRunResultMessage = (
  testRun,
  testRunDeeplink,
  testRunResultsMessage,
) => {
  const testRunId = testRun.testRunId
    .replace(/\//g, '-')
    .replace(/\s/g, '-')
    .replace(/\|/g, '-')
    .replace(/=/g, '-')
    .replace(/\(/g, '-')
    .replace(/\)/g, '-');

  return {
    cards: [
      {
        header: {
          title: testRunResultsMessage,
          subtitle: `${testRun.application} | ${testRun.applicationRelease} | ${testRunId}`,
        },
        sections: [
          {
            widgets: [
              {
                keyValue: {
                  topLabel: 'Test environment',
                  content: testRun.testEnvironment,
                },
              },
              {
                keyValue: {
                  topLabel: 'Workload',
                  content: testRun.testType,
                },
              },
            ],
          },

          {
            widgets: [
              {
                buttons: [
                  {
                    textButton: {
                      text: 'view test run in Perfana',
                      onClick: {
                        openLink: {
                          url: testRunDeeplink,
                        },
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
};

const generateDeeplink = (testRun) => {
  const perfanaUrl =
    Meteor.settings.perfanaUrl ?
      Meteor.settings.perfanaUrl
    : 'http://localhost:4000';

  const url = `${perfanaUrl}/test-run/${testRun.testRunId.replace('/', '%2F')}?systemUnderTest=${testRun.application}&workload=${testRun.testType}&testEnvironment=${testRun.testEnvironment}`;

  return encodeURI(url);
};
