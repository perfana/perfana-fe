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

jest.mock('../../grafana/grafana-api-with-api-key');
jest.mock('../../../../both/logger', () => ({
  log: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn()
  }
}));

import { getGraphiteVariables } from '../graphite';
import { grafanaCall } from '../../grafana/grafana-api-with-api-key';

describe('graphite helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGraphiteVariables', () => {
    const mockGrafana = { label: 'test-grafana' };
    const mockDashboard = { name: 'test-dashboard' };
    const mockDatasource = { id: '123' };
    
    test('handles basic metrics query correctly', async () => {
      const mockVariable = { name: 'server' };
      const mockQuery = 'servers.*';
      const mockResponse = [
        { text: 'server1', id: 'servers.server1' },
        { text: 'server2', id: 'servers.server2' }
      ];

      grafanaCall.mockImplementation((grafana, url, callback) => {
        callback(null, mockResponse);
      });

      const result = await getGraphiteVariables(
        mockGrafana,
        mockDashboard,
        mockDatasource,
        mockVariable,
        mockQuery
      );

      expect(result).toEqual(['server1', 'server2']);
      expect(grafanaCall).toHaveBeenCalledTimes(1);
      expect(grafanaCall.mock.calls[0][1]).toBe('/api/datasources/proxy/123/metrics/find?query=servers.*');
    });

    test('handles regex filtering correctly', async () => {
      const mockVariable = { 
        name: 'server',
        regex: '/^prod-(.*)/'
      };
      const mockQuery = 'servers.*';
      const mockResponse = [
        { text: 'prod-app1', id: 'servers.prod-app1' },
        { text: 'prod-app2', id: 'servers.prod-app2' },
        { text: 'dev-app3', id: 'servers.dev-app3' }
      ];

      grafanaCall.mockImplementation((grafana, url, callback) => {
        callback(null, mockResponse);
      });

      const result = await getGraphiteVariables(
        mockGrafana,
        mockDashboard,
        mockDatasource,
        mockVariable,
        mockQuery
      );

      expect(result).toEqual(['app1', 'app2', 'dev-app3']);
    });

    test('handles empty response correctly', async () => {
      const mockVariable = { name: 'server' };
      const mockQuery = 'servers.*';
      const mockResponse = [];

      grafanaCall.mockImplementation((grafana, url, callback) => {
        callback(null, mockResponse);
      });

      const result = await getGraphiteVariables(
        mockGrafana,
        mockDashboard,
        mockDatasource,
        mockVariable,
        mockQuery
      );

      expect(result).toEqual([]);
      expect(grafanaCall).toHaveBeenCalledTimes(1);
    });

    test('handles null response correctly', async () => {
      const mockVariable = { name: 'server' };
      const mockQuery = 'servers.*';
      const mockResponse = null;

      grafanaCall.mockImplementation((grafana, url, callback) => {
        callback(null, mockResponse);
      });

      const result = await getGraphiteVariables(
        mockGrafana,
        mockDashboard,
        mockDatasource,
        mockVariable,
        mockQuery
      );

      expect(result).toEqual([]);
      expect(grafanaCall).toHaveBeenCalledTimes(1);
    });

    test('handles errors correctly', async () => {
      const mockVariable = { name: 'server' };
      const mockQuery = 'servers.*';
      const mockError = new Error('Test error');

      grafanaCall.mockImplementation((grafana, url, callback) => {
        callback(mockError);
      });

      await expect(getGraphiteVariables(
        mockGrafana,
        mockDashboard,
        mockDatasource,
        mockVariable,
        mockQuery
      )).rejects.toThrow('Test error');
    });

    test('deduplicates values correctly', async () => {
      const mockVariable = { name: 'server' };
      const mockQuery = 'servers.*';
      const mockResponse = [
        { text: 'server1', id: 'servers.server1' },
        { text: 'server1', id: 'servers.server1.duplicate' },
        { text: 'server2', id: 'servers.server2' }
      ];

      grafanaCall.mockImplementation((grafana, url, callback) => {
        callback(null, mockResponse);
      });

      const result = await getGraphiteVariables(
        mockGrafana,
        mockDashboard,
        mockDatasource,
        mockVariable,
        mockQuery
      );

      expect(result).toEqual(['server1', 'server2']);
      expect(grafanaCall).toHaveBeenCalledTimes(1);
    });
  });
}); 