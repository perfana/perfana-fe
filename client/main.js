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

import "../imports/startup/client/accounts-config.js";
import "../imports/ui/router.js";
import "../imports/ui/testrun/router";
import "../imports/ui/application/router";
import "../imports/ui/grafana/router";
import "../imports/ui/admin/router";
import "../imports/ui/reporting/router";

import {
  formatDate,
  formatTime,
  humanReadableDuration,
  slugify,
} from "/imports/helpers/utils";
import { Meteor } from "meteor/meteor";
import { getUnit } from "/imports/helpers/units";
import { log } from "/both/logger";

export const compareResultsLocal = new Meteor.Collection(null);

/* Store original window.onerror */
const _GlobalErrorHandler = window.onerror;

// Enhanced error handler
window.onerror = function (msg, url, line, col, error) {
  try {
    const errorContext = {
      error: {
        message: msg,
        stack: error?.stack,
        name: error?.name,
        ...(error || {}),
      },
      location: {
        file: url,
        line,
        column: col,
        href: window.location.href,
        userAgent: navigator.userAgent,
      },
      context: {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        timestamp: new Date().toISOString(),
        meteorRelease: Meteor.release,
      },
    };

    // Log to console first in case logging fails
    console.error("[CLIENT] [FATAL] Uncaught Error:", errorContext);

    // Log through our logging system
    log.fatal("Uncaught Error", errorContext);
  } catch (loggingError) {
    // If logging fails, ensure we at least get basic error info to console
    console.error("[CLIENT] [FATAL] Error in error handler:", loggingError);
    console.error("Original error:", { msg, url, line, col, error });
  }

  // Call original handler if exists
  if (_GlobalErrorHandler) {
    return _GlobalErrorHandler.apply(this, arguments);
  }

  // Prevent default handling
  return false;
};

// Handle unhandled promise rejections
window.addEventListener("unhandledrejection", function (event) {
  try {
    const reason = event.reason;
    const errorContext = {
      error: {
        message: `${reason}`,
        stack: reason?.stack,
        name: reason?.name,
        ...(reason || {}),
      },
      location: {
        href: window.location.href,
        userAgent: navigator.userAgent,
      },
      context: {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        timestamp: new Date().toISOString(),
        meteorRelease: Meteor.release,
      },
    };

    // Log through our logging system
    log.fatal("Unhandled Promise Rejection", errorContext);
  } catch (loggingError) {
    // If logging fails, ensure we at least get basic error info to console
    console.error(
      "[CLIENT] [FATAL] Error in promise rejection handler:",
      loggingError,
    );
    console.error("Original rejection:", event.reason);
  }
});

/* Set root url for oauth */
Meteor.startup(function () {
  Meteor.absoluteUrl.defaultOptions.rootUrl = Meteor.settings.public.perfanaUrl;

  // // Deny all client-side updates to user documents
  // Meteor.users.deny({
  //     update() { return true; }
  // });
});

Template.registerHelper("benchmarkResult", (comparisonType, object) => {
  let result;

  if (object) {
    switch (comparisonType) {
      case "compared-to-previous-test-run":
        result = object.benchmarkPreviousTestRunOK;
        break;

      case "compared-to-baseline-test-run":
        result = object.benchmarkBaselineTestRunOK;
        break;

      case "compared-to-selected-baseline":
        result = object.panel.benchmarkBaselineTestRunOK;
        break;
    }

    let HTML;

    if (object.status === "ERROR") {
      HTML =
        '<i class="fa fa-warning" style="color: darkorange;" aria-hidden="true"></i>';
    } else {
      if (result === true) {
        HTML =
          '<i class="fa fa-check" style="color: green;" aria-hidden="true"></i>';
      } else {
        HTML =
          '<i class="fa fa-exclamation-circle" style="color: red;" aria-hidden="true"></i>';
      }
    }

    return new Spacebars.SafeString(HTML);
  }
});

Template.registerHelper("humanReadablePanelTitle", (panelTitle) => {
  if (panelTitle) return panelTitle.replace(/[0-9]+-(.*)/, "$1");
});

Template.registerHelper("humanReadableBenchmarkOperator", (operator) => {
  switch (operator) {
    case "pst":
      return "positive";

    case "ngt":
      return "negative";

    case "pst-pct":
      return "positive";

    case "ngt-pct":
      return "negative";
  }
});

Template.registerHelper("requirementResult", (object) => {
  let result;

  if (object.meetsRequirement && object.requirementsCheck.status) {
    result = object.meetsRequirement;

    let HTML;

    if (object.requirementsCheck.status === "ERROR") {
      HTML =
        '<i class="fa fa-warning" style="color: darkorange;" aria-hidden="true"></i>';
    } else {
      if (result === true) {
        HTML =
          '<i class="fa fa-check" style="color: green;" aria-hidden="true"></i>';
      } else {
        HTML =
          '<i class="fa fa-exclamation-circle" style="color: red;" aria-hidden="true"></i>';
      }
    }
    return new Spacebars.SafeString(HTML);
  }
});

Template.registerHelper("humanReadableOperator", (operator) => {
  switch (operator) {
    case "st": //legacy
      return "less than";

    case "lt":
      return "less than";

    case "gt":
      return "greater than";
  }
});

Template.registerHelper("humanReadableYAxesFormat", (panel) => {
  if (
    panel.panelYAxesFormat === "percentunit" ||
    panel.evaluateType === "fit"
  ) {
    return "%";
  } else {
    const unit = getUnit(panel.panelYAxesFormat);
    if (unit) return ` ${unit.name}`;
  }
});

Template.registerHelper("parseValue", (panel) => {
  if (panel.panelYAxesFormat === "percentunit") {
    return parseFloat(
      Math.round(panel.requirement.value * 10000) / 100,
    ).toString();
  } else {
    return panel.requirement.value;
  }
});

Template.registerHelper("createBenchmarkSpan", (panel, includePanelTitle) => {
  const unit =
    panel.panelYAxesFormat === "percentunit" || panel.evaluateType === "fit"
      ? "%"
      : getUnit(panel.panelYAxesFormat).name;

  let hasBenchmark =
    panel.benchmark && panel.benchmark.operator && panel.benchmark.value;
  let panelTitle = panel.panelTitle.replace(/[0-9]+-(.*)/, "$1");
  let absoluteFailureThresholdString = "";

  if (hasBenchmark) {
    let benchmarkOperator = humanReadableBenchmarkOperator(
      panel.benchmark.operator,
    );
    let format = panel.panelYAxesFormat ? unit : "";
    let benchmarkValue =
      panel.panelYAxesFormat === "percentunit" &&
      (panel.benchmark.operator === "pst" || panel.benchmark.operator === "ngt")
        ? Math.round(panel.benchmark.value * 10000) / 100
        : panel.benchmark.value;
    let percentage =
      panel.benchmark.operator === "pst-pct" ||
      panel.benchmark.operator === "ngt-pct"
        ? "%"
        : ` ${format}`;
    let matchPattern = panel.matchPattern
      ? ` for series matching pattern "<strong>${panel.matchPattern}</strong>"`
      : "";
    let evaluateType = humanReadableEvaluateType(
      panel.evaluateType,
    ).toLowerCase();
    if (panel.benchmark.absoluteFailureThreshold) {
      let absoluteFailureThreshold =
        panel.panelYAxesFormat === "percentunit"
          ? Math.round(panel.benchmark.absoluteFailureThreshold * 10000) / 100
          : panel.benchmark.absoluteFailureThreshold;
      absoluteFailureThresholdString = panel.benchmark.absoluteFailureThreshold
        ? ` | fail only if absolute deviation exceeds <strong>${absoluteFailureThreshold} ${format}</strong>`
        : "";
    }

    if (includePanelTitle === true) {
      return new Spacebars.SafeString(
        ` <span class="check-result-panel-title"><strong>${panelTitle}</strong></span><span> | allow ${benchmarkOperator} deviation of <strong>${benchmarkValue}${percentage}</strong> for ${evaluateType} ${matchPattern}${absoluteFailureThresholdString}</span>`,
      );
    } else {
      return new Spacebars.SafeString(
        `  Allow ${benchmarkOperator} deviation of <strong>${benchmarkValue}${percentage}</strong> for ${evaluateType} ${matchPattern}${absoluteFailureThresholdString}</span>`,
      );
    }
  } else {
    return new Spacebars.SafeString(
      `<span><strong>${panelTitle}</strong></span>`,
    );
  }
});

Template.registerHelper("humanReadableEvaluateType", (type) => {
  return humanReadableEvaluateType(type);
});

const humanReadableEvaluateType = (type) => {
  let humanReadableEvaluateType;
  switch (type) {
    case "avg":
      humanReadableEvaluateType = "Average value";
      break;
    case "max":
      humanReadableEvaluateType = "Maximum value";
      break;
    case "min":
      humanReadableEvaluateType = "Minimum value";
      break;
    case "last":
      humanReadableEvaluateType = "Last value";
      break;
    case "fit":
      humanReadableEvaluateType = "Slope";
      break;
    default:
      humanReadableEvaluateType = "";
      break;
  }
  return humanReadableEvaluateType;
};
Template.registerHelper("slugify", (text) => {
  if (text !== undefined) {
    return slugify(text);
  }
});

Template.registerHelper("sanatize", (testRunId) => {
  if (testRunId) {
    return testRunId.replace(/\./g, "-").replace(/:/g, "-").replace(/\//g, "-");
  }
});

Template.registerHelper("humanReadableDurationHelper", (duration) => {
  if (duration) return humanReadableDuration(duration);
});

// Template.registerHelper( 'userHasPermissionForApplication', ( testRun ) => {
//
//     return ReactiveMethod.call('userHasPermissionForApplication', testRun);
//
// });

Template.registerHelper("humanReadableExpiryHelper", (testRun, expires) => {
  if (!expires || expires === 0) {
    return "Never";
  } else {
    return formatDate(
      new Date(testRun.end).setSeconds(
        new Date(testRun.end).getSeconds() + parseInt(expires),
      ),
    );
  }
});

Template.registerHelper("formatDateHelper", (date) => {
  return formatDate(date);
});

Template.registerHelper("formatDateHelperTestRunStatus", (testRun, expires) => {
  if (!expires || expires === 0) {
    return "Never";
  } else {
    return formatDate(
      new Date(testRun.end).setSeconds(
        new Date(testRun.end).getSeconds() + parseInt(expires),
      ),
    );
  }
});

Template.registerHelper("formatTimeHelper", (date) => {
  return formatTime(date);
});

Template.registerHelper("removePanelId", (panelTitle) => {
  return panelTitle.replace(/[0-9]+-(.*)/, "$1");
});

Template.registerHelper("indexIsZero", (index) => index === 0);

const humanReadableBenchmarkOperator = (operator) => {
  switch (operator) {
    case "pst":
      return "positive";

    case "ngt":
      return "negative";

    case "pst-pct":
      return "positive";

    case "ngt-pct":
      return "negative";
  }
};
