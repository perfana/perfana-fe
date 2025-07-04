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

// noinspection SqlNoDataSourceInspection

jest.mock('../../grafana/grafana-api-with-api-key');
jest.mock('../../../../both/logger', () => ({
  log: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn()
  }
}));

import { getInfluxVariables } from '../influxdb';
import { grafanaCall } from '../../grafana/grafana-api-with-api-key';

describe('influxdb helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getInfluxVariables', () => {
    const mockGrafana = { label: 'test-grafana' };
    const mockDashboard = { name: 'test-dashboard' };
    const mockDatasource = { id: '123', database: 'testdb' };
    
    test('handles show measurements query correctly', async () => {
      const mockVariable = { name: 'test_var' };
      const mockQuery = 'show measurements';
      const mockResponse = {
        results: [{
          series: [{
            values: [
              ['measurement1'],
              ['measurement2']
            ]
          }]
        }]
      };

      grafanaCall.mockImplementation((grafana, url, callback) => {
        callback(null, mockResponse);
      });

      const result = await getInfluxVariables(
        mockGrafana,
        mockDashboard,
        mockDatasource,
        mockVariable,
        mockQuery
      );

      expect(result).toEqual(['measurement1', 'measurement2']);
      expect(grafanaCall).toHaveBeenCalledTimes(1);
      expect(grafanaCall.mock.calls[0][1]).toContain('/query?db=testdb&q=show measurements');
    });

    test('handles regular query correctly', async () => {
      const mockVariable = { name: 'test_var' };
      const mockQuery = 'select distinct(host) from cpu';
      const mockResponse = {
        results: [{
          series: [{
            values: [
              ['time', 'host1'],
              ['time', 'host2']
            ]
          }]
        }]
      };

      grafanaCall.mockImplementation((grafana, url, callback) => {
        callback(null, mockResponse);
      });

      const result = await getInfluxVariables(
        mockGrafana,
        mockDashboard,
        mockDatasource,
        mockVariable,
        mockQuery
      );

      expect(result).toEqual(['host1', 'host2']);
      expect(grafanaCall).toHaveBeenCalledTimes(1);
      expect(grafanaCall.mock.calls[0][1]).toContain('/query?db=testdb&q=select distinct(host) from cpu');
    });

    test('handles regex filtering correctly', async () => {
      const mockVariable = { 
        name: 'test_var',
        regex: '/^test-(.*)/'
      };
      const mockQuery = 'show tag values from cpu with key = host';
      const mockResponse = {
        results: [{
          series: [{
            values: [
              ['time', 'test-host1'],
              ['time', 'test-host2'],
              ['time', 'ignore-this']
            ]
          }]
        }]
      };

      grafanaCall.mockImplementation((grafana, url, callback) => {
        callback(null, mockResponse);
      });

      const result = await getInfluxVariables(
        mockGrafana,
        mockDashboard,
        mockDatasource,
        mockVariable,
        mockQuery
      );

      expect(result).toEqual(['host1', 'host2', 'ignore-this']);
    });

    test('handles empty response correctly', async () => {
      const mockVariable = { name: 'test_var' };
      const mockQuery = 'show measurements';
      const mockResponse = {
        results: []
      };

      grafanaCall.mockImplementation((grafana, url, callback) => {
        callback(null, mockResponse);
      });

      const result = await getInfluxVariables(
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
      const mockVariable = { name: 'test_var' };
      const mockQuery = 'show measurements';
      const mockError = new Error('Test error');

      grafanaCall.mockImplementation((grafana, url, callback) => {
        callback(mockError);
      });

      await expect(getInfluxVariables(
        mockGrafana,
        mockDashboard,
        mockDatasource,
        mockVariable,
        mockQuery
      )).rejects.toThrow('Test error');
    });
  });
}); 