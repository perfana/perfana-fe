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

/*
This basic idea is at each movement up the parent chain, the child constructs the parent's parameters from its own (which are in turn from it's child, or from the current route)

 */

const FlowRouter = Package["perfana:flow-router"]
  ? Package["perfana:flow-router"].FlowRouter
  : false;

String.prototype.capitalize = function () {
  return this.replace(/(?:^|\s)\S/g, function (a) {
    return a.toUpperCase();
  });
};

var getRouteByName = function (name) {
  //XXX: We use a private variable here, FlowRouter may change and bork this variable as much as they like which might break the entire package
  //TODO: Request a public variable way of getting this map?
  return FlowRouter._routesMap[name];
};

var getParams = function (path) {
  return _.map(path.match(/[:][^/]+/g), function (fp) {
    return fp.substr(1);
  });
};

_.mixin({
  isEqualPicked: function (a, b, attrs) {
    for (k in attrs) {
      if (a[k] != b[k]) return false;
    }
    return true;
  },
});

var enrichRouteObject = function (route, params, queryParams) {
  // replace all parameters in the title
  var routeOptions = route.options;
  var title =
    routeOptions && routeOptions.hasOwnProperty("title")
      ? routeOptions.title
      : null; //FlowRouter.options.title;
  if ("function" === typeof title)
    title = _.bind(title, { route: route, params: params, queryParams })();
  if (title) {
    for (var i in params) {
      title =
        title &&
        title.replace(
          new RegExp((":" + i).replace(/\+/g, "\\+"), "g"),
          params[i],
        );
    }
    if (routeOptions.slug) title = title.split(routeOptions.slug).join(" ");

    if (routeOptions.caps) title = title && title.capitalize();
  } else {
    title = null;
  }

  //if (title)
  return {
    routeName: route.name,
    params: params,
    queryParams: queryParams,
    title: title || null,
    cssClasses: routeOptions.breadcrumbCSS || "",
    url: FlowRouter.path(route.name, params, queryParams),
    route: route,
  };
};

var repairStack = function () {
  currentStack = []; //[0] is root
  var route = FlowRouter.current().route;

  currentStack.push({
    route: route,
    routeName: route.name,
    params: FlowRouter.current().params,
    queryParams: FlowRouter.current().queryParams,
  });
  if (Breadcrumb.debug) console.log("Breadcrumb.currentStack", currentStack[0]);

  while ((parent = route.options.parent) != null) {
    var prev = currentStack[0 /*currentStack.length-1*/];

    if ("string" == typeof parent) {
      var route = getRouteByName(parent);
      currentStack.unshift({
        routeName: parent,
        route: route,
        params: prev.params,
        queryParams: prev.queryParams,
      });
    } else {
      // the parameters for the parent are specified in the child's options.parent
      var parent = _.bind(parent, prev)();
      var route = getRouteByName(parent.name);
      currentStack.unshift({
        routeName: parent.name,
        route: route,
        params: parent.params,
        queryParams: parent.queryParams,
      });
    }
    if (Breadcrumb.debug)
      console.log("Breadcrumb.currentStack", currentStack[0]);
  } // while

  function subset(childSet, parentSet) {
    for (k in parentSet) {
      if (!_.isEqual(parentSet[k], childSet[k])) return false;
    }
    return true;
  }

  // Do the comparison with the stored stack
  if (Breadcrumb._stack.length > currentStack.length)
    Breadcrumb._stack.length = currentStack.length;

  var index;
  // Keeping going while the route and params/queryparams are the same
  for (
    index = 0;
    index < currentStack.length && index < Breadcrumb._stack.length;
    ++index
  ) {
    var curr = currentStack[index];
    var prev = Breadcrumb._stack[index];

    if (
      curr.routeName != prev.routeName ||
      !_.isEqualPicked(curr.params, prev.params, getParams(curr.route.path)) ||
      !_.isEqual(curr.queryParams, prev.queryParams)
    ) {
      if (Breadcrumb.debug) console.log("Breadcrumb.Mismatch", curr, prev);
      break;
    }
  }
  // Rebuild everything after the last match
  for (; index < currentStack.length; ++index) {
    var currSpec = currentStack[index];
    if (Breadcrumb.debug) console.log("Breadcrumb.Evaluate", currSpec);
    Breadcrumb._stack[index] = enrichRouteObject(
      currSpec.route,
      currSpec.params,
      currSpec.queryParams,
    );
  }

  for (i = 0; i < Breadcrumb._stack.length; ++i)
    Breadcrumb._stack[i].active = i == Breadcrumb._stack.length - 1;

  return Breadcrumb._stack;
};

Breadcrumb = {
  debug: false,
  _stack: [],
  getAll: function () {
    FlowRouter.watchPathChange();
    return repairStack();
  },
};

UI.registerHelper("Breadcrumb", function (template) {
  return _.reject(Breadcrumb.getAll(), function (entry) {
    return entry.title == null;
  });
});
UI.registerHelper("BreadcrumbNonEmpty", function (template) {
  return _.some(Breadcrumb.getAll(), function (entry) {
    return entry.title != null;
  });
});
