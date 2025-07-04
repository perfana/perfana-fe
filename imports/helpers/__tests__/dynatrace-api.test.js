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

// noinspection JSCheckFunctionSignatures

import fetch from 'node-fetch';

jest.mock('node-fetch');

// Mock Meteor before importing dynatrace-api
global.Meteor = {
  settings: {
    dynatraceApiToken: 'test-token',
    dynatraceUrl: 'https://dynatrace.example.com'
  }
};

import { dynatraceApiGet, dynatraceApiPost } from '../dynatrace-api';

describe('dynatrace-api', () => {
  const mockJsonResponse = { data: 'test-data' };
  const mockFetchResponse = {
    json: jest.fn().mockResolvedValue(mockJsonResponse)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockResolvedValue(mockFetchResponse);
    mockFetchResponse.json.mockResolvedValue(mockJsonResponse);
  });

  describe('dynatraceApiGet', () => {
    test('makes GET request with correct parameters', async () => {
      const endpoint = '/api/v1/entity';
      const expectedUrl = 'https://dynatrace.example.com/api/v1/entity';
      const expectedHeaders = {
        'Authorization': 'Api-Token test-token',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      const result = await dynatraceApiGet(endpoint);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(expectedUrl, {
        headers: expectedHeaders
      });
      expect(result).toEqual(mockJsonResponse);
    });

    test('handles fetch error correctly', async () => {
      const endpoint = '/api/v1/entity';
      const mockError = new Error('Network error');
      fetch.mockRejectedValueOnce(mockError);

      await expect(dynatraceApiGet(endpoint)).rejects.toThrow('Network error');
    });

    test('handles JSON parsing error', async () => {
      const endpoint = '/api/v1/entity';
      const mockError = new Error('Invalid JSON');
      fetch.mockResolvedValueOnce({
        ...mockFetchResponse,
        json: jest.fn().mockRejectedValueOnce(mockError)
      });

      await expect(dynatraceApiGet(endpoint)).rejects.toThrow('Invalid JSON');
    });
  });

  describe('dynatraceApiPost', () => {
    test('makes POST request with correct parameters', async () => {
      const endpoint = '/api/v1/events';
      const postData = { event: 'test-event' };
      const expectedUrl = 'https://dynatrace.example.com/api/v1/events';
      const expectedHeaders = {
        'Authorization': 'Api-Token test-token',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      const result = await dynatraceApiPost(endpoint, postData);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(expectedUrl, {
        method: 'POST',
        headers: expectedHeaders,
        body: JSON.stringify(postData)
      });
      expect(result).toEqual(mockJsonResponse);
    });

    test('handles fetch error correctly', async () => {
      const endpoint = '/api/v1/events';
      const postData = { event: 'test-event' };
      const mockError = new Error('Network error');
      fetch.mockRejectedValueOnce(mockError);

      await expect(dynatraceApiPost(endpoint, postData)).rejects.toThrow('Network error');
    });

    test('handles JSON parsing error', async () => {
      const endpoint = '/api/v1/events';
      const postData = { event: 'test-event' };
      const mockError = new Error('Invalid JSON');
      fetch.mockResolvedValueOnce({
        ...mockFetchResponse,
        json: jest.fn().mockRejectedValueOnce(mockError)
      });

      await expect(dynatraceApiPost(endpoint, postData)).rejects.toThrow('Invalid JSON');
    });

    test('handles empty post data correctly', async () => {
      const endpoint = '/api/v1/events';
      const postData = {};
      const expectedUrl = 'https://dynatrace.example.com/api/v1/events';
      const expectedHeaders = {
        'Authorization': 'Api-Token test-token',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      const result = await dynatraceApiPost(endpoint, postData);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(expectedUrl, {
        method: 'POST',
        headers: expectedHeaders,
        body: '{}'
      });
      expect(result).toEqual(mockJsonResponse);
    });
  });
}); 