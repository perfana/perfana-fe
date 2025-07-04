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

import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { getTestRun, renderTestRunUrl, slugify } from '/imports/helpers/utils';
import { Meteor } from 'meteor/meteor';
import { dark } from '/imports/helpers/plotly_dark_template';
import { light } from '/imports/helpers/plotly_light_template';
import Plotly from 'plotly.js-dist';
import { log } from '/both/logger';

Template.visualizeDifferenceDs.onCreated(
  function visualizeDifferenceDsOnCreated() {
    this.divId = new ReactiveVar();

    // this.autorun(() => {
    //     let metricName = Template.currentData().metric.metricName;
    //     let applicationDashboardId = Template.currentData().metric.applicationDashboardId;
    //     let panelId = Template.currentData().metric.panelId;
    //     this.divId.set(`line-chart-ds-${applicationDashboardId}-${panelId}-${slugify(metricName)}`);
    // });
  },
);

Template.visualizeDifferenceDs.onRendered(
  function visualizeDifferenceOnRendered() {
    this.autorun(() => {
      Template.currentData().metric.metricName;
      const metricName = this.data.metric.metricName;
      const applicationDashboardId = this.data.metric.applicationDashboardId;
      const panelId = parseInt(this.data.metric.panelId);
      const controlGroupId = this.data.metric.controlGroupId;
      const showTitle = this.data.showTitle;
      const testRun = getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        this.data.testRunId,
      );
      const metric = this.data.metric;
      const plotlyDiv = `line-chart-ds-${applicationDashboardId}-${panelId}-${slugify(metricName)}`;
      this.divId.set(plotlyDiv);

      if (testRun) {
        const dsMetricsQuery = {
          $and: [
            { testRunId: testRun.testRunId },
            { panelId: panelId },
            { applicationDashboardId: applicationDashboardId },
          ],
        };

        const dsPanelQuery = {
          $and: [
            { testRunId: testRun.testRunId },
            { panelId: panelId },
            { applicationDashboardId: applicationDashboardId },
          ],
        };

        const dsAdaptResultQuery = {
          $and: [
            { controlGroupId: controlGroupId },
            { panelId: panelId },
            { applicationDashboardId: applicationDashboardId },
            { metricName: metricName },
          ],
        };

        Meteor.call(
          'getDsMetrics',
          dsMetricsQuery,
          dsPanelQuery,
          dsAdaptResultQuery,
          testRun,
          (error, results) => {
            if (error) {
              log.error(error);
            } else {
              // if (results.data.length > 0) {
              const plotlyDivElement = document.getElementById(plotlyDiv);
              if (plotlyDivElement) {
                createPlotlyGraphDs(
                  results.data.dsMetrics,
                  metricName,
                  applicationDashboardId,
                  panelId,
                  showTitle,
                  testRun,
                  results.data.panelYAxesFormat,
                  metric,
                  results.data.dsAdaptResult,
                );
              }
              // }
            }
          },
        );
      }
    });
  },
);

Template.visualizeDifferenceDs.helpers({
  divId() {
    return Template.instance().divId.get();
  },
  applicationDashboardId() {
    return Template.instance().applicationDashboardId.get();
  },
  panelId() {
    return Template.instance().panelId.get();
  },
  metricName() {
    return Template.instance().metricName.get();
  },
});

export const createPlotlyGraphDs = (
  dsMetricsPanelsTestRun,
  metricName,
  applicationDashboardId,
  panelId,
  showTitle,
  testRun,
  panelYAxesFormat,
  metric,
  dsAdaptResult,
) => {
  const x = [];
  const y = [];

  let test;
  let maxDataPointTest;
  let minDataPointTest;
  let graphUnit = panelYAxesFormat ? panelYAxesFormat : '';

  dsMetricsPanelsTestRun.forEach((metricPanel) => {
    metricPanel.data.forEach((dataPoint) => {
      if (dataPoint.metricName === metricName) {
        if (
          dataPoint.value !== undefined &&
          dataPoint.value !== null &&
          dataPoint.timestep >= 0
        ) {
          // Track the maximum and minimum data point value
          if (
            maxDataPointTest === undefined ||
            dataPoint.value > maxDataPointTest
          ) {
            maxDataPointTest = dataPoint.value;
          }
          if (
            minDataPointTest === undefined ||
            dataPoint.value < minDataPointTest
          ) {
            minDataPointTest = dataPoint.value;
          }
          x.push(dataPoint.time);
          y.push(dataPoint.value);
        }
      }
    });
  });

  // If unit is 'percentunit' convert to percentage
  if (panelYAxesFormat === 'percentunit') {
    y.forEach((item, index) => {
      y[index] = item * 100;
    });
  }

  // If unit is 'seconds' and all data points are under 1, convert to 'ms'
  if (panelYAxesFormat === 's' && maxDataPointTest < 1) {
    y.forEach((item, index) => {
      y[index] = item * 1000;
    });
    graphUnit = 'ms';
  }
  // If unit is 'ms' and all data points are over 1000, convert to 'sec'
  else if (panelYAxesFormat === 'ms' && minDataPointTest > 1000) {
    y.forEach((item, index) => {
      y[index] = item / 1000;
    });
    graphUnit = 's';
  }

  let rectColor;
  let theme;

  const user = Meteor.user();

  if (user && user.profile.theme) {
    rectColor = user.profile.theme === 'dark' ? '#3D3E3FFF' : '#dde4ed';
    theme = user.profile.theme === 'dark' ? dark : light;
  }

  if (x.length === 1) {
    test = {
      x: ['Test run'],
      y: [y[0]],
      type: 'bar',
      hovertemplate: `%{y} ${graphUnit === 'percentunit' ? '%' : graphUnit}<extra></extra>`,
      marker: {
        color: ['rgb(77,89,231)', 'rgba(38,210,52,0.8)', 'rgba(222,45,38,0.8)'],
      },
    };

    const layout = {
      template: theme,
      title: showTitle ? `${metricName}` : '',
      yaxis: {
        title:
          graphUnit === 'short' ? ''
          : graphUnit === 'percentunit' ? '%'
          : graphUnit,
      },
      hovermode: false,
    };

    const data = [test];

    const sluggifiedMetricName = slugify(metricName);

    Plotly.newPlot(
      `line-chart-ds-${applicationDashboardId}-${panelId}-${sluggifiedMetricName}`,
      data,
      layout,
      { displayModeBar: false },
    );
  } else {
    test = {
      name: 'Test run',
      x: x,
      y: y,
      type: 'scatter',
      mode: 'lines+markers',
      hovertemplate: `%{y} ${graphUnit === 'percentunit' ? '%' : graphUnit}<extra></extra>`,
      connectgaps: true,
      line: {
        color: 'rgb(243,172,42)',
      },
    };

    const darkgreen = 'rgba(10,155,10,0.4)';
    const lightgreen = 'rgba(0, 255, 0, 0.25)';
    const turquoise = 'rgb(20,191,191)';

    const minXValue = Math.min(...test.x);
    const maxXValue = Math.max(...test.x);
    const threholds = [];
    let data;

    if (dsAdaptResult) {
      let row = {
        lowerThreshold: dsAdaptResult.thresholds.lower.overall,
        upperThreshold: dsAdaptResult.thresholds.upper.overall,
      };
      if (panelYAxesFormat === 'percentunit') {
        row = {
          lowerThreshold: dsAdaptResult.thresholds.lower.overall * 100,
          upperThreshold: dsAdaptResult.thresholds.upper.overall * 100,
        };
      }

      // If unit is 'seconds' and all data points are under 1, convert to 'ms'
      if (panelYAxesFormat === 's' && maxDataPointTest < 1) {
        row = {
          lowerThreshold: dsAdaptResult.thresholds.lower.overall * 1000,
          upperThreshold: dsAdaptResult.thresholds.upper.overall * 1000,
        };
      }

      if (panelYAxesFormat === 'ms' && minDataPointTest > 1000) {
        row = {
          lowerThreshold: dsAdaptResult.thresholds.lower.overall / 1000,
          upperThreshold: dsAdaptResult.thresholds.upper.overall / 1000,
        };
      }

      threholds.push({
        x: [minXValue, maxXValue],
        y: [row['lowerThreshold'], row['lowerThreshold']],
        name: 'Upper threshold',
        // hoverinfo: 'none',
        hovertext: `Upper threshold`,
        line: {
          color: turquoise,
        },
        type: 'scatter',
        mode: 'lines',
        showlegend: true,
      });

      threholds.push({
        x: [minXValue, maxXValue],
        y: [row['upperThreshold'], row['upperThreshold']],
        name: 'Lower threshold',
        // hoverinfo: 'none',
        hovertext: `Lower threshold`,

        line: {
          color: darkgreen,
        },
        type: 'scatter',
        mode: 'lines',
        fill: 'tonexty',
        fillcolor: lightgreen,
        showlegend: true,
      });
    }

    const layout = {
      template: theme,
      height: '100%',
      legend: {
        orientation: 'h',
        yanchor: 'bottom',
        y: -0.4,
        xanchor: 'left',
        x: 0,
      },
      xaxis: {
        range: [minXValue, maxXValue],
        showgrid: true, // grid lines are shown
        showline: true, // zero line is shown
        visible: true,
        type: 'date',
        tickformatstops: [
          {
            dtickrange: [null, 1000], // up to a second
            value: '%H:%M:%S.%L ms',
          },
          {
            dtickrange: [1000, 60000], // up to a minute
            value: '%H:%M:%S',
          },
          {
            dtickrange: [60000, 86400000], // up to a day
            value: '%H:%M',
          },
          {
            dtickrange: [86400000, null], // more than a day
            value: '%Y-%m-%d %H:%M',
          },
        ],
      },
      yaxis: {
        // range: [0, maxYValue * 1.1],
        rangemode: 'tozero',
        title:
          graphUnit === 'short' ? ''
          : graphUnit === 'percentunit' ? '%'
          : graphUnit,
        // showgrid: true, // grid lines are shown
        showline: true, // zero line is shown
        // gridcolor: gridcolor
        // visible: true,  // y-axis labels and ticks are shown
      },
      title:
        x.length === 0 ? 'No data available'
        : showTitle ?
          `${metric.dashboardLabel}<br>${metric.panelTitle}<br>${metricName}`
        : '',
      hovermode: 'x',
      shapes: [
        {
          type: 'rect',
          x0: minXValue,
          y0: 0,
          x1: new Date(
            new Date(testRun.start).getTime() + testRun.rampUp * 1000,
          ),
          y1: 1,
          yref: 'paper',
          line: { width: 0 },
          fillcolor: rectColor,
          layer: 'below',
        },
      ],
    };

    if (dsAdaptResult) {
      data = threholds.concat([test]);
    } else {
      data = threholds.concat([test]);
    }

    Meteor.setTimeout(() => {
      const sluggifiedMetricName = slugify(metricName);

      Plotly.react(
        `line-chart-ds-${applicationDashboardId}-${panelId}-${sluggifiedMetricName}`,
        data,
        layout,
        { displayModeBar: false },
      );

      const plotlyDivElement = document.getElementById(
        `line-chart-ds-${applicationDashboardId}-${panelId}-${sluggifiedMetricName}`,
      );

      plotlyDivElement.on('plotly_click', (data) => {
        const testRunId = data.points[2].hovertext
          .split('<br>')[0]
          .split(': ')[1];
        window.open(
          renderTestRunUrl(
            FlowRouter.current().queryParams.systemUnderTest,
            FlowRouter.current().queryParams.workload,
            FlowRouter.current().queryParams.testEnvironment,
            testRunId,
          ),
          '_blank',
        );
      });
    }, 100);
  }
};
