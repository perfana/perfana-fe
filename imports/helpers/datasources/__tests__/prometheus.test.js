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

import { getPrometheusVariables } from '../prometheus';
import { grafanaCall } from '../../grafana/grafana-api-with-api-key';

describe('prometheus helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPrometheusVariables', () => {
    const mockGrafana = { label: 'test-grafana' };
    const mockDashboard = { name: 'test-dashboard' };
    const mockDatasource = { id: '123' };
    
    test('handles label_values query correctly', async () => {
      const mockVariable = { name: 'test_var' };
      const mockQuery = 'label_values(metric_name, label)';
      const mockResponse = {
        data: [
          { label: 'value1' },
          { label: 'value2' }
        ]
      };

      grafanaCall.mockImplementation((grafana, url, callback) => {
        callback(null, mockResponse);
      });

      const result = await getPrometheusVariables(
        mockGrafana,
        mockDashboard,
        mockDatasource,
        mockVariable,
        mockQuery
      );

      expect(result).toEqual(['value1', 'value2']);
      expect(grafanaCall).toHaveBeenCalledTimes(1);
      expect(grafanaCall.mock.calls[0][1]).toContain('/api/v1/series?match[]=metric_name');
    });

    test('handles simple label query correctly', async () => {
      const mockVariable = { name: 'test_var' };
      const mockQuery = 'simple_query';
      const mockResponse = {
        data: ['value1', 'value2']
      };

      grafanaCall.mockImplementation((grafana, url, callback) => {
        callback(null, mockResponse);
      });

      const result = await getPrometheusVariables(
        mockGrafana,
        mockDashboard,
        mockDatasource,
        mockVariable,
        mockQuery
      );

      expect(result).toEqual(['value1', 'value2']);
      expect(grafanaCall).toHaveBeenCalledTimes(1);
      expect(grafanaCall.mock.calls[0][1]).toContain('/api/v1/label/test_var/values');
    });

    test('handles regex filtering correctly', async () => {
      const mockVariable = { 
        name: 'test_var',
        regex: '/^test-(.*)/'
      };
      const mockQuery = 'simple_query';
      const mockResponse = {
        data: ['test-value1', 'test-value2', 'ignore-this']
      };

      grafanaCall.mockImplementation((grafana, url, callback) => {
        callback(null, mockResponse);
      });

      const result = await getPrometheusVariables(
        mockGrafana,
        mockDashboard,
        mockDatasource,
        mockVariable,
        mockQuery
      );

      expect(result).toEqual(['value1', 'value2', 'ignore-this']);
    });

    test('handles errors correctly', async () => {
      const mockVariable = { name: 'test_var' };
      const mockQuery = 'simple_query';
      const mockError = new Error('Test error');

      grafanaCall.mockImplementation((grafana, url, callback) => {
        callback(mockError);
      });

      await expect(getPrometheusVariables(
        mockGrafana,
        mockDashboard,
        mockDatasource,
        mockVariable,
        mockQuery
      )).rejects.toThrow('Test error');
    });
  });
}); 