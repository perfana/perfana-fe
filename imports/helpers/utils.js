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

/* eslint-disable no-useless-escape,indent */
// noinspection RegExpRedundantEscape

import { TestRuns } from '../collections/testruns';
import { Applications } from '../collections/applications';
import { Meteor } from 'meteor/meteor';
import { GrafanaDashboards } from '../collections/grafanaDashboards';
import { Configuration } from '../collections/configuration';
import { Grafanas } from '../collections/grafanas';
import { ApplicationDashboards } from '../collections/applicationDashboards';
import moment from 'moment-timezone';
import _ from 'lodash';

export const replaceDynamicVariableValues =
  function replaceDynamicVariableValues(environmentDashboard, testRun) {
    _.each(testRun.variables, (testRunVariable) => {
      _.each(
        environmentDashboard.variables,
        (dashboardVariable, dashboardVariableIndex) => {
          _.each(
            dashboardVariable.values,
            (dashboardVariableValue, dashboardVariableValueIndex) => {
              if (dashboardVariableValue === testRunVariable.placeholder)
                environmentDashboard.variables[dashboardVariableIndex].values[
                  dashboardVariableValueIndex
                ] = testRunVariable.value;
            },
          );
        },
      );
    });

    return environmentDashboard;
  };

const getNestedValue = (obj, propertyPath) => {
  return propertyPath
    .split('.')
    .reduce((prev, curr) => (prev ? prev[curr] : null), obj);
};

export const dynamicSortNested = (property) => {
  let sortOrder = 1;
  if (property.startsWith('-')) {
    sortOrder = -1;
    property = property.slice(1);
  }
  return function (a, b) {
    const result =
      getNestedValue(a, property) < getNestedValue(b, property) ? -1
      : getNestedValue(a, property) > getNestedValue(b, property) ? 1
      : 0;
    return result * sortOrder;
  };
};

export const dynamicSortNestedMultiple = (...properties) => {
  return function (a, b) {
    for (let i = 0; i < properties.length; i++) {
      let sortOrder = 1;
      let property = properties[i];

      if (property.startsWith('-')) {
        sortOrder = -1;
        property = property.slice(1);
      }

      const valueA = getNestedValue(a, property);
      const valueB = getNestedValue(b, property);

      const result =
        valueA < valueB ? -1
        : valueA > valueB ? 1
        : 0;

      if (result !== 0) {
        return result * sortOrder;
      }
    }

    return 0;
  };
};

export const dynamicSort = (property) => {
  let sortOrder = 1;
  if (property.startsWith('-')) {
    sortOrder = -1;
    property = property.slice(1);
  }
  return function (a, b) {
    const result =
      a[property] < b[property] ? -1
      : a[property] > b[property] ? 1
      : 0;
    return result * sortOrder;
  };
};

export const dynamicSortMultiple = (property1, property2) => {
  let sortOrder1 = 1;
  let sortOrder2 = 1;

  if (property1.startsWith('-')) {
    sortOrder1 = -1;
    property1 = property1.slice(1);
  }
  if (property2.startsWith('-')) {
    sortOrder2 = -1;
    property2 = property2.slice(1);
  }

  return function (a, b) {
    const result1 =
      a[property1] < b[property1] ? -1
      : a[property1] > b[property1] ? 1
      : 0;

    if (result1 !== 0) {
      return result1 * sortOrder1;
    } else {
      const result2 =
        a[property2] < b[property2] ? -1
        : a[property2] > b[property2] ? 1
        : 0;
      return result2 * sortOrder2;
    }
  };
};
export const sortAdaptConclusion = (property) => {
  const order = [
    'regression',
    'improvement',
    'increase',
    'decrease',
    'partial regression',
    'partial improvement',
    'partial increase',
    'partial decrease',
    'no difference',
    'incomparable',
  ];

  return function (a, b) {
    // Access nested property
    const propA = property.split('.').reduce((o, i) => o[i], a);
    const propB = property.split('.').reduce((o, i) => o[i], b);

    const indexA = order.indexOf(propA);
    const indexB = order.indexOf(propB);

    if (indexA === -1 || indexB === -1) {
      throw new Error('All items to sort must be in the order array');
    }

    if (indexA < indexB) {
      return -1;
    } else if (indexA > indexB) {
      return 1;
    }
    return 0;
  };
};

export const humanReadableDuration = (durationInSeconds) => {
  if (durationInSeconds === 0) {
    return '0 seconds';
  } else {
    const date = new Date(durationInSeconds * 1000);
    let readableDate = '';
    const daysLabel = date.getUTCDate() - 1 === 1 ? ' day, ' : ' days, ';
    const hoursLabel = date.getUTCHours() === 1 ? ' hour, ' : ' hours, ';
    const minutesLabel = date.getUTCMinutes() === 1 ? ' minute' : ' minutes';
    const secondsLabel = date.getUTCSeconds() === 1 ? '  second' : '  seconds';

    if (date.getUTCDate() - 1 > 0)
      readableDate += date.getUTCDate() - 1 + daysLabel;
    if (date.getUTCHours() > 0) readableDate += date.getUTCHours() + hoursLabel;
    if (date.getUTCMinutes() > 0)
      readableDate += date.getUTCMinutes() + minutesLabel;
    if (date.getUTCMinutes() === 0)
      readableDate += date.getUTCSeconds() + secondsLabel;
    return readableDate;
  }
};
export const durationInDays = (seconds) => {
  seconds = Number(seconds);
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);

  const dDisplay = d > 0 ? d + (d === 1 ? ' day' : ' days') : '';
  const hDisplay = h > 0 ? h + (h === 1 ? ' hour' : ' hours') : '';

  return dDisplay + (hDisplay !== '' ? ', ' : '') + hDisplay;
};

export const formatDate = (date) => {
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return moment(date).tz(userTimezone).format('D MMMM YYYY, HH:mm');
};

export const formatTime = (date) => {
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return moment(date).tz(userTimezone).format('HH:mm');
};

export const replaceDynamicVariable = (placeholder, testRun) => {
  if (testRun.variables && testRun.variables.length > 0) {
    const placeholderIndex = testRun.variables
      .map((variable) => {
        return variable.placeholder;
      })
      .indexOf(placeholder);
    if (placeholderIndex !== -1) {
      return testRun.variables[placeholderIndex].value;
    } else {
      return placeholder;
    }
  } else {
    return placeholder;
  }
};

export const carouselIntervals = [
  { value: '5 seconds', valueInMs: 5000 },
  { value: '10 seconds', valueInMs: 10000 },
  { value: '30 seconds', valueInMs: 30000 },
  { value: '1 minute', valueInMs: 60000 },
];

export const renderGrafanaUrl = (
  testRun,
  dashboard,
  grafana,
  grafanaDashboard,
  kioskMode,
) => {
  let result;
  const start =
    isNaN(testRun.start) ? testRun.start : new Date(testRun.start).getTime();
  const end =
    isNaN(testRun.end) ? testRun.end : new Date(testRun.end).getTime();

  if (testRun && dashboard) {
    let variables = `&var-system_under_test=${testRun.application}&var-test_environment=${testRun.testEnvironment}`;
    if (dashboard.variables) {
      if (testRun.variables && testRun.variables.length > 0)
        dashboard = replaceDynamicVariableValues(dashboard, testRun);

      for (const v in dashboard.variables) {
        for (const l in dashboard.variables[v].values) {
          if (dashboard.variables[v])
            variables +=
              '&var-' +
              dashboard.variables[v].name +
              '=' +
              dashboard.variables[v].values[l];
        }
      }
    }

    const theme =
      Meteor.user().profile.theme ? Meteor.user().profile.theme : 'light';
    const kiosk = kioskMode ? '&kiosk' : '';

    result = `${grafana.clientUrl}/d/${grafanaDashboard.uid}/${grafanaDashboard.slug}?orgId=${grafana.orgId}&from=${start}&to=${end}${variables}&theme=${theme}${kiosk}`;
  }

  return result;
};

export const renderGrafanaPanelUrl = (
  testRun,
  applicationDashboard,
  grafana,
  grafanaDashboard,
  panelId,
  queryParams,
) => {
  let result;
  const start =
    isNaN(testRun.start) ? testRun.start : new Date(testRun.start).getTime();
  const end =
    isNaN(testRun.end) ? testRun.end : new Date(testRun.end).getTime();

  if (testRun && applicationDashboard) {
    let variables = `&var-system_under_test=${testRun.application}&var-test_environment=${testRun.testEnvironment}`;
    if (applicationDashboard.variables) {
      if (testRun.variables && testRun.variables.length > 0)
        applicationDashboard = replaceDynamicVariableValues(
          applicationDashboard,
          testRun,
        );

      for (const v in applicationDashboard.variables) {
        for (const l in applicationDashboard.variables[v].values) {
          if (applicationDashboard.variables[v])
            variables +=
              '&var-' +
              applicationDashboard.variables[v].name +
              '=' +
              applicationDashboard.variables[v].values[l];
        }
      }
    }

    const theme =
      Meteor.user().profile.theme ? Meteor.user().profile.theme : 'light';

    // result = `${grafana.clientUrl}/render/d-solo/${grafanaDashboard.uid}/${grafanaDashboard.slug}?orgId=${grafana.orgId}&from=${start}&to=${end}${variables}&panelId=${panelId}&${queryParams}`;
    result = `${grafana.clientUrl}/d/${grafanaDashboard.uid}/${grafanaDashboard.slug}?orgId=${grafana.orgId}&from=${start}&to=${end}${variables}&viewPanel=${panelId}&${queryParams}&theme=${theme}&kiosk`;
  }

  return result;
};
export const renderGrafanaPanelSoloUrl = (
  testRun,
  dashboardLabel,
  grafanaLabel,
  dashboardUid,
  panelId,
) => {
  const grafana = Grafanas.findOne({
    label: grafanaLabel,
  });

  const grafanaDashboard = GrafanaDashboards.findOne({
    $and: [{ grafana: grafanaLabel }, { uid: dashboardUid }],
  });

  let applicationDashboard = ApplicationDashboards.findOne({
    $and: [
      { application: testRun.application },
      { testEnvironment: testRun.testEnvironment },
      { dashboardUid: dashboardUid },
      { dashboardLabel: dashboardLabel },
    ],
  });

  let result;
  const start =
    isNaN(testRun.start) ? testRun.start : new Date(testRun.start).getTime();
  const end =
    isNaN(testRun.end) ? testRun.end : new Date(testRun.end).getTime();

  if (grafana && grafanaDashboard && testRun && applicationDashboard) {
    let variables = `&var-system_under_test=${testRun.application}&var-test_environment=${testRun.testEnvironment}`;
    if (applicationDashboard.variables) {
      if (testRun.variables && testRun.variables.length > 0)
        applicationDashboard = replaceDynamicVariableValues(
          applicationDashboard,
          testRun,
        );

      for (const v in applicationDashboard.variables) {
        for (const l in applicationDashboard.variables[v].values) {
          if (applicationDashboard.variables[v])
            variables +=
              '&var-' +
              applicationDashboard.variables[v].name +
              '=' +
              applicationDashboard.variables[v].values[l];
        }
      }
    }

    const theme =
      Meteor.user().profile.theme ? Meteor.user().profile.theme : 'light';

    // result = `${grafana.clientUrl}/render/d-solo/${grafanaDashboard.uid}/${grafanaDashboard.slug}?orgId=${grafana.orgId}&from=${start}&to=${end}${variables}&panelId=${panelId}&${queryParams}`;
    result = `${grafana.clientUrl}/d-solo/${grafanaDashboard.uid}/${grafanaDashboard.slug}?orgId=${grafana.orgId}&from=${start}&to=${end}${variables}&panelId=${panelId}&fullScreen&theme=${theme}&kiosk`;
  }

  return result;
};

export const renderGrafanaServerUrl = (
  testRun,
  dashboard,
  grafana,
  grafanaDashboard,
) => {
  let result;
  const start = new Date(testRun.start).getTime();
  const end = new Date(testRun.end).getTime();

  if (testRun && dashboard) {
    let variables = `&var-system_under_test=${testRun.application}&var-test_environment=${testRun.testEnvironment}`;
    if (dashboard.variables) {
      if (testRun.variables && testRun.variables.length > 0)
        dashboard = replaceDynamicVariableValues(dashboard, testRun);

      for (const v in dashboard.variables) {
        for (const l in dashboard.variables[v].values) {
          if (dashboard.variables[v])
            variables +=
              '&var-' +
              dashboard.variables[v].name +
              '=' +
              dashboard.variables[v].values[l];
        }
      }
    }

    const grafanaUrl =
      grafana.serverUrl ? grafana.serverUrl : grafana.clientUrl;

    // let theme = Meteor.user().profile.theme ? Meteor.user().profile.theme : 'light';

    result = `${grafanaUrl}/d/${grafanaDashboard.uid}/${grafanaDashboard.slug}?orgId=${grafana.orgId}&from=${start}&to=${end}${variables}&theme=light`;
  }

  return result;
};

export const getTestRun = (application, testRunId) => {
  return TestRuns.findOne({
    $and: [{ application: application }, { testRunId: testRunId }],
  });
};

export const getTestRunById = (id) => {
  return TestRuns.findOne({
    _id: id,
  });
};

export const slugify = (
  text, // Trim - from end of text
) =>
  text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '');

export const renderGrafanaSnapshotPanelUrl = (
  snapshotUrl,
  panelId,
  testRun,
  dashboard,
  grafana,
  queryParams,
  backend,
) => {
  let result;
  const start = new Date(testRun.start).getTime();
  const end = new Date(testRun.end).getTime();

  const urlQueryParams = queryParams ? queryParams : '';

  if (testRun && dashboard) {
    let variables = `&var-system_under_test=${testRun.application}&var-test_environment=${testRun.testEnvironment}`;
    if (dashboard.variables) {
      if (testRun.variables && testRun.variables.length > 0)
        dashboard = replaceDynamicVariableValues(dashboard, testRun);

      for (const v in dashboard.variables) {
        for (const l in dashboard.variables[v].values) {
          if (dashboard.variables[v])
            variables +=
              '&var-' +
              dashboard.variables[v].name +
              '=' +
              dashboard.variables[v].values[l];
        }
      }
    }

    const theme =
      backend === true ? 'light'
      : Meteor.user().profile.theme ? Meteor.user().profile.theme
      : 'light';

    result = `${snapshotUrl}?orgId=${grafana.orgId}&panelId=${panelId}&viewPanel=${panelId}&from=${start}&to=${end}${variables}${urlQueryParams}&theme=${theme}&kiosk`;
  }

  return result;
};

export const getPreviousTestRun = (currentTestRun, valid) => {
  const query = {
    $and: [
      { application: currentTestRun.application },
      { testType: currentTestRun.testType },
      { testEnvironment: currentTestRun.testEnvironment },
      { completed: true },
    ],
  };

  if (valid === true) {
    query.$and.push({
      $or: [{ valid: { $exists: false } }, { valid: true }],
    });
  }

  const allTestRuns = TestRuns.find(query, { sort: { end: -1 } }).fetch();

  // console.log(JSON.stringify(allTestRuns));

  const testRun = getTestRun(
    currentTestRun.application,
    currentTestRun.testRunId,
  );

  let index = -1;

  for (let i = 0; i < allTestRuns.length; i++) {
    if (new Date(allTestRuns[i].end) < new Date(testRun.end)) {
      index = i;
      break;
    }
  }

  if (allTestRuns.length > 0 && index < allTestRuns.length && index !== -1) {
    // console.log('previousTestrun: ' + JSON.stringify(allTestRuns[index + 1]))

    return allTestRuns[index].testRunId;
  } else {
    return undefined;
  }
};

export const getNextTestRun = (snapshot) => {
  const allTestRuns = TestRuns.find(
    {
      $and: [
        { application: snapshot.application },
        { testType: snapshot.testType },
        { testEnvironment: snapshot.testEnvironment },
        // {completed: true}
      ],
    },
    { sort: { end: -1 } },
  ).fetch();

  // console.log(JSON.stringify(allTestRuns));

  const index = allTestRuns.map((t) => t.testRunId).indexOf(snapshot.testRunId);

  if (allTestRuns.length > 1 && index > 0) {
    return allTestRuns[index - 1].testRunId;
  } else {
    return undefined;
  }
};

export const getFixedBaselineTestRun = (snapshot) => {
  const application = Applications.findOne({ name: snapshot.application });

  const environment = application.testEnvironments.filter(
    (testEnvironment) => testEnvironment.name === snapshot.testEnvironment,
  );

  const testType = environment[0].testTypes.filter(
    (testType) => testType.name === snapshot.testType,
  );

  return testType[0].baselineTestRun !== snapshot.testRunId ?
      testType[0].baselineTestRun
    : undefined;
};

export const getDataRetention = (applicationDashboard) => {
  const grafanaDashboard = GrafanaDashboards.findOne({
    $and: [
      { grafana: applicationDashboard.grafana },
      { uid: applicationDashboard.dashboardUid },
    ],
  });

  if (grafanaDashboard) {
    let config;
    let dataRetention;

    switch (grafanaDashboard.datasourceType) {
      case 'prometheus':
        config = Configuration.findOne({
          $and: [{ type: 'datasource' }, { key: 'prometheusRetention' }],
        });

        if (config) {
          dataRetention = config.value;
        } else {
          /* if unknown show snapshots always by assuming retention = 0*/
          dataRetention = 0;
        }

        break;
      case 'influxdb':
        config = Configuration.findOne({
          $and: [{ type: 'datasource' }, { key: 'influxDbRetention' }],
        });

        if (config) {
          dataRetention = config.value;
        } else {
          /* if unknown show snapshots always by assuming retention = 0*/
          dataRetention = 0;
        }

        break;
      case 'graphite':
        config = Configuration.findOne({
          $and: [{ type: 'datasource' }, { key: 'graphiteRetention' }],
        });

        if (config) {
          dataRetention = config.value;
        } else {
          /* if unknown show snapshots always by assuming retention = 0*/
          dataRetention = 0;
        }

        break;
      case 'elasticsearch':
        config = Configuration.findOne({
          $and: [{ type: 'datasource' }, { key: 'elasticSearchRetention' }],
        });

        if (config) {
          dataRetention = config.value;
        } else {
          /* if unknown show snapshots always by assuming retention = 0*/
          dataRetention = 0;
        }

        break;

      case 'cloudwatch':
        config = Configuration.findOne({
          $and: [{ type: 'datasource' }, { key: 'cloudWatchRetention' }],
        });

        if (config) {
          dataRetention = config.value;
        } else {
          /* if unknown show snapshots always by assuming retention = 0*/
          dataRetention = 0;
        }

        break;
      case 'grafana-pyroscope-datasource':
        config = Configuration.findOne({
          $and: [{ type: 'datasource' }, { key: 'pyroscopeRetention' }],
        });

        if (config) {
          dataRetention = config.value;
        } else {
          /* if unknown show snapshots always by assuming retention = 0*/
          dataRetention = 0;
        }

        break;
      case 'loki':
        config = Configuration.findOne({
          $and: [{ type: 'datasource' }, { key: 'lokiRetention' }],
        });

        if (config) {
          dataRetention = config.value;
        } else {
          /* if unknown show snapshots always by assuming retention = 0*/
          dataRetention = 0;
        }

        break;
      case 'grafana-azure-monitor-datasource':
        config = Configuration.findOne({
          $and: [{ type: 'datasource' }, { key: 'azureRetention' }],
        });

        if (config) {
          dataRetention = config.value;
        } else {
          /* if unknown show snapshots always by assuming retention = 0*/
          dataRetention = 0;
        }

        break;
      default:
        /* if unknown show snapshots always by assuming retention = 0*/
        dataRetention = 0;
    }

    return dataRetention;
  } else {
    return 0;
  }
};

export const checkIfTestRunIsBaseline = (testRun) => {
  const application = Applications.findOne({
    name: testRun.application,
  });

  let isBaselineTestRun;

  const testEnvironmentIndex = application.testEnvironments
    .map((testEnvironment) => {
      return testEnvironment.name;
    })
    .indexOf(testRun.testEnvironment);
  const testTypeIndex = application.testEnvironments[
    testEnvironmentIndex
  ].testTypes
    .map((testType) => {
      return testType.name;
    })
    .indexOf(testRun.testType);

  if (
    application.testEnvironments[testEnvironmentIndex].testTypes[testTypeIndex]
      .baselineTestRun
  ) {
    isBaselineTestRun =
      application.testEnvironments[testEnvironmentIndex].testTypes[
        testTypeIndex
      ].baselineTestRun === testRun.testRunId;
  } else {
    isBaselineTestRun = false;
  }

  return isBaselineTestRun;
};

export const removeTestRunAsBaseline = (testRun) => {
  const application = Applications.findOne({
    name: testRun.application,
  });

  const testEnvironmentIndex = application.testEnvironments
    .map((testEnvironment) => {
      return testEnvironment.name;
    })
    .indexOf(testRun.testEnvironment);
  const testTypeIndex = application.testEnvironments[
    testEnvironmentIndex
  ].testTypes
    .map((testType) => {
      return testType.name;
    })
    .indexOf(testRun.testType);

  application.testEnvironments[testEnvironmentIndex].testTypes[
    testTypeIndex
  ].baselineTestRun = undefined;

  Applications.update(
    {
      _id: application._id,
    },
    {
      $set: application,
    },
  );
};

export const renderTestRunUrl = (
  systemUnderTest,
  workload,
  testEnvironment,
  testRunId,
) => {
  return `/test-run/${testRunId}?systemUnderTest=${systemUnderTest}&workload=${workload}&testEnvironment=${testEnvironment}`;
};
