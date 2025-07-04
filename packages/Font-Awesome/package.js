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

Package.describe({
  name: "perfana:fontawesome",
  summary:
    "Font Awesome (official): 500+ scalable vector icons, customizable via CSS, Retina friendly",
  version: "4.7.0",
  git: "https://github.com/MeteorPackaging/Font-Awesome.git",
  documentation: "README.md",
});

Package.onUse(function (api) {
  api.addAssets(
    [
      // we bundle all font files, but the client will request only one of them via the CSS @font-face rule
      "fonts/fontawesome-webfont.eot", // IE8 or older only understands EOT. IE9+ will read it too because it loads the first occurrence of `src`
      "fonts/fontawesome-webfont.svg", // SVG fallback for iOS < 5 - http://caniuse.com/#feat=svg-fonts, http://stackoverflow.com/a/11002874/1269037
      "fonts/fontawesome-webfont.ttf", // Android Browers 4.1, 4.3 - http://caniuse.com/#feat=ttf
      "fonts/fontawesome-webfont.woff", // Most modern browsers
      "fonts/fontawesome-webfont.woff2", // Chrome 36+, Opera 23+; improves compression
      "fonts/FontAwesome.otf",
    ],
    "client",
  );

  api.addFiles(["css/font-awesome.css"], "client");
});
