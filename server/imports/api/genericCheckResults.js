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

import { TestRuns } from '/imports/collections/testruns';
import { Profiles } from '/imports/collections/profiles';
import { CheckResults } from '/imports/collections/checkResults';
import { GenericChecks } from '/imports/collections/genericChecks';
import { Applications } from '/imports/collections/applications';
import { Teams } from '/imports/collections/teams';
import { getUnit } from '/imports/helpers/units';
import moment from 'moment';
import _ from 'lodash';

export const profiles = function (req, res) {
  const profiles = Profiles.find().fetch();

  res.status(200).json(_.pluck(profiles, 'name'));
};

export const profileRequirementLabels = function (req, res) {
  /* Get generic checks */

  const genericChecks = GenericChecks.find({
    $and: [
      { profile: req.query.profileName },
      { 'panel.requirement': { $exists: true } },
    ],
  }).fetch();

  res.status(200).json(
    genericChecks.map((genericCheck) => {
      return {
        label: createRequirementLabel(genericCheck),
      };
    }),
  );
};

export const profileRequirementSuts = function (req, res) {
  /* get test run ids */

  const testRuns = TestRuns.find(
    {
      $and: [
        {
          end: { $gte: new Date(req.query.from) },
        },
        {
          end: { $lte: new Date(req.query.to) },
        },
      ],
    },
    { fields: { testRunId: 1 } },
  ).fetch();

  const testRunIds = testRuns.map((testRun) => testRun.testRunId);

  /* Get generic checks */

  const genericChecks = GenericChecks.find(
    {
      $and: [
        { profile: req.query.profileName },
        { 'panel.requirement': { $exists: true } },
      ],
    },
    { fields: { checkId: 1 } },
  ).fetch();

  const genericCheckIds = genericChecks.map(
    (genericCheck) => genericCheck.checkId,
  );

  /* get checkResults */

  const checkResults = CheckResults.find(
    {
      $and: [
        { testRunId: { $in: testRunIds } },
        { genericCheckId: { $in: genericCheckIds } },
      ],
    },
    { fields: { application: 1 } },
  ).fetch();

  res.status(200).json(
    _.uniq(
      checkResults.map((checkResult) => {
        return checkResult.application;
      }),
    ),
  );
};
export const profileRequirementTeams = function (req, res) {
  /* get test run ids */

  const testRuns = TestRuns.find(
    {
      $and: [
        {
          end: { $gte: new Date(req.query.from) },
        },
        {
          end: { $lte: new Date(req.query.to) },
        },
      ],
    },
    { fields: { testRunId: 1 } },
  ).fetch();

  const testRunIds = testRuns.map((testRun) => testRun.testRunId);

  /* Get generic checks */

  const genericChecks = GenericChecks.find(
    {
      $and: [
        { profile: req.query.profileName },
        { 'panel.requirement': { $exists: true } },
      ],
    },
    { fields: { checkId: 1 } },
  ).fetch();

  const genericCheckIds = genericChecks.map(
    (genericCheck) => genericCheck.checkId,
  );

  /* get checkResults */

  const checkResults = CheckResults.find(
    {
      $and: [
        { testRunId: { $in: testRunIds } },
        { genericCheckId: { $in: genericCheckIds } },
      ],
    },
    { fields: { application: 1 } },
  ).fetch();

  const uniqueSuts = _.uniq(
    checkResults.map((checkResult) => {
      return checkResult.application;
    }),
  );

  const teams = [];

  uniqueSuts.forEach((sut) => {
    const application = Applications.findOne({
      name: sut,
    });
    if (application.team) {
      const team = Teams.findOne({
        _id: application.team,
      });

      if (team) {
        teams.push(team.name);
      }
    }
  });

  res.status(200).json(_.uniq(teams));
};

export const genericCheckResults = function (req, res) {
  const series = [];

  /* get test run ids */

  const testRuns = TestRuns.find(
    {
      $and: [
        {
          end: { $gte: new Date(req.query.from) },
        },
        {
          end: { $lte: new Date(req.query.to) },
        },
      ],
    },
    { fields: { testRunId: 1, end: 1 } },
  ).fetch();

  const testRunIds = testRuns.map((testRun) => testRun.testRunId);

  /* Get generic checks */

  const genericChecks = GenericChecks.find(
    {
      $and: [
        { profile: req.query.profileName },
        { 'panel.requirement': { $exists: true } },
      ],
    },
    { fields: { checkId: 1, panel: 1 } },
  ).fetch();

  const genericCheckIds = genericChecks.map(
    (genericCheck) => genericCheck.checkId,
  );

  /* get checkResults */

  const checkResults = CheckResults.find(
    {
      $and: [
        { testRunId: { $in: testRunIds } },
        { genericCheckId: { $in: genericCheckIds } },
        { meetsRequirement: { $exists: true } },
      ],
    },
    {
      fields: {
        application: 1,
        testRunId: 1,
        genericCheckId: 1,
        meetsRequirement: 1,
      },
    },
  ).fetch();

  checkResults.forEach((checkResult) => {
    const testRunIndex = testRuns.findIndex(
      (testRun) => testRun.testRunId === checkResult.testRunId,
    );

    const genericCheckIndex = genericChecks.findIndex(
      (genericCheck) => genericCheck.checkId === checkResult.genericCheckId,
    );

    const requirementLabel = createRequirementLabel(
      genericChecks[genericCheckIndex],
    );

    let teamApplications = [];

    if (req.query.team) {
      const team = Teams.findOne({
        name: req.query.team,
      });

      if (team) {
        teamApplications = Applications.find({
          team: team._id,
        })
          .fetch()
          .map((application) => {
            return application.name;
          });
      }
    }

    if (
      !req.query.team ||
      teamApplications.indexOf(checkResult.application) !== -1
    ) {
      if (
        !req.query.systemUnderTest ||
        req.query.systemUnderTest.indexOf(checkResult.application) !== -1
      ) {
        if (req.query.requirementLabel.indexOf(requirementLabel) !== -1) {
          series.push({
            time: moment(new Date(testRuns[testRunIndex].end)).format(
              'MM-DD-YYYY',
            ),
            meetsRequirement: checkResult.meetsRequirement,
            genericCheckId: checkResult.genericCheckId,
            requirementLabel: requirementLabel,
          });
        }
      }
    }
  });

  const groupedByDateSeries = _.groupBy(series, function (item) {
    return item.time;
  });

  const summarizedSeries = [];

  Object.keys(groupedByDateSeries).forEach((date) => {
    let meetsRequirementTrue = 0;
    let meetsRequirementFalse = 0;

    groupedByDateSeries[date].forEach((item) => {
      if (item.meetsRequirement === true) {
        meetsRequirementTrue++;
      } else {
        meetsRequirementFalse++;
      }
    });

    summarizedSeries.push({
      time: new Date(date),
      meetsRequirementTrue: meetsRequirementTrue,
      meetsRequirementFalse: meetsRequirementFalse,
    });
  });

  res.status(200).json(summarizedSeries);
};

const createRequirementLabel = (applicationBenchmark) => {
  const unit = getUnit(applicationBenchmark.panel.yAxesFormat);

  const panelTitle = applicationBenchmark.panel.title.replace(
    /[0-9]+-(.*)/,
    '$1',
  );
  const requirementOperator = humanReadableOperator(
    applicationBenchmark.panel.requirement.operator,
  );
  const format = applicationBenchmark.panel.yAxesFormat ? unit.name : '';
  const matchPattern =
    applicationBenchmark.panel.matchPattern ?
      ` for series matching pattern "${applicationBenchmark.panel.matchPattern}"`
    : '';

  return `${panelTitle} should be ${requirementOperator} ${applicationBenchmark.panel.requirement.value} ${format}${matchPattern}`;
};

const humanReadableOperator = (operator) => {
  switch (operator) {
    case 'st': //legacy
      return 'less than';
    case 'lt':
      return 'less than';
    case 'gt':
      return 'greater than';
  }
};
