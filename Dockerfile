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

# The tag here should match the Meteor version of your app, per .meteor/release
FROM geoffreybooth/meteor-base:2.13

# Copy app package.json and package-lock.json into container
COPY ./package*.json $APP_SOURCE_FOLDER/

#override script
COPY ./bin/build-app-npm-dependencies.sh $SCRIPTS_FOLDER/build-app-npm-dependencies.sh

COPY ./bin/startup.sh $SCRIPTS_FOLDER/startup.sh


RUN bash $SCRIPTS_FOLDER/build-app-npm-dependencies.sh

# Copy app source into container
COPY ./ $APP_SOURCE_FOLDER/

RUN bash $SCRIPTS_FOLDER/build-meteor-bundle.sh


# Use the specific version of Node expected by your Meteor release, per https://docs.meteor.com/changelog.html; this is expected for Meteor 1.11.1
FROM meteor/node:14.21.4-alpine3.17

ENV APP_BUNDLE_FOLDER /opt/bundle
ENV SCRIPTS_FOLDER /docker

# Install OS build dependencies, which stay with this intermediate image but don't become part of the final published image
RUN apk --no-cache add \
	bash \
	g++ \
	make \
	python3

#RUN npm install -g npm@latest

# Copy in entrypoint
COPY --from=0 $SCRIPTS_FOLDER $SCRIPTS_FOLDER/

# Copy in app bundle
COPY --from=0 $APP_BUNDLE_FOLDER/bundle $APP_BUNDLE_FOLDER/bundle/

RUN bash $SCRIPTS_FOLDER/build-meteor-npm-dependencies.sh --build-from-source

#RUN bash  ls -all /opt/bundle/programs/server && cd /opt/bundle/programs/server && npm audit fix --force

COPY ./version.txt /opt/bundle/bundle/

# Start another Docker stage, so that the final image doesn't contain the layer with the build dependencies
# See previous FROM line; this must match
FROM meteor/node:14.21.4-alpine3.17

ENV APP_BUNDLE_FOLDER /opt/bundle
ENV SCRIPTS_FOLDER /docker

# Install OS runtime dependencies
RUN apk --no-cache  add \
	bash \
	ca-certificates \
    jq

ARG TARGETPLATFORM
RUN wget -q -O /usr/bin/yq \
    $(case "$TARGETPLATFORM" in \
      "linux/amd64")   echo "https://github.com/mikefarah/yq/releases/download/v4.45.1/yq_linux_amd64" ;; \
      "linux/arm64")   echo "https://github.com/mikefarah/yq/releases/download/v4.45.1/yq_linux_arm64" ;; \
       *)              exit 1 ;; \
    esac) \
    && chmod +x /usr/bin/yq

RUN addgroup -S perfana -g 1001 && adduser -S -g 1001 perfana -u 1001

# Copy in entrypoint with the built and installed dependencies from the previous image
COPY --chown=perfana:perfana --from=1 $SCRIPTS_FOLDER $SCRIPTS_FOLDER/


# Copy in app bundle with the built and installed dependencies from the previous image
COPY --chown=perfana:perfana --from=1 $APP_BUNDLE_FOLDER/bundle $APP_BUNDLE_FOLDER/bundle/

RUN apk add --upgrade openssl  && apk add --upgrade busybox && apk add --upgrade curl && apk add --upgrade sqlite-libs && apk add --upgrade libexpat && apk --purge del apk-tools

# Remove npm as it's not needed at runtime
RUN npm uninstall -g npm && rm -rf /usr/local/lib/node_modules/npm

USER 1001:1001

# Start app
ENTRYPOINT ["/docker/entrypoint.sh"]

CMD ["node", "main.js"]
