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

import _ from 'lodash';
import { grafanaCall } from '../grafana/grafana-api-with-api-key';
// noinspection ES6PreferShortImport
import { log } from '../../../both/logger';

// Helper function to safely get nested property values
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current && current[key], obj);
};

module.exports.getPrometheusVariables = (
  grafana,
  grafanaDashboard,
  datasource,
  variable,
  systemUnderTestQuery,
) => {
  return new Promise((resolve, reject) => {
    let queryUrl;

    const queryRegex = new RegExp('label_values\\((.*),\\s*([^)]+)\\)');

    if (queryRegex.test(systemUnderTestQuery)) {
      const metric = queryRegex.exec(systemUnderTestQuery)[1];

      queryUrl =
        '/api/datasources/proxy/' +
        datasource.id +
        '/api/v1/series?match[]=' +
        metric +
        '&start=' +
        Math.round(
          new Date(new Date().setDate(new Date().getDate() - 1)).getTime() /
            1000,
        ) +
        '&end=' +
        Math.round(new Date().getTime() / 1000);
    } else {
      queryUrl =
        '/api/datasources/proxy/' +
        datasource.id +
        '/api/v1/label/' +
        variable.name +
        '/values';
    }

    const variableValues = [];

    grafanaCall(grafana, queryUrl, (err, variableValuesResponse) => {
      if (err) {
        log.error(
          `##### Error getting values for query "${queryUrl}" for variable "${variable.name}" in dashboard "${grafanaDashboard.name}" from grafana instance "${grafana.label}", ${err}`,
        );
        reject(err);
      }

      if (queryRegex.test(systemUnderTestQuery)) {
        const property = queryRegex.exec(systemUnderTestQuery)[2];
        const results = [];

        // Extract values from the response data
        if (variableValuesResponse && variableValuesResponse.data) {
          variableValuesResponse.data.forEach((item) => {
            const value = getNestedValue(item, property);
            if (value !== undefined) {
              results.push(value);
            }
          });
        }

        _.each(_.uniq(results), (variableValue) => {
          let valueAfterRegex = '';

          if (variable.regex && variable.regex !== '') {
            const valueRegex = new RegExp(variable.regex.slice(1, -1));
            const matches = variableValue.match(valueRegex);

            if (matches) {
              _.each(matches, (match, index) => {
                if (Number(index) > 0) valueAfterRegex += match;
              });
            }
          }

          const pushValue =
            valueAfterRegex !== '' ? valueAfterRegex : variableValue;
          if (variableValues.indexOf(pushValue) === -1)
            variableValues.push(pushValue);
        });
      } else {
        _.each(variableValuesResponse.data, (variableValue) => {
          let valueAfterRegex = '';

          if (variable.regex && variable.regex !== '') {
            const valueRegex = new RegExp(variable.regex.slice(1, -1));
            const matches = variableValue.match(valueRegex);

            if (matches) {
              matches.forEach((match, i) => {
                if (i > 0) valueAfterRegex += match;
              });
            }
          }

          const pushValue =
            valueAfterRegex !== '' ? valueAfterRegex : variableValue;
          if (variableValues.indexOf(pushValue) === -1)
            variableValues.push(pushValue);
        });
      }

      resolve(variableValues);
    });
  });
};
