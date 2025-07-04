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

import { grafanaCall } from '../grafana/grafana-api-with-api-key';
// noinspection ES6PreferShortImport
import { log } from '../../../both/logger';
module.exports.getGraphiteVariables = (
  grafana,
  grafanaDashboard,
  datasource,
  variable,
  systemUnderTestQuery,
) => {
  return new Promise((resolve, reject) => {
    const queryUrl =
      '/api/datasources/proxy/' +
      datasource.id +
      '/metrics/find?query=' +
      systemUnderTestQuery;

    const variableValues = [];

    grafanaCall(grafana, queryUrl, (err, variableValuesResponse) => {
      if (err) {
        log.error(
          `##### Error getting values for query "${queryUrl}" for variable "${variable.name}" in dashboard "${grafanaDashboard.name}" from grafana instance "${grafana.label}", ${err.stack}`,
        );
        reject(err);
      }

      if (variableValuesResponse) {
        variableValuesResponse.forEach((value) => {
          const variableValue = value.text;
          let valueAfterRegex = '';

          if (variable.regex && variable.regex !== '') {
            const valueRegex = new RegExp(variable.regex.slice(1, -1)); // remove '/' from start and end
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
