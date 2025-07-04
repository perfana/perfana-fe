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
import { log } from '/both/logger';

import {
  slugify,
  dynamicSort,
  formatDate,
  renderTestRunUrl,
} from '../../../helpers/utils';
import { Meteor } from 'meteor/meteor';
import { DsPanels } from '../../../collections/dsPanels';
import { dark } from '../../../helpers/plotly_dark_template';
import { light } from '../../../helpers/plotly_light_template';
import Plotly from 'plotly.js-dist';
import './visualizeTrends.html';

Template.visualizeTrends.onCreated(function visualizeTrendsOnCreated() {
  this.divId = new ReactiveVar();
});

Template.visualizeTrends.onRendered(function visualizeDifferenceOnRendered() {
  this.autorun(() => {
    if (
      Template.currentData().metric &&
      Template.currentData().periodTimestamp &&
      Template.currentData().aggregation
    ) {
      // eslint-disable-next-line no-unused-vars
      const dummyMetricName = Template.currentData().metric.metricName;
      const application = FlowRouter.current().queryParams.systemUnderTest;
      const testEnvironment = FlowRouter.current().queryParams.testEnvironment;
      const testType = FlowRouter.current().queryParams.workload;
      const metricName = this.data.metric.metricName;
      const applicationDashboardId = this.data.metric.applicationDashboardId;
      const panelId = parseInt(this.data.metric.panelId);
      const showTitle = this.data.showTitle;
      const periodTimestamp = Template.currentData().periodTimestamp;
      const aggregation = Template.currentData().aggregation;
      const dsPanelQuery = {
        $and: [
          { applicationDashboardId: applicationDashboardId },
          { panelId: panelId },
        ],
      };

      const plotlyDiv = `line-chart-ds-${applicationDashboardId}-${panelId}-${slugify(metricName)}`;
      this.divId.set(plotlyDiv);
      if (Meteor.subscribe('dsPanels', dsPanelQuery).ready()) {
        const panel = DsPanels.findOne({
          $and: [
            { panelId: panelId },
            { applicationDashboardId: applicationDashboardId },
          ],
        });

        const panelYAxesFormat =
          (
            panel.panel &&
            panel.panel.fieldConfig &&
            panel.panel.fieldConfig.defaults &&
            panel.panel.fieldConfig.defaults.unit
          ) ?
            panel.panel.fieldConfig.defaults.unit
          : '';

        const trendsQuery = {
          applicationDashboardId: applicationDashboardId,
          panelId: panelId,
          metricName: metricName,
          testRunStart: {
            $gte: new Date(periodTimestamp),
          },
        };

        Meteor.call(
          'getDsMetricStatisticsTrends',
          trendsQuery,
          this.data.adaptEnabled,
          application,
          testEnvironment,
          testType,
          new Date(periodTimestamp),
          (err, dsMetricStatistics) => {
            if (dsMetricStatistics.error) {
              log.error(JSON.stringify(dsMetricStatistics.error));
            } else {
              const plotlyDivElement = document.getElementById(plotlyDiv);
              if (plotlyDivElement)
                createPlotlyGraphTrends(
                  dsMetricStatistics.data,
                  metricName,
                  applicationDashboardId,
                  panelId,
                  showTitle,
                  panelYAxesFormat,
                  aggregation,
                  this.data.adaptEnabled,
                );
            }
          },
        );
      }
    }
  });
});

Template.visualizeTrends.helpers({
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

export const createPlotlyGraphTrends = (
  trendTestRuns,
  metricName,
  applicationDashboardId,
  panelId,
  showTitle,
  panelYAxesFormat,
  aggregation,
  adaptEnabled,
) => {
  const x = [];
  const y = [];
  const thresholdUpperX = [];
  const thresholdUpperY = [];
  const thresholdLowerX = [];
  const thresholdLowerY = [];
  let test;
  let data;
  let thresholdUpper;
  let thresholdLower;
  let thresholdUpperValue;
  let thresholdLowerValue;
  let maxDataPointTest;
  let minDataPointTest;
  let maxDataPointThresholdUpper;
  let minDataPointThresholdUpper;
  let maxDataPointThresholdLower;
  let minDataPointThresholdLower;
  let graphUnit = panelYAxesFormat ? panelYAxesFormat : '';
  const pointLabels = [];
  const colors = [];

  trendTestRuns.sort(dynamicSort('index')).forEach((trendTestRun) => {
    // Track the maximum and minimum data point value
    if (
      maxDataPointTest === undefined ||
      trendTestRun[aggregation] > maxDataPointTest
    ) {
      maxDataPointTest =
        adaptEnabled ?
          trendTestRun[aggregation].test
        : trendTestRun[aggregation];
      // maxDataPointTest = trendTestRun[aggregation];
    }
    if (
      minDataPointTest === undefined ||
      trendTestRun[aggregation] < minDataPointTest
    ) {
      minDataPointTest =
        adaptEnabled ?
          trendTestRun[aggregation].test
        : trendTestRun[aggregation];
      // minDataPointTest = trendTestRun[aggregation];
    }

    x.push(trendTestRun.index);
    // x.push(trendTestRun.testRunStart);
    y.push(
      adaptEnabled ? trendTestRun[aggregation].test : trendTestRun[aggregation],
    );
    // y.push(trendTestRun[aggregation]);
    pointLabels.push(
      `Test run ID: ${trendTestRun.testRunId}<br>Date: ${formatDate(trendTestRun.testRunStart)}<br>Version: ${trendTestRun.applicationRelease}<br>Annotations: ${trendTestRun.annotations}<br>Click to open test run`,
    );

    if (
      trendTestRun.conclusion &&
      trendTestRun.conclusion.label === 'regression'
    ) {
      colors.push('rgba(222,45,38,0.8)');
    } else {
      colors.push('rgb(77,89,231)');
    }

    thresholdUpperValue =
      adaptEnabled ? trendTestRun.thresholds.upper.overall : trendTestRun.q75;
    // thresholdUpperValue =  trendTestRun.q75;

    if (
      maxDataPointThresholdUpper === undefined ||
      thresholdUpperValue > maxDataPointThresholdUpper
    ) {
      maxDataPointThresholdUpper = thresholdUpperValue;
    }
    if (
      minDataPointThresholdUpper === undefined ||
      thresholdUpperValue < minDataPointThresholdUpper
    ) {
      minDataPointThresholdUpper = thresholdUpperValue;
    }

    // thresholdUpperX.push(trendTestRun.testRunStart);
    thresholdUpperX.push(trendTestRun.index);
    thresholdUpperY.push(thresholdUpperValue);

    thresholdLowerValue =
      adaptEnabled ? trendTestRun.thresholds.lower.overall : trendTestRun.q25;
    // thresholdLowerValue = trendTestRun.q25;

    if (
      maxDataPointThresholdLower === undefined ||
      thresholdLowerValue > maxDataPointThresholdLower
    ) {
      maxDataPointThresholdLower = thresholdLowerValue;
    }
    if (
      minDataPointThresholdLower === undefined ||
      thresholdLowerValue < minDataPointThresholdLower
    ) {
      minDataPointThresholdLower = thresholdLowerValue;
    }

    // thresholdLowerX.push(trendTestRun.testRunStart);
    thresholdLowerX.push(trendTestRun.index);
    thresholdLowerY.push(thresholdLowerValue);
  });

  // If unit is 'percentunit' convert to percentage
  if (panelYAxesFormat === 'percentunit') {
    y.forEach((item, index) => {
      y[index] = item * 100;
    });
    thresholdLowerY.forEach((item, index) => {
      thresholdLowerY[index] = item * 100;
    });
    thresholdUpperY.forEach((item, index) => {
      thresholdUpperY[index] = item * 100;
    });
  }

  // If unit is 'seconds' and all data points are under 1, convert to 'ms'
  if (panelYAxesFormat === 's' && maxDataPointTest < 1) {
    y.forEach((item, index) => {
      y[index] = item * 1000;
    });
    thresholdLowerY.forEach((item, index) => {
      thresholdLowerY[index] = item * 1000;
    });
    thresholdUpperY.forEach((item, index) => {
      thresholdUpperY[index] = item * 1000;
    });

    graphUnit = 'ms';
  }
  // If unit is 'ms' and all data points are over 1000, convert to 'sec'
  else if (panelYAxesFormat === 'ms' && minDataPointTest > 1000) {
    y.forEach((item, index) => {
      y[index] = item / 1000;
    });
    thresholdLowerY.forEach((item, index) => {
      thresholdLowerY[index] = item / 1000;
    });
    thresholdUpperY.forEach((item, index) => {
      thresholdUpperY[index] = item / 1000;
    });

    graphUnit = 's';
  }

  let rectColor;
  let theme;

  const user = Meteor.user();

  if (user && user.profile.theme) {
    theme = user.profile.theme === 'dark' ? dark : light;
  }

  const darkgreen = 'rgba(10,155,10,0.4)';
  const lightgreen = 'rgba(0, 255, 0, 0.25)';
  const turquoise = 'rgb(20,191,191)';

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
      hovertext: pointLabels,
      type: 'scatter',
      mode: 'lines+markers',
      marker: {
        color: colors, // apply mapped colors
        size: 7,
      },
    };

    thresholdLower = {
      name: adaptEnabled ? 'Lower threshold' : '25th percentile',
      // name: '25th percentile',
      x: thresholdLowerX,
      y: thresholdLowerY,
      // hovertext: 'Lower threshold',
      hoverinfo: 'none',
      type: 'scatter',
      mode: 'lines',
      fill: 'tonexty',
      fillcolor: lightgreen,
      line: {
        color: darkgreen,
      },
    };

    thresholdUpper = {
      name: adaptEnabled ? 'Upper threshold' : '75th percentile',
      // name: '75th percentile',
      x: thresholdUpperX,
      y: thresholdUpperY,
      // hovertext: 'Upper threshold',
      hoverinfo: 'none',
      line: {
        color: turquoise,
      },
      type: 'scatter',
      mode: 'lines',
    };

    const minXValue = Math.min(...test.x);
    const maxXValue = Math.max(...test.x);

    const range = maxXValue - minXValue; // Determine the range
    const paddingPercent = 1.5; // Define the padding as a percentage of the range
    const rangePadding = (range * paddingPercent) / 100; // Calculate the padding

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
        range: [minXValue - rangePadding, maxXValue + rangePadding],
        showgrid: true, // grid lines are shown
        showline: true, // zero line is shown
        visible: true,
      },
      yaxis: {
        // range: [0, maxYValue * 1.1],
        rangemode: 'tozero',
        // autorange: true,
        // fixedrange: false,
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
        (
          x.length === 0 &&
          thresholdLowerX.length === 0 &&
          thresholdUpperX.length === 0
        ) ?
          'No data available'
        : showTitle ? `${metricName} (${aggregation})`
        : '',
      hovermode: 'x',
    };

    data = [test, thresholdUpper, thresholdLower];
    // data = [ test, thresholdBar ];

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
