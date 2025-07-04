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
import {
  slugify,
  dynamicSort,
  renderTestRunUrl,
  formatDate,
} from '/imports/helpers/utils';
import { Meteor } from 'meteor/meteor';
import { dark } from '/imports/helpers/plotly_dark_template';
import { light } from '/imports/helpers/plotly_light_template';
import Plotly from 'plotly.js-dist';
import './visualizeTrackedDifferences.html';
import { log } from '/both/logger';

Template.visualizeTrackedDifferences.onCreated(
  function visualizeTrackedDifferencesOnCreated() {
    this.divId = new ReactiveVar();

    // this.autorun(() => {
    //     let metricName = Template.currentData().metricName;
    //     let applicationDashboardId = Template.currentData().applicationDashboardId;
    //     let panelId = Template.currentData().panelId;
    //     this.divId.set(`line-chart-ds-${applicationDashboardId}-${panelId}-${slugify(metricName)}`);
    // });
  },
);

Template.visualizeTrackedDifferences.onRendered(
  function visualizeDifferenceOnRendered() {
    this.autorun(() => {
      Template.currentData().metricName;
      const metricName = this.data.metricName;
      const applicationDashboardId = this.data.applicationDashboardId;
      const panelId = parseInt(this.data.panelId);
      const dashboardLabel = this.data.dashboardLabel;
      const panelTitle = this.data.panelTitle;
      // let controlGroupId = this.data.metric.controlGroupId;
      const showTitle = this.data.showTitle;
      const showThresholdsLegend = this.data.showThresholdsLegend;
      const clickTestRunToOpenTestRun = this.data.clickTestRunToOpenTestRun;
      const plotlyDiv = `line-chart-ds-${applicationDashboardId}-${panelId}-${slugify(metricName)}`;
      this.divId.set(plotlyDiv);

      const dsTrackedDifferencesQuery = {
        $and: [
          { applicationDashboardId: applicationDashboardId },
          { panelId: panelId },
          { metricName: metricName },
        ],
      };

      const dsPanelQuery = {
        $and: [
          { applicationDashboardId: applicationDashboardId },
          { panelId: panelId },
        ],
      };

      const testRunQuery = {
        $and: [
          { application: FlowRouter.current().queryParams.systemUnderTest },
          { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
          { testType: FlowRouter.current().queryParams.workload },
        ],
      };

      Meteor.call(
        'getDsTrackedRegressions',
        dsTrackedDifferencesQuery,
        testRunQuery,
        this.data.testRunId,
        dsPanelQuery,
        (error, dsAdaptResults) => {
          if (error) {
            log.error(error);
          } else {
            if (dsAdaptResults.data.length > 0) {
              const plotlyDivElement = document.getElementById(plotlyDiv);
              if (plotlyDivElement) {
                createPlotlyGraphTrackedDifferences(
                  dsAdaptResults.data,
                  metricName,
                  applicationDashboardId,
                  panelId,
                  showTitle,
                  dashboardLabel,
                  panelTitle,
                  showThresholdsLegend,
                  clickTestRunToOpenTestRun,
                );
              }
            }
          }
        },
      );
    });
  },
);

Template.visualizeTrackedDifferences.helpers({
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

export const createPlotlyGraphTrackedDifferences = (
  dsAdaptResults,
  metricName,
  applicationDashboardId,
  panelId,
  showTitle,
  dashboardLabel,
  panelTitle,
  showThresholdsLegend,
  clickTestRunToOpenTestRun,
) => {
  const x = [];
  const y = [];
  const selectedTestRunX = [];
  const selectedTestRunY = [];
  const controlGroupX = [];
  const controlGroupY = [];
  const thresholdUpperX = [];
  const thresholdUpperY = [];
  const thresholdLowerX = [];
  const thresholdLowerY = [];
  let testRunsAfterSelectedTestRun;
  let selectedTestRun;
  let controlGroup;
  let thresholdUpper;
  let thresholdLower;
  let maxDataPointTest;
  let minDataPointTest;
  let maxDataPointThresholdUpper;
  let minDataPointThresholdUpper;
  let maxDataPointThresholdLower;
  let minDataPointThresholdLower;
  let graphUnit =
    dsAdaptResults[0].panelYAxesFormat ?
      dsAdaptResults[0].panelYAxesFormat
      : '';
  const pointLabels = [];
  const selectedTestRunPointLabels = [];
  const controlGroupPointLabels = [];
  const colors = [];
  const selectedTestRunColors = [];
  const controlGroupColors = [];

  dsAdaptResults
    .sort(dynamicSort('testRunStart'))
    .forEach((dsAdaptResult, testRunIndex) => {
      // Track the maximum and minimum data point value
      if (
        maxDataPointTest === undefined ||
        dsAdaptResult.statistic.test > maxDataPointTest
      ) {
        maxDataPointTest = dsAdaptResult.statistic.test;
      }
      if (
        minDataPointTest === undefined ||
        dsAdaptResult.statistic.test < minDataPointTest
      ) {
        minDataPointTest = dsAdaptResult.statistic.test;
      }
      if (dsAdaptResult.selectedTestRun === true) {
        // selectedTestRunX.push(dsAdaptResult.testRunStart);
        selectedTestRunX.push(testRunIndex);
        selectedTestRunY.push(dsAdaptResult.statistic.test);
        let selectedTestRunPointLabelsText = `Test run ID: ${dsAdaptResult.testRunId}<br>Date: ${formatDate(dsAdaptResult.testRunStart)}<br>Version: ${dsAdaptResult.applicationRelease}<br>Annotations: ${dsAdaptResult.annotations}`;
        if (clickTestRunToOpenTestRun === true) {
          selectedTestRunPointLabelsText += `<br>Click to open test run`;
        }
        selectedTestRunPointLabels.push(selectedTestRunPointLabelsText);
        selectedTestRunPointLabels.push(selectedTestRunPointLabelsText);

        if (dsAdaptResult.conclusion.label === 'regression') {
          selectedTestRunColors.push('rgba(222,45,38,0.8)');
        } else {
          selectedTestRunColors.push('rgb(77,89,231)');
        }
      }
      if (dsAdaptResult.controlGroup === true) {
        // controlGroupX.push(dsAdaptResult.testRunStart);
        controlGroupX.push(testRunIndex);
        controlGroupY.push(dsAdaptResult.statistic.test);
        // controlGroupPointLabels.push(`Test run ID: ${dsAdaptResult.testRunId}<br>Version: ${dsAdaptResult.applicationRelease}<br>Annotations: ${dsAdaptResult.annotations}<br>Click to open test run`);
        controlGroupPointLabels.push(
          `Test run ID: ${dsAdaptResult.testRunId}<br>Date: ${formatDate(dsAdaptResult.testRunStart)}<br>Version: ${dsAdaptResult.applicationRelease}<br>Annotations: ${dsAdaptResult.annotations}`,
        );
        if (dsAdaptResult.conclusion.label === 'regression') {
          controlGroupColors.push('rgba(222,45,38,0.8)');
        } else {
          controlGroupColors.push('rgb(77,89,231)');
        }
      }
      if (
        dsAdaptResult.controlGroup === false &&
        dsAdaptResult.selectedTestRun === false
      ) {
        // x.push(dsAdaptResult.testRunStart);
        x.push(testRunIndex);
        y.push(dsAdaptResult.statistic.test);
        pointLabels.push(
          `<!--Test run ID: ${dsAdaptResult.testRunId}<br>Version: ${dsAdaptResult.applicationRelease}<br>Annotations: ${dsAdaptResult.annotations}<br>Click to open test run-->`,
        );
        pointLabels.push(
          `Test run ID: ${dsAdaptResult.testRunId}<br>Date: ${formatDate(dsAdaptResult.testRunStart)}<br>Version: ${dsAdaptResult.applicationRelease}<br>Annotations: ${dsAdaptResult.annotations}`,
        );
        if (dsAdaptResult.conclusion.label === 'regression') {
          colors.push('rgba(222,45,38,0.8)');
        } else {
          colors.push('rgb(77,89,231)');
        }
      }

      if (
        maxDataPointThresholdUpper === undefined ||
        dsAdaptResult.thresholds.upper.overall > maxDataPointThresholdUpper
      ) {
        maxDataPointThresholdUpper = dsAdaptResult.thresholds.upper.overall;
      }
      if (
        minDataPointThresholdUpper === undefined ||
        dsAdaptResult.thresholds.upper.overall < minDataPointThresholdUpper
      ) {
        minDataPointThresholdUpper = dsAdaptResult.thresholds.upper.overall;
      }

      // thresholdUpperX.push(dsAdaptResult.testRunStart);
      thresholdUpperX.push(testRunIndex);
      thresholdUpperY.push(dsAdaptResult.thresholds.upper.overall);

      if (
        maxDataPointThresholdLower === undefined ||
        dsAdaptResult.thresholds.lower.overall > maxDataPointThresholdLower
      ) {
        maxDataPointThresholdLower = dsAdaptResult.thresholds.lower.overall;
      }
      if (
        minDataPointThresholdLower === undefined ||
        dsAdaptResult.thresholds.lower.overall < minDataPointThresholdLower
      ) {
        minDataPointThresholdLower = dsAdaptResult.thresholds.lower.overall;
      }

      // thresholdLowerX.push(dsAdaptResult.testRunStart);
      thresholdLowerX.push(testRunIndex);
      thresholdLowerY.push(dsAdaptResult.thresholds.lower.overall);
    });

  // If unit is 'percentunit' convert to percentage
  if (dsAdaptResults[0].panelYAxesFormat === 'percentunit') {
    y.forEach((item, index) => {
      y[index] = item * 100;
    });
    selectedTestRunY.forEach((item, index) => {
      selectedTestRunY[index] = item * 100;
    });
    controlGroupY.forEach((item, index) => {
      controlGroupY[index] = item * 100;
    });
    thresholdLowerY.forEach((item, index) => {
      thresholdLowerY[index] = item * 100;
    });
    thresholdUpperY.forEach((item, index) => {
      thresholdUpperY[index] = item * 100;
    });
  }

  // If unit is 'seconds' and all data points are under 1, convert to 'ms'
  if (dsAdaptResults[0].panelYAxesFormat === 's' && maxDataPointTest < 1) {
    y.forEach((item, index) => {
      y[index] = item * 1000;
    });
    selectedTestRunY.forEach((item, index) => {
      selectedTestRunY[index] = item * 1000;
    });
    controlGroupY.forEach((item, index) => {
      controlGroupY[index] = item * 1000;
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
  else if (
    dsAdaptResults[0].panelYAxesFormat === 'ms' &&
    minDataPointTest > 1000
  ) {
    y.forEach((item, index) => {
      y[index] = item / 1000;
    });
    selectedTestRunY.forEach((item, index) => {
      selectedTestRunY[index] = item / 1000;
    });
    controlGroupY.forEach((item, index) => {
      controlGroupY[index] = item / 1000;
    });
    thresholdLowerY.forEach((item, index) => {
      thresholdLowerY[index] = item / 1000;
    });
    thresholdUpperY.forEach((item, index) => {
      thresholdUpperY[index] = item / 1000;
    });
    graphUnit = 's';
  }

  let theme;

  const user = Meteor.user();

  if (user && user.profile.theme) {
    theme = user.profile.theme === 'dark' ? dark : light;
  }

  const darkgreen = 'rgba(10,155,10,0.4)';
  const lightgreen = 'rgba(0, 255, 0, 0.25)';
  const turquoise = 'rgb(20,191,191)';

  if (x.length + controlGroupX.length + selectedTestRunX.length === 1) {
    testRunsAfterSelectedTestRun = {
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

    const data = [testRunsAfterSelectedTestRun];

    const sluggifiedMetricName = slugify(metricName);

    Plotly.newPlot(
      `line-chart-ds-${applicationDashboardId}-${panelId}-${sluggifiedMetricName}`,
      data,
      layout,
      { displayModeBar: false },
    );
  } else {
    testRunsAfterSelectedTestRun = {
      name: 'Test runs after selected test run',
      x: x,
      y: y,
      hovertext: pointLabels,
      type: 'scatter',
      mode: 'markers',
      marker: {
        color: colors, // apply mapped colors
        size: 7,
        symbol: 'triangle-up',
      },
    };

    selectedTestRun = {
      // name: 'Selected test run',
      name: `Selected test run`,
      x: selectedTestRunX,
      y: selectedTestRunY,
      hovertext: selectedTestRunPointLabels,
      type: 'scatter',
      mode: 'markers',
      marker: {
        color: selectedTestRunColors, // apply mapped colors
        size: 7,
        symbol: 'cross',
      },
    };
    controlGroup = {
      name: 'Control group test runs',
      x: controlGroupX,
      y: controlGroupY,
      hovertext: controlGroupPointLabels,
      type: 'scatter',
      mode: 'markers',
      marker: {
        color: controlGroupColors, // apply mapped colors
        size: 7,
        symbol: 'square',
      },
    };

    thresholdLower = {
      name: 'Lower threshold',
      x: thresholdLowerX,
      y: thresholdLowerY,
      line: {
        color: darkgreen,
      },
      // hovertext: 'Lower threshold',
      hoverinfo: 'none',
      type: 'scatter',
      mode: 'lines',
      fill: 'tonexty',
      fillcolor: lightgreen,
      showlegend: showThresholdsLegend,
    };

    thresholdUpper = {
      name: 'Upper threshold',
      x: thresholdUpperX,
      y: thresholdUpperY,
      line: {
        color: turquoise,
      },
      // hovertext: 'Upper threshold',
      hoverinfo: 'none',
      type: 'scatter',
      mode: 'lines',
      showlegend: showThresholdsLegend,
    };

    const minXValue = Math.min(
      ...controlGroup.x,
      ...selectedTestRun.x,
      ...testRunsAfterSelectedTestRun.x,
      ...thresholdLower.x,
      ...thresholdUpper.x,
    );
    const maxXValue = Math.max(
      ...controlGroup.x,
      ...selectedTestRun.x,
      ...testRunsAfterSelectedTestRun.x,
      ...thresholdLower.x,
      ...thresholdUpper.x,
    );

    const xRange = maxXValue - minXValue; // Determine the range
    const xPaddingPercent = 1.5; // Define the padding as a percentage of the range
    const xRangePadding = (xRange * xPaddingPercent) / 100; // Calculate the padding

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
        range: [minXValue - xRangePadding, maxXValue + xRangePadding],
        // range: [minXValue, maxXValue],
        showgrid: true, // grid lines are shown
        showline: true, // zero line is shown
        visible: true,
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
        (
          x.length === 0 &&
          controlGroupX.length === 0 &&
          selectedTestRunX.length === 0 &&
          thresholdLowerX.length === 0 &&
          thresholdUpperX.length === 0
        ) ?
          'No data available'
          : showTitle ? `${dashboardLabel}<br>${panelTitle}<br>${metricName}`
            : '',
      hovermode: 'x',
    };

    const data = [
      controlGroup,
      selectedTestRun,
      testRunsAfterSelectedTestRun,
      thresholdUpper,
      thresholdLower,
    ];

    // Meteor.setTimeout(() => {

    const sluggifiedMetricName = slugify(metricName);

    Plotly.newPlot(
      `line-chart-ds-${applicationDashboardId}-${panelId}-${sluggifiedMetricName}`,
      data,
      layout,
      { displayModeBar: false },
    );

    const plotlyDivElement = document.getElementById(
      `line-chart-ds-${applicationDashboardId}-${panelId}-${sluggifiedMetricName}`,
    );

    if (clickTestRunToOpenTestRun) {
      plotlyDivElement.on('plotly_click', (data) => {
        const selectedTestRunindex = data.points.findIndex(
          (point) => point.data.name === 'Selected test run',
        );
        if (selectedTestRunindex !== -1) {
          const testRunId = data.points[selectedTestRunindex].hovertext
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
        }
      });
    }
    // });
  }
};
