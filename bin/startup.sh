#!/bin/bash
# Copyright 2025 Perfana Contributors
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

if [[ -f /secrets/perfana-mongo-urls-secret.env ]]; then
  echo "Loading MongoDb connection config ..."
  while read line; do [[ ! "$line" =~ ^# ]] && export $line; done < /secrets/perfana-mongo-urls-secret.env || true
fi

if [[ -f /config/perfana-fe-meteor-settings.yaml ]]; then
    cat /config/perfana-fe-meteor-settings.yaml >> meteor-settings.yaml || true
fi

if [[ -f /secrets/perfana-fe-grafana-config-secret.yaml ]]; then
    cat /secrets/perfana-fe-grafana-config-secret.yaml >> meteor-settings.yaml || true
fi

if [[ -f /secrets/perfana-fe-authentication-config-secret.yaml ]]; then
    cat  /secrets/perfana-fe-authentication-config-secret.yaml >> meteor-settings.yaml || true
fi

if [[ -f /secrets/perfana-fe-admin-creds-secret.yaml ]]; then
    cat  /secrets/perfana-fe-admin-creds-secret.yaml >> meteor-settings.yaml || true
fi

if [[ -f /secrets/perfana-fe-super-admin-creds-secret.yaml ]]; then
    cat  /secrets/perfana-fe-super-admin-creds-secret.yaml >> meteor-settings.yaml || true
fi

if [[ -f /secrets/perfana-api-creds-secret.yaml ]]; then
    cat  /secrets/perfana-api-creds-secret.yaml >> meteor-settings.yaml || true
fi

if [[ -f /secrets/perfana-fe-dynatrace-secret.yaml ]]; then
    cat  /secrets/perfana-fe-dynatrace-secret.yaml >> meteor-settings.yaml || true
fi

if [[ -f meteor-settings.yaml ]]; then
  export METEOR_SETTINGS=$(yq  -o=json meteor-settings.yaml) || true
fi
