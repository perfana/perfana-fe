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

// npm
const fs = Npm.require("fs");
const path = Npm.require("path");
const less = Npm.require("less");
const Future = Npm.require("fibers/future");

// Paths and filenames
const assetsPath = path.join("assets");
const defaultsPath = path.join(assetsPath, "defaults");
const lessPath = path.join(assetsPath, "bootstrap", "less");
const jsPath = path.join(assetsPath, "bootstrap", "js");
const fontsUrl = "/packages/huttonr_bootstrap3-assets/assets/bootstrap/fonts/";

const jsLoadFirst = [
  // Specifies which js modules should be loaded first due to other js modules depending on them
  "tooltip.js",
];

const bootstrapSettings = "bootstrap-settings.json";
const bootstrapVariables = "bootstrap-variables.less";
const bootstrapRaw = "bootstrap-raw.import.less";
const bootstrapMixins = "bootstrap-mixins.less";
const bootstrapJs = "bootstrap.js";

const variablesFileInstruction = `
// These are custom bootstrap variables for you to edit.
// These simply override any default bootstrap variables.
// This means that you may delete anything in this file
// and the default bootstrap values will be used instead.

`;

const mixinFileInstruction = `
// Editing these mixins will not edit the mixins used by the core bootstrap modules.
// They are exposed here for your use and convenience.
// They can be imported using @import "path/to/${bootstrapMixins}"

`;

const rawFileInstruction = `
// DO NOT EDIT THIS FILE, CHANGES _WILL_ BE OVERWRITTEN
// This file was generated and exposed per your settings in ${bootstrapSettings}.

`;

// Asset functions
const getAsset = _bootstrapGetAsset;
const getJsFilenames = _bootstrapGetJsList;

// Register the compiler for the bootstrap-settings json file
Plugin.registerCompiler(
  {
    extensions: [],
    filenames: [bootstrapSettings /*, bootstrapVariables, bootstrapMixins*/],
  },
  () => new BootstrapCompiler(),
);

// BootstrapCompiler class
class BootstrapCompiler {
  // Actual processing of file (bootstrap-settings json)
  processFilesForTarget(filesFound) {
    let settingsFile;

    // Loop through and find the settings file
    for (let file of filesFound) {
      let fn = path.basename(path.join(".", file.getDisplayPath()));
      if (fn === bootstrapSettings) {
        if (settingsFile)
          throw new Error(
            "You cannot have more than one " +
              bootstrapSettings +
              " in your Meteor project.",
          );

        settingsFile = file;
      }
    }

    if (settingsFile) {
      // (1) Get the bootstrap-settings json

      // Get the settings file dir
      const settingsFilePath = path.join(
        ".",
        resolveFilePath(
          `{${settingsFile.getPackageName() || ""}}/${settingsFile.getPathInPackage()}`,
        ),
      );
      const settingsPathDir = path.dirname(settingsFilePath);

      // Function to build the default settings json
      function buildSettingsFileJson() {
        // Load in the template settings file
        let src = getAsset(
          path.join(defaultsPath, "bootstrap-settings.default.json"),
        );

        // Get the default trailing whitespace
        const lessWhitespace =
          src.match(/\n(\s*)\/\*LESS_MODULES\*\//)[1] || "";
        const jsWhitespace = src.match(/\n(\s*)\/\*JS_MODULES\*\//)[1] || "";

        // Get all less modules specified in default bootstrap.less
        let bootstrapDefaultLess = getAsset(
          path.join(lessPath, "bootstrap.less"),
        );
        let lessModules = [];
        let re = /\@import\s+[\"\'](.+)\.less[\"\']\;?/g;
        let found;
        while ((found = re.exec(bootstrapDefaultLess))) {
          if (found[1]) lessModules.push(found[1]);
        }

        // Remove default variables module and mixins module
        lessModules.splice(lessModules.indexOf("variables"), 1);
        lessModules.splice(lessModules.indexOf("mixins"), 1);

        // Sort them alphabetically
        lessModules.sort();

        // Get all js modules
        let jsModules = getJsFilenames();

        // Create less and js modules json
        let lessJson = lessModules
          .map((name) => `${lessWhitespace} "${name}": true`)
          .join(",\n");
        let jsJson = jsModules
          .map((name) => `${jsWhitespace}"${name.match(/(.*)\.js/i)[1]}": true`)
          .join(",\n");

        // Insert the json modules into the template settings file
        src = src
          .replace(/\n\s*\/\*LESS_MODULES\*\//, "\n" + lessJson)
          .replace(/\n\s*\/\*JS_MODULES\*\//, "\n" + jsJson);

        return src;
      }

      // Get the settings data
      const settingsContents = settingsFile.getContentsAsString();
      let settings;
      if (settingsContents.trim()) {
        settings = JSON.parse(settingsContents);
      } else {
        // Populate the settings json file because it empty
        let src = buildSettingsFileJson();

        fs.writeFileSync(settingsFilePath, src);

        settings = JSON.parse(src);
      }

      // Detect huttonr:bootstrap4 downgrade
      if (settings.scss) {
        // Overwrite the old settings json file with the default one
        let src = buildSettingsFileJson();

        fs.writeFileSync(settingsFilePath, src);

        settings = JSON.parse(src);
      }

      // Settings defaults
      function def(obj, name, val) {
        if (obj[name] === undefined) obj[name] = val;
      }

      def(settings, "less", {});
      def(settings, "javascript", {});
      def(settings, "version", 0);
      def(settings.less, "customVariables", false);
      def(settings.less, "exposeMixins", false);
      def(settings.less, "compile", true);
      def(settings.less, "modules", {});
      def(settings.javascript, "expose", false);
      def(settings.javascript, "modules", {});

      // (2) Handle the less

      // Get all less modules specified in default bootstrap.less
      // This will give a nicely ordered list of all bootstrap modules
      let bootstrapDefaultLess = getAsset(
        path.join(lessPath, "bootstrap.less"),
      );
      let lessModules = [];
      let re = /\@import\s+[\"\'](.+)\.less[\"\']/g;
      let found;
      while ((found = re.exec(bootstrapDefaultLess))) {
        if (found[1]) lessModules.push(found[1]);
      }

      // Remove default variables module and mixins module
      lessModules.splice(lessModules.indexOf("variables"), 1);
      lessModules.splice(lessModules.indexOf("mixins"), 1);

      // Filter the modules to include only those enabled in the bootstrap-settings json
      lessModules = lessModules.filter(
        (moduleName) => settings.less.modules[moduleName],
      );

      // Reinsert default variables and mixins modules
      lessModules.splice(0, 0, "variables", "mixins");

      // Insert custom variables module (after default variables module)
      if (settings.less.customVariables) {
        if (!fileExists(path.join(settingsPathDir, bootstrapVariables))) {
          // Generate the custom variables file because it doesn't exist
          let src = getAsset(path.join(lessPath, "variables.less"));
          src = src
            .substr(Math.max(src.indexOf("\n\n"), 0)) // Cut the top commentary off
            .replace(
              /((?:\n|^|\*\/|\;)\s*)(\@icon\-font\-\S+)\:.*/g,
              "$1// '$2' automatically set by Bootstrap package.",
            ); // Comment out the glyphicon settings
          src = variablesFileInstruction + src;

          fs.writeFileSync(path.join(settingsPathDir, bootstrapVariables), src);
        }

        lessModules.splice(
          lessModules.indexOf("variables") + 1,
          0,
          bootstrapVariables.replace(/(.+)\.less/, "$1"),
        );
      }

      // Expose mixins if specified
      if (
        settings.less.exposeMixins &&
        !fileExists(path.join(settingsPathDir, bootstrapMixins))
      ) {
        // Generate the mixins file because it doesn't exist
        let src = getAsset(path.join(lessPath, "mixins.less"));
        src = src
          .substr(Math.max(src.indexOf("\n\n"), 0)) // Cut the top commentary off
          .replace(/\@import\s+\"(.+)\"\;?/g, (match, mixin) =>
            getAsset(path.join(lessPath, mixin)),
          );
        src = mixinFileInstruction + src;

        fs.writeFileSync(path.join(settingsPathDir, bootstrapMixins), src);
      }

      // Build src starting with a bunch of imports
      let lessSrc = lessModules
        .map((module) => `@import "${module}.less";`)
        .join("\n");

      // Cute little recursive function to explode all of the less imports
      function resolveLessImports(src, currentPath = ".") {
        // Find all of the imports
        return src.replace(
          /(?:\n|^|\*\/|\;)\s*\@import\s+[\"\'](.+)[\"\']\s*\;\s*?/g,
          (match, fn) => {
            let res;
            try {
              // First try to get it from the assets
              res = getAsset(path.join(lessPath, currentPath, fn));
            } catch (err) {
              // Getting from the assets failed so it should just be the custom variables file in the settings json dir
              res = fs.readFileSync(path.join(settingsPathDir, fn)).toString();
            }

            // Recursively explode the imports in the imported file keeping the path in mind (just in case)
            return resolveLessImports(
              res,
              path.join(currentPath, path.dirname(fn)),
            );
          },
        );
      }

      // Resolve/explode the imports and then fix the glyphicon variables
      lessSrc = resolveLessImports(lessSrc)
        .replace(
          /((?:\n|^|\*\/|\;)\s*\@icon\-font\-path\s*\:\s*)(?:.+)/g,
          `$1"${fontsUrl}";`,
        )
        .replace(
          /((?:\n|^|\*\/|\;)\s*\@icon\-font\-name\s*\:\s*)(?:.+)/g,
          '$1"glyphicons-halflings-regular";',
        )
        .replace(
          /((?:\n|^|\*\/|\;)\s*\@icon\-font\-svg\-id\s*\:\s*)(?:.+)/g,
          '$1"glyphicons_halflingsregular";',
        );

      // Check if the less should be compiled
      if (settings.less.compile) {
        // Render the less sync style (can't believe have to use a Future for this...)
        const f = new Future();
        less.render(lessSrc, f.resolver());
        let rendered = f.wait();

        // Add the newly generated css as a stylesheet
        settingsFile.addStylesheet({
          data: rendered.css.toString(),
          path: path.join(
            "client",
            "stylesheets",
            "bootstrap",
            "bootstrap.generated.css",
          ),
        });
      } else {
        // Add some explanatory data and warnings
        lessSrc = `${rawFileInstruction}\n${lessSrc}`;

        // Put the uncompiled less into a file for the user
        fs.writeFileSync(path.join(settingsPathDir, bootstrapRaw), lessSrc);
      }

      // (3) Handle the js

      // Set up a variable to store all the js that will be added with .addJavaScript
      let combinedJs = "Meteor._bootstrapSettingsFileLoaded = true;\n";

      // Get all js modules
      let jsModules = getJsFilenames();

      // Filter the modules to include only those enabled in the bootstrap-settings json
      jsModules = jsModules.filter(
        (moduleName) =>
          settings.javascript.modules[moduleName.match(/(.*)\.js/i)[1]],
      );

      // Push 'load first' modules to top of list
      for (let fn of jsLoadFirst.slice().reverse()) {
        let index = jsModules.indexOf(fn);

        if (index > -1) jsModules.unshift(jsModules.splice(index, 1)[0]);
      }

      // Get source from each bootstrap js file and compile it into one file
      let src = "";
      for (let moduleFn of jsModules) {
        src += getAsset(path.join(jsPath, moduleFn)) + "\n";
      }

      // Add guard to ensure bootstrap js only runs on the client (and pretty it up in case it gets exposed)
      src = `if (Meteor.isClient) { \
                \n  ${src.replace(/\n/g, "\n  ")} \
              \n}\n`;

      // Check if the javascript should be exposed or just added
      if (settings.javascript.expose) {
        // Add some explanatory data and warnings
        src = `${rawFileInstruction}\n${src}`;

        // Expose the javascript into a file for the user
        fs.writeFileSync(path.join(settingsPathDir, bootstrapJs), src);
      } else {
        // Add the js to the chunk that will be added
        combinedJs += src;
      }

      // Add the js all in one file as multiple calls to .addJavaScript is currently unsupported
      settingsFile.addJavaScript({
        data: combinedJs,
        path: path.join("client", "lib", "bootstrap", "bootstrap.generated.js"),
      });
    }
  }
}

function resolveFilePath(filePath) {
  const match = filePath.match(/{(.*)}\/(.*)$/);

  if (!match) return filePath;
  if (match[1] === "") return match[2];

  let paths = [];

  paths[1] = paths[0] = `packages/${match[1].replace(":", "_")}/${match[2]}`;
  if (!fileExists(paths[0]))
    paths[2] = paths[0] = `packages/${match[1].replace(/.*:/, "")}/${match[2]}`;
  if (!fileExists(paths[0]))
    throw new Error(
      `Path does not exist: ${filePath}\nTested path 1: ${paths[1]}\nTested path 2: ${paths[2]}`,
    );

  return paths[0];
}

function fileExists(filePath) {
  if (fs.accessSync) {
    try {
      fs.accessSync(filePath);
      return true;
    } catch (err) {
      return false;
    }
  }

  if (fs.accessSync) {
    return fs.accessSync(filePath);
  }

  if (fs.openSync) {
    try {
      fs.close(fs.openSync(filePath, "r"));
      return true;
    } catch (err) {
      return false;
    }
  }
}
