var fs = require('fs');
var fsExtra = require('fs-extra');
var path = require('path');
var urlJoin = require('url-join');

function softSet(object, key, value) {
  object = object || {};

  if (typeof object[key] === 'undefined') {
    object[key] = value;
  }
}

module.exports = {
  name: 'ember-cli-rails-addon',
  warnMissingDependencyChecker: function() {
    var dependencies = this.project.dependencies();

    if (!dependencies['ember-cli-dependency-checker']) {
      console.warn('Usage of "ember-cli-dependency-checker" is strongly advised to ensure your project cache is in sync with the project\'s requirements.');
    }
  },

  init: function() {
    this.warnMissingDependencyChecker();
    this.ensureTmp();
  },

  buildError: function(error) {
    fs.writeFileSync(this.errorFilePath(), error.stack)
  },

  included: function(app) {
    app.options.storeConfigInMeta = false;
    softSet(app.options, 'fingerprint', {});
    softSet(app.options, 'ember-cli-rails', {});
    var addonOptions = app.options['ember-cli-rails'];

    if (app.env !== 'test' && typeof process.env.RAILS_ENV !== 'undefined') {
      var assetHostWithProtocol = addonOptions.prepend || '';
      var prepend = urlJoin(assetHostWithProtocol, 'assets', app.name);

      if (prepend.slice(-1) !== '/') {
        prepend += '/';
      }

      softSet(app.options.fingerprint, 'enabled', true);
      softSet(app.options.fingerprint, 'prepend', prepend);

      if (app.env !== 'production') {
        softSet(app.options.fingerprint, 'customHash', null);
      }
    }

    if (process.env.EXCLUDE_EMBER_ASSETS) {
      var excludeEmberAssets = process.env.EXCLUDE_EMBER_ASSETS;
      var excludeRegex = new RegExp("(?:" + excludeEmberAssets.replace(",", "|") + ")\\.js$");
      var excludeAssets = app.legacyFilesToAppend.filter(function(asset){ return excludeRegex.test(asset); });

      excludeAssets.forEach(function(asset){
        var index = app.legacyFilesToAppend.indexOf(asset);
        app.legacyFilesToAppend.splice(index, 1);
      });
    }
  },
  preBuild: function(result) {
    var lockFile = this.lockFilePath();
    var errorFile = this.errorFilePath();
    if(!fs.existsSync(lockFile)) { fs.openSync(lockFile, 'w'); }
    if(fs.existsSync(errorFile)) { fs.unlinkSync(errorFile); }
  },
  postBuild: function(result){
    fsExtra.copySync(
      result.directory + '/index.html',
      result.directory + '/assets/index.html'
    );

    var lockFile = this.lockFilePath();

    if(fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
    }
  },

  ensureTmp: function() {
    var dir = this.tmpDir();
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
    }
  },
  tmpDir: function() {
    return path.join(process.cwd(), 'tmp');
  },
  lockFilePath: function() {
    return path.join(this.tmpDir(), 'build.lock');
  },
  errorFilePath: function() {
    return path.join(this.tmpDir(), 'error.txt');
  }
};
