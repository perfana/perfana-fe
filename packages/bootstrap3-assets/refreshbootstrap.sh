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

bootstrapVersion="v3.3.6"

echo "Initializing bootstrap submodule... ($bootstrapVersion)"
git submodule update --init

submodulepath=.git/modules/$(grep -oP "path\s*\=\s*\K(.+)" .gitmodules)

$(cd $submodulepath; git config core.sparsecheckout true)

echo '' > $submodulepath/info/sparse-checkout
echo 'js/*.js' >> $submodulepath/info/sparse-checkout
echo 'less/*.less' >> $submodulepath/info/sparse-checkout
echo 'less/mixins/*.less' >> $submodulepath/info/sparse-checkout
echo 'fonts/*' >> $submodulepath/info/sparse-checkout

$(cd $submodulepath; git pull; git checkout $bootstrapVersion)

echo "Generating asset list for package.js..."

bootstrapJsFiles="$(find assets/bootstrap/js -not -path '*/\.*' -name '*.js' -type f -exec echo "'{}'" \; | grep -v '^$' | paste -s -d ',')"
sed '/jsAssets.*=.*/d' -i package.js
echo "var jsAssets = [$bootstrapJsFiles];" >> package.js

bootstrapLessFiles="$(find assets/bootstrap/less -not -path '*/\.*' -name '*.less' -type f -exec echo "'{}'" \; | grep -v '^$' | paste -s -d ',')"
sed '/lessAssets.*=.*/d' -i package.js
echo "var lessAssets = [$bootstrapLessFiles];" >> package.js

bootstrapFontFiles="$(find assets/bootstrap/fonts -not -path '*/\.*' -name '*' -type f -exec echo "'{}'" \; | grep -v '^$' | paste -s -d ',')"
sed '/fontAssets.*=.*/d' -i package.js
echo "var fontAssets = [$bootstrapFontFiles];" >> package.js

echo "Generating js filenames for serve.js..."

bootstrapJsFilenames="$(find assets/bootstrap/js -not -path '*/\.*' -name '*.js' -type f -printf "'%f'\n" | grep -v '^$' | paste -s -d ",")"
sed '/jsAssetNames.*=.*/d' -i serve.js
echo "var jsAssetNames = [$bootstrapJsFilenames];" >> serve.js

echo "Done"
