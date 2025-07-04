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

/* eslint-disable prefer-const,indent */
// noinspection JSCheckFunctionSignatures

import { getInfluxVariables } from '../helpers/datasources/influxdb';
import { getPrometheusVariables } from '../helpers/datasources/prometheus';
import { getGraphiteVariables } from '../helpers/datasources/graphite';
import { grafanaCall } from './grafana/grafana-api-with-api-key';
import { log } from '/both/logger';
import _ from 'lodash';

module.exports.getValuesFromDatasource = (
  grafanaInstance,
  grafanaDashboard,
  application,
  testEnvironment,
  templatingVariable,
  applicationDashboardVariables,
  includeAll,
  callback,
) => {
  // replace system_under_test and test_environment placeholders in query

  let systemUnderTestQuery =
    templatingVariable.query.query ?
      templatingVariable.query.query
        .replace('$system_under_test', application)
        .replace('$test_environment', testEnvironment)
    : templatingVariable.query
        .replace('$system_under_test', application)
        .replace('$test_environment', testEnvironment);

  // replace other templating variables in query
  applicationDashboardVariables.forEach((applicationDashboardVariable) => {
    const placeholder = new RegExp(
      'perfana-' + applicationDashboardVariable.name,
      'g',
    );

    if (
      placeholder.test(templatingVariable.query) &&
      applicationDashboardVariable.name !== 'system_under_test' &&
      applicationDashboardVariable.name !== 'test_environment'
    ) {
      let replaceValue = '';

      applicationDashboardVariable.values.forEach((value, valueIndex) => {
        if (valueIndex === 0) {
          replaceValue += value;
        } else {
          replaceValue += `|${value}`;
        }
      });

      systemUnderTestQuery = systemUnderTestQuery.replace(
        placeholder,
        replaceValue,
      );
    }
  });

  let values = [];
  let templatingVariableValues;
  const datasourceEndpoint =
    templatingVariable.datasource.uid ?
      '/api/datasources/uid/'
    : '/api/datasources/name/';
  const datasourceIdentifier =
    templatingVariable.datasource.uid ?
      templatingVariable.datasource.uid
    : templatingVariable.datasource;

  switch (templatingVariable.type) {
    case 'interval':
    case 'constant':
    case 'custom':
      templatingVariable.options &&
        templatingVariable.options.forEach((option) => {
          if (values.indexOf(option.value) === -1) values.push(option.value);
        });

      templatingVariableValues = _.uniq(values).map((v) => ({
        label: v,
        value: v,
      }));

      callback(null, templatingVariableValues);

      break;

    case 'query':
      // get datasource
      grafanaCall(
        grafanaInstance,
        datasourceEndpoint + datasourceIdentifier,
        (err, datasource) => {
          if (err) {
            log.error(
              `##### Error getting datasource "${datasourceIdentifier}" for variable "${templatingVariable.name}" in Grafana dashboard "${grafanaDashboard.name}", ${err}`,
            );
            callback(err, null);
          }
          switch (datasource.type) {
            case 'influxdb':
              getInfluxVariables(
                grafanaInstance,
                grafanaDashboard,
                datasource,
                templatingVariable,
                systemUnderTestQuery,
              )
                .then((values) => {
                  const templatingVariableValues = _.uniq(values).map((v) => ({
                    label: v,
                    value: v,
                  }));

                  if (includeAll === true) {
                    templatingVariableValues.unshift({
                      label: 'All',
                      value: 'All',
                    });
                  }
                  callback(null, templatingVariableValues);
                })
                .catch((err) => {
                  log.error(
                    `Failed to get values for templating variable "${templatingVariable.name}" in Grafana dashboard "${grafanaDashboard.name}", error: ${err}`,
                  );
                });

              break;

            case 'prometheus':
              getPrometheusVariables(
                grafanaInstance,
                grafanaDashboard,
                datasource,
                templatingVariable,
                systemUnderTestQuery,
              )
                .then((values) => {
                  const templatingVariableValues = _.uniq(values).map((v) => ({
                    label: v,
                    value: v,
                  }));

                  if (includeAll === true) {
                    templatingVariableValues.unshift({
                      label: 'All',
                      value: 'All',
                    });
                  }

                  callback(null, templatingVariableValues);
                })
                .catch((err) => {
                  log.error(
                    `Failed to get values for templating variable "${templatingVariable.name}" in Grafana dashboard "${grafanaDashboard.name}", error: ${err}`,
                  );
                });

              break;

            case 'graphite':
              getGraphiteVariables(
                grafanaInstance,
                grafanaDashboard,
                datasource,
                templatingVariable,
                systemUnderTestQuery,
              )
                .then((values) => {
                  const templatingVariableValues = _.uniq(values).map((v) => ({
                    label: v,
                    value: v,
                  }));

                  if (includeAll === true) {
                    templatingVariableValues.unshift({
                      label: 'All',
                      value: 'All',
                    });
                  }

                  callback(null, templatingVariableValues);
                })
                .catch((err) => {
                  log.error(
                    `Failed to get values for templating variable "${templatingVariable.name}" in Grafana dashboard "${grafanaDashboard.name}", error: ${err}`,
                  );
                });

              break;

            default:
              log.error(`Datasource of type ${datasource.type} not supported`);
          }
        },
      );

      break;

    default:
      log.error(`Variable of type ${templatingVariable.type} not supported`);
  }
};
