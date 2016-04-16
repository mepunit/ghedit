define(["require", "exports", 'vs/nls', 'vs/base/common/severity', 'vs/base/common/winjs.base', 'vs/platform/extensions/common/extensions', 'vs/platform/extensions/common/extensionsRegistry'], function (require, exports, nls, severity_1, winjs_base_1, extensions_1, extensionsRegistry_1) {
    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    'use strict';
    var hasOwnProperty = Object.hasOwnProperty;
    var ActivatedExtension = (function () {
        function ActivatedExtension(activationFailed) {
            this.activationFailed = activationFailed;
        }
        return ActivatedExtension;
    }());
    exports.ActivatedExtension = ActivatedExtension;
    var AbstractExtensionService = (function () {
        function AbstractExtensionService(isReadyByDefault) {
            var _this = this;
            this.serviceId = extensions_1.IExtensionService;
            if (isReadyByDefault) {
                this._onReady = winjs_base_1.TPromise.as(true);
                this._onReadyC = function (v) { };
            }
            else {
                this._onReady = new winjs_base_1.TPromise(function (c, e, p) {
                    _this._onReadyC = c;
                }, function () {
                    console.warn('You should really not try to cancel this ready promise!');
                });
            }
            this._activatingExtensions = {};
            this._activatedExtensions = {};
        }
        AbstractExtensionService.prototype._triggerOnReady = function () {
            this._onReadyC(true);
        };
        AbstractExtensionService.prototype.onReady = function () {
            return this._onReady;
        };
        AbstractExtensionService.prototype.getExtensionsStatus = function () {
            return null;
        };
        AbstractExtensionService.prototype.isActivated = function (extensionId) {
            return hasOwnProperty.call(this._activatedExtensions, extensionId);
        };
        AbstractExtensionService.prototype.activateByEvent = function (activationEvent) {
            var _this = this;
            return this._onReady.then(function () {
                extensionsRegistry_1.ExtensionsRegistry.triggerActivationEventListeners(activationEvent);
                var activateExtensions = extensionsRegistry_1.ExtensionsRegistry.getExtensionDescriptionsForActivationEvent(activationEvent);
                return _this._activateExtensions(activateExtensions, 0);
            });
        };
        AbstractExtensionService.prototype.activateById = function (extensionId) {
            var _this = this;
            return this._onReady.then(function () {
                var desc = extensionsRegistry_1.ExtensionsRegistry.getExtensionDescription(extensionId);
                if (!desc) {
                    throw new Error('Extension `' + extensionId + '` is not known');
                }
                return _this._activateExtensions([desc], 0);
            });
        };
        /**
         * Handle semantics related to dependencies for `currentExtension`.
         * semantics: `redExtensions` must wait for `greenExtensions`.
         */
        AbstractExtensionService.prototype._handleActivateRequest = function (currentExtension, greenExtensions, redExtensions) {
            var depIds = (typeof currentExtension.extensionDependencies === 'undefined' ? [] : currentExtension.extensionDependencies);
            var currentExtensionGetsGreenLight = true;
            for (var j = 0, lenJ = depIds.length; j < lenJ; j++) {
                var depId = depIds[j];
                var depDesc = extensionsRegistry_1.ExtensionsRegistry.getExtensionDescription(depId);
                if (!depDesc) {
                    // Error condition 1: unknown dependency
                    this._showMessage(severity_1.default.Error, nls.localize('unknownDep', "Extension `{1}` failed to activate. Reason: unknown dependency `{0}`.", depId, currentExtension.id));
                    this._activatedExtensions[currentExtension.id] = this._createFailedExtension();
                    return;
                }
                if (hasOwnProperty.call(this._activatedExtensions, depId)) {
                    var dep = this._activatedExtensions[depId];
                    if (dep.activationFailed) {
                        // Error condition 2: a dependency has already failed activation
                        this._showMessage(severity_1.default.Error, nls.localize('failedDep1', "Extension `{1}` failed to activate. Reason: dependency `{0}` failed to activate.", depId, currentExtension.id));
                        this._activatedExtensions[currentExtension.id] = this._createFailedExtension();
                        return;
                    }
                }
                else {
                    // must first wait for the dependency to activate
                    currentExtensionGetsGreenLight = false;
                    greenExtensions[depId] = depDesc;
                }
            }
            if (currentExtensionGetsGreenLight) {
                greenExtensions[currentExtension.id] = currentExtension;
            }
            else {
                redExtensions.push(currentExtension);
            }
        };
        AbstractExtensionService.prototype._activateExtensions = function (extensionDescriptions, recursionLevel) {
            var _this = this;
            // console.log(recursionLevel, '_activateExtensions: ', extensionDescriptions.map(p => p.id));
            if (extensionDescriptions.length === 0) {
                return winjs_base_1.TPromise.as(void 0);
            }
            extensionDescriptions = extensionDescriptions.filter(function (p) { return !hasOwnProperty.call(_this._activatedExtensions, p.id); });
            if (extensionDescriptions.length === 0) {
                return winjs_base_1.TPromise.as(void 0);
            }
            if (recursionLevel > 10) {
                // More than 10 dependencies deep => most likely a dependency loop
                for (var i = 0, len = extensionDescriptions.length; i < len; i++) {
                    // Error condition 3: dependency loop
                    this._showMessage(severity_1.default.Error, nls.localize('failedDep2', "Extension `{0}` failed to activate. Reason: more than 10 levels of dependencies (most likely a dependency loop).", extensionDescriptions[i].id));
                    this._activatedExtensions[extensionDescriptions[i].id] = this._createFailedExtension();
                }
                return winjs_base_1.TPromise.as(void 0);
            }
            var greenMap = Object.create(null), red = [];
            for (var i = 0, len = extensionDescriptions.length; i < len; i++) {
                this._handleActivateRequest(extensionDescriptions[i], greenMap, red);
            }
            // Make sure no red is also green
            for (var i = 0, len = red.length; i < len; i++) {
                if (greenMap[red[i].id]) {
                    delete greenMap[red[i].id];
                }
            }
            var green = Object.keys(greenMap).map(function (id) { return greenMap[id]; });
            // console.log('greenExtensions: ', green.map(p => p.id));
            // console.log('redExtensions: ', red.map(p => p.id));
            if (red.length === 0) {
                // Finally reached only leafs!
                return winjs_base_1.TPromise.join(green.map(function (p) { return _this._activateExtension(p); })).then(function (_) { return void 0; });
            }
            return this._activateExtensions(green, recursionLevel + 1).then(function (_) {
                return _this._activateExtensions(red, recursionLevel + 1);
            });
        };
        AbstractExtensionService.prototype._activateExtension = function (extensionDescription) {
            var _this = this;
            if (hasOwnProperty.call(this._activatedExtensions, extensionDescription.id)) {
                return winjs_base_1.TPromise.as(void 0);
            }
            if (hasOwnProperty.call(this._activatingExtensions, extensionDescription.id)) {
                return this._activatingExtensions[extensionDescription.id];
            }
            this._activatingExtensions[extensionDescription.id] = this._actualActivateExtension(extensionDescription).then(null, function (err) {
                _this._showMessage(severity_1.default.Error, nls.localize('activationError', "Activating extension `{0}` failed: {1}.", extensionDescription.id, err.message));
                console.error('Activating extension `' + extensionDescription.id + '` failed: ', err.message);
                console.log('Here is the error stack: ', err.stack);
                // Treat the extension as being empty
                return _this._createFailedExtension();
            }).then(function (x) {
                _this._activatedExtensions[extensionDescription.id] = x;
                delete _this._activatingExtensions[extensionDescription.id];
            });
            return this._activatingExtensions[extensionDescription.id];
        };
        return AbstractExtensionService;
    }());
    exports.AbstractExtensionService = AbstractExtensionService;
});
