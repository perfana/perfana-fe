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

/* eslint-disable camelcase */
module.exports = {
  env: {
    node: true,
    browser: true,
    'jest/globals': true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['meteor', 'jest'],
  extends: ['plugin:meteor/recommended', 'eslint:recommended', 'prettier'],
  globals: {
    Meteor: 'readonly',
    'Meteor.Collection': 'readonly',
    'Meteor.makeAsync': 'readonly',
    Template: 'readonly',
    Accounts: 'readonly',
    WebApp: 'readonly',
    ServiceConfiguration: 'readonly',
    __meteor_bootstrap__: 'readonly',
    __meteor_runtime_config__: 'readonly',
    FlowRouter: 'readonly',
    SyncedCron: 'readonly',
    Session: 'readonly',
    Npm: 'readonly',
    Future: 'readonly',
    $: 'readonly',
    swal: 'readonly',
    toastr: 'readonly',
    Modal: 'readonly',
    Spacebars: 'readonly',
    AutoForm: 'readonly',
    _: 'readonly',
    ReactiveVar: 'readonly',
    ReactiveArray: 'readonly',
    ReactiveDict: 'readonly',
    BlazeLayout: 'readonly',
    SimpleSchema: 'readonly',
    Mongo: 'readonly',
    Roles: 'readonly',
    Match: 'readonly',
    Promise: 'readonly',
    SubsCache: 'readonly',
    saveAs: 'readonly',
    jQuery: 'readonly',
    ReactiveTable: 'readonly',
    Map: 'readonly',
    ArrayBuffer: 'readonly',
    Uint8Array: 'readonly',
    NullType: 'writable',
  },
  rules: {
    'no-unused-vars': ['warn', { args: 'none' }],
    'no-undef': 'error',
    'no-console': 'warn',
    semi: ['error', 'always'],
    quotes: ['error', 'single', { allowTemplateLiterals: true }],
    'no-var': 'error',
    'prefer-const': 'warn',
    eqeqeq: 'error',
    'no-multiple-empty-lines': ['error', { max: 1 }],
    camelcase: 'warn',
    'no-duplicate-imports': 'error',
    // indent: ['error', 2, { SwitchCase: 1, MemberExpression: 1 }],
    'meteor/no-session': 'off',
    'meteor/eventmap-params': 'off',
  },
  ignorePatterns: [
    'packages/**',
    'node_modules/**',
    '.meteor/**',
    '.history/**',
    '**/*.test.js',
    '**/*.html',
  ],
};
