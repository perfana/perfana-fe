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

import { 
  grafanaApiGetBasicAuth,
  grafanaApiPutBasicAuth,
  grafanaApiPatchBasicAuth,
  grafanaApiPostBasicAuth
} from '../grafana-api-basic-auth';
import fetch from 'node-fetch';

// Mock node-fetch
jest.mock('node-fetch');

// Mock Meteor
global.Meteor = {
  settings: {
    grafanaInstances: [
      {
        label: 'test-grafana',
        username: 'testuser',
        password: 'testpass',
        serverUrl: 'http://grafana-server',
        clientUrl: 'http://grafana-client'
      }
    ]
  }
};

// Mock logger
jest.mock('../../../../both/logger', () => ({
  log: {
    error: jest.fn()
  }
}));

describe('grafana-api-basic-auth', () => {
  const mockGrafana = { label: 'test-grafana' };
  const mockEndpoint = '/api/test';
  const mockPostData = { key: 'value' };
  const expectedAuth = 'Basic dGVzdHVzZXI6dGVzdHBhc3M=';
  const expectedHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': expectedAuth
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('grafanaApiGetBasicAuth', () => {
    it('should make GET request with correct headers and auth', async () => {
      const mockResponse = { data: 'test' };
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      });

      const result = await grafanaApiGetBasicAuth(mockGrafana, mockEndpoint);

      expect(fetch).toHaveBeenCalledWith(
        'http://grafana-server/api/test',
        {
          headers: expectedHeaders
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should use clientUrl when serverUrl is not available', async () => {
      // Modify settings to remove serverUrl
      const originalSettings = { ...Meteor.settings };
      Meteor.settings = {
        grafanaInstances: [{
          ...Meteor.settings.grafanaInstances[0],
          serverUrl: null
        }]
      };

      const mockResponse = { data: 'test' };
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      });

      await grafanaApiGetBasicAuth(mockGrafana, mockEndpoint);

      expect(fetch).toHaveBeenCalledWith(
        'http://grafana-client/api/test',
        expect.any(Object)
      );

      // Restore original settings
      Meteor.settings = originalSettings;
    });

    it('should handle fetch errors', async () => {
      const mockError = new Error('Network error');
      fetch.mockRejectedValueOnce(mockError);

      await grafanaApiGetBasicAuth(mockGrafana, mockEndpoint);

      expect(require('../../../../both/logger').log.error).toHaveBeenCalledWith(mockError);
    });
  });

  describe('grafanaApiPutBasicAuth', () => {
    it('should make PUT request with correct options', async () => {
      const mockResponse = { data: 'test' };
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      });

      const result = await grafanaApiPutBasicAuth(mockGrafana, mockEndpoint, mockPostData);

      expect(fetch).toHaveBeenCalledWith(
        'http://grafana-server/api/test',
        {
          method: 'PUT',
          headers: expectedHeaders,
          body: JSON.stringify(mockPostData)
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle fetch errors', async () => {
      const mockError = new Error('Network error');
      fetch.mockRejectedValueOnce(mockError);

      await grafanaApiPutBasicAuth(mockGrafana, mockEndpoint, mockPostData);

      expect(require('../../../../both/logger').log.error).toHaveBeenCalledWith(mockError);
    });
  });

  describe('grafanaApiPatchBasicAuth', () => {
    it('should make PATCH request with correct options', async () => {
      const mockResponse = { data: 'test' };
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      });

      const result = await grafanaApiPatchBasicAuth(mockGrafana, mockEndpoint, mockPostData);

      expect(fetch).toHaveBeenCalledWith(
        'http://grafana-server/api/test',
        {
          method: 'PATCH',
          headers: expectedHeaders,
          body: JSON.stringify(mockPostData)
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle fetch errors', async () => {
      const mockError = new Error('Network error');
      fetch.mockRejectedValueOnce(mockError);

      await grafanaApiPatchBasicAuth(mockGrafana, mockEndpoint, mockPostData);

      expect(require('../../../../both/logger').log.error).toHaveBeenCalledWith(mockError);
    });
  });

  describe('grafanaApiPostBasicAuth', () => {
    it('should make POST request with correct options', async () => {
      const mockResponse = { data: 'test' };
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      });

      const result = await grafanaApiPostBasicAuth(mockGrafana, mockEndpoint, mockPostData);

      expect(fetch).toHaveBeenCalledWith(
        'http://grafana-server/api/test',
        {
          method: 'POST',
          headers: expectedHeaders,
          body: JSON.stringify(mockPostData)
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle fetch errors', async () => {
      const mockError = new Error('Network error');
      fetch.mockRejectedValueOnce(mockError);

      await grafanaApiPostBasicAuth(mockGrafana, mockEndpoint, mockPostData);

      expect(require('../../../../both/logger').log.error).toHaveBeenCalledWith(mockError);
    });
  });
}); 