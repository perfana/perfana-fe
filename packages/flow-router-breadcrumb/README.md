meteor-breadcrumb-plugin(FlowRouter Edition)
========================

This package will provide a easy way to add a breadcrumb with enough flexibility to your project.

This FlowRouter version attempts to provide the same functionality found in the Iron Router version.

# Current Issues

* It current utilizes a private variable within FlowRouter which may cause it to break on FlowRouter updates.( I'll submit an issue about this once the other issues are resolved)

# Try the [demo](http://meteor-breadcrumb-plugin-basic-example.meteor.com) which can be found on [github](https://github.com/rfox90/meteor-breadcrumb-plugin/tree/master/examples/basic)

# Dependencies

* Flow-Router >=2.0
* Meteor >1.0

# Compatibility

* works out of the box with bootstrap3
* use the pre existing template or use your own

# Installation

Use `meteor add sojourneer:flow-router-breadcrumb` to add the package to your meteor app

# Concept
Two parameters need to be specified on the flow routes that will have breadcrumbs.
The 'parent' attribute forms a chain of routes that is traversed from the current route backwards along the parent links to construct the breadcrumb trail.
Each breadcrumb is the result of evaluating the 'title' parameter in the routes along the chain.

The 'title' parameter can be a string, optionally containing route path parameter references.
Alternatively, the 'title' parameter can be a function. In either case, a data context is provided by the package.
The context is an object containing path and query parameters, which are taken from FlowRoute.current() for the rightmost crumb, or from the crumb to the immediate right. 

The 'parent' parameter can be a string, in which it is taken as the name of the parent route, or a function.
If it is a function, it will be called with the data context described above, and must return an object containing
* name: name of the parent route
* params: the path params
* queryParams: the queryParams

The params and queryParams allow modifying the data context supplied to the (parent route) crumb to the left; e.g. changing the name of a parameter.

Finally, the crumbs making up the breadcrumb trail are cached. When the active route changes, the trail is examined left-to-right to see if any of the routes or data context has changed.
The changed crumb and the crumbs to its right are all re-evaluated.

# Usage

* You need to add two parameters to your flow routes which are `parent` and `title`
    * 'parent': string or function giving the parent route and optionally modifying the data context, as described above.
    * 'title': a string or function, as described above.
* The following optional parameters can be specifed on the flow routes
    * 'breadcrumbCSS' adds the specified classes to the breadcrumb
    * 'caps' flow route parameter,if present, causes the title to be capitalized

## 1. Example Flow Router with multiple levels

### In this example the Breadcrumb would look or the url `/dashboard/analytics/books` like: `Dashboard / Analytics / Category Books`

```
// Level 0
FlowRouter.route('/', {
  name: 'dashboard',
  title: 'Dashboard'
});

// Level 1
FlowRouter.route('/dashboard/analytics', {
  name: 'dashboard.analytics',
  parent: 'dashboard', // this should be the name variable of the parent route
  title: 'Analytics'
});

// Level 2
FlowRouter.route('/dashboard/analytics/books', {
  name: 'dashboard.analytics.books',
  parent: 'dashboard.analytics', // this should be the name variable of the parent route
  title: 'Category Books'
});
```

## 2. Example Dynamic Flow Route

### In this example the Breadcrumb would look for the url `/post/hello-world` like: `Home / Blogpost Hello-World`

```
// Level 1
FlowRouter.route('/', {
  name: 'home',
  template: 'home',
  title: 'Home'
});

// Level 2
FlowRouter.route('/post/:_name', {
  name: 'post',
  parent: 'home', // this should be the name variable of the parent route
  title: 'Blogpost :_name' // the variable :_name will be automatically replaced with the value from the url
});

// Level 3. Because we are using different path variables than Level 2, we construct a new object in parent() with the required names.
FlowRouter.route('/post/:_postname/comment/:_name', {
  name: 'post',
  parent: function() { return {name: 'posts', params: {_name: this.params._postname}, queryParams: {}}; },
  title: function() { return 'Comment ' + this.params._name.substr(0,4); },
  breadcrumbCSS: 'comment'
});
```

## 3. Example use of the de-slugify feature
```
It's a common thing to provide a slug of a title/name of document in route. This leads to breadcrumb in a form:

level 1 > My-awesome-title > level 3
What we usually want is for that to look like:

level 1 > My Awesome Title > level 3

If You specify the slug parameter in your route configuration like this:

title: ':param',
slug: '-'
```
Then all the '-' characters in the title will be changed into ' ' and the title will get capitalized as usual.

## Example custom template for navigation

### Please note, that you dont have to use a custom template with the name `breadcrumb`, you can use the existing one out of the box by simply using `{{> breadcrumb}}` to include the preexisting template (which looks exact like the following example) anywhere in your own templates.

```
<template name="breadcrumb">
    {{#if BreadcrumbNonEmpty}}
        <ol class="breadcrumb">
            {{#each Breadcrumb}}
                {{#if active}}
                    <li class="{{cssClasses}}"><span class="active">{{title}}</span></li>
                {{else}}
                    <li class="{{cssClasses}}"><a href="{{url}}">{{title}}</a></li>
                {{/if}}
            {{/each}}
        </ol>
    {{/if}}
    {{getReactive}}
</template>
```

## Example access of the breadcrumb in Javascript

```
if (Meteor.is_client) {
  Template.analytics.rendered = function(){
    console.log(Breadcrumb.getAll()); // you can access the breadcrumb objects in a template helper as well
  }
}
```

## Internal dependencies / credits
Forked from [ahref:flow-router-breadcrumb](https://atmospherejs.com/ahref/flow-router-breadcrumb)

