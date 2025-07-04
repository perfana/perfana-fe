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

import fetch from 'node-fetch';
import { Meteor } from 'meteor/meteor';
import { log } from '../../../both/logger';

const getPerfanaDsApiUrl = () => {
  return Meteor.settings.perfanaDsApiUrl || 'http://localhost:8080';
};

const getAuthHeader = () => {
  const user = Meteor.settings.perfanaApiUser || 'admin@perfana.io';
  const password = Meteor.settings.perfanaApiPassword || 'perfana';
  const auth = Buffer.from(`${user}:${password}`).toString('base64');
  return `Basic ${auth}`;
};

export const perfanaDsApiPost = async (
  endpoint,
  postData,
  queryParams = {},
) => {
  const baseUrl = getPerfanaDsApiUrl();
  let url = baseUrl + endpoint;
  const query = new URLSearchParams(queryParams).toString();
  if (query) {
    url += `?${query}`;
  }
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify(postData),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    return response.json();
  } catch (err) {
    log.error(`perfana-ds-api POST ${url} failed: ${err}`);
    throw err;
  }
};
export const REEVALUATE_BATCH_ENDPOINT = '/data/reevaluate/batch';
export const REFRESH_BATCH_ENDPOINT = '/data/refresh/batch';
// Helper to call the correct endpoint for batch processing
export const callBatchProcess = async (
  type,
  testRunIds,
  adaptEnabled = false,
) => {
  let endpoint;
  let queryParams = {};
  if (type === 'RE_EVALUATE') {
    endpoint = REEVALUATE_BATCH_ENDPOINT;
    queryParams = { adapt: adaptEnabled, checks: true };
  } else if (type === 'REFRESH') {
    endpoint = REFRESH_BATCH_ENDPOINT;
    queryParams = { adapt: adaptEnabled };
  } else {
    throw new Error(`Unknown batch process type: ${type}`);
  }
  return perfanaDsApiPost(endpoint, testRunIds, queryParams);
};
