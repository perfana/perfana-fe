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

export const GrafanaDashboardsSubs = new SubsCache(
  process.env.CACHE_EXPIRY ? process.env.CACHE_EXPIRY : 5,
  process.env.CACHE_LIMIT ? process.env.CACHE_LIMIT : 10,
);
export const TestRunsSubs = new SubsCache(
  process.env.CACHE_EXPIRY ? process.env.CACHE_EXPIRY : 5,
  process.env.CACHE_LIMIT ? process.env.CACHE_LIMIT : 10,
);
export const TestRunConfigsSubs = new SubsCache(
  process.env.CACHE_EXPIRY ? process.env.CACHE_EXPIRY : 5,
  process.env.CACHE_LIMIT ? process.env.CACHE_LIMIT : 10,
);
export const ApplicationDashboardsSubs = new SubsCache(
  process.env.CACHE_EXPIRY ? process.env.CACHE_EXPIRY : 5,
  process.env.CACHE_LIMIT ? process.env.CACHE_LIMIT : 10,
);
export const BenchmarksSubs = new SubsCache(
  process.env.CACHE_EXPIRY ? process.env.CACHE_EXPIRY : 5,
  process.env.CACHE_LIMIT ? process.env.CACHE_LIMIT : 10,
);
export const SnapshotsSubs = new SubsCache(
  process.env.CACHE_EXPIRY ? process.env.CACHE_EXPIRY : 5,
  process.env.CACHE_LIMIT ? process.env.CACHE_LIMIT : 10,
);
export const CheckResultsSubs = new SubsCache(
  process.env.CACHE_EXPIRY ? process.env.CACHE_EXPIRY : 5,
  process.env.CACHE_LIMIT ? process.env.CACHE_LIMIT : 10,
);
export const CompareResultsSubs = new SubsCache(
  process.env.CACHE_EXPIRY ? process.env.CACHE_EXPIRY : 5,
  process.env.CACHE_LIMIT ? process.env.CACHE_LIMIT : 10,
);
new SubsCache(
  process.env.CACHE_EXPIRY ? process.env.CACHE_EXPIRY : 5,
  process.env.CACHE_LIMIT ? process.env.CACHE_LIMIT : 10,
);
new SubsCache(
  process.env.CACHE_EXPIRY ? process.env.CACHE_EXPIRY : 5,
  process.env.CACHE_LIMIT ? process.env.CACHE_LIMIT : 10,
);
export const DsMetricsSubs = new SubsCache(
  process.env.CACHE_EXPIRY ? process.env.CACHE_EXPIRY : 5,
  process.env.CACHE_LIMIT ? process.env.CACHE_LIMIT : 10,
);
export const DsPanelsDescriptionSubs = new SubsCache(
  process.env.CACHE_EXPIRY ? process.env.CACHE_EXPIRY : 5,
  process.env.CACHE_LIMIT ? process.env.CACHE_LIMIT : 10,
);
new SubsCache(
  process.env.CACHE_EXPIRY ? process.env.CACHE_EXPIRY : 5,
  process.env.CACHE_LIMIT ? process.env.CACHE_LIMIT : 10,
);
new SubsCache(
  process.env.CACHE_EXPIRY ? process.env.CACHE_EXPIRY : 5,
  process.env.CACHE_LIMIT ? process.env.CACHE_LIMIT : 10,
);
export const DsAdaptResultsSubs = new SubsCache(
  process.env.CACHE_EXPIRY ? process.env.CACHE_EXPIRY : 5,
  process.env.CACHE_LIMIT ? process.env.CACHE_LIMIT : 10,
);
