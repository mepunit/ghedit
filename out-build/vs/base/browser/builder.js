var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define(["require", "exports", 'vs/base/common/winjs.base', 'vs/base/common/types', 'vs/base/common/lifecycle', 'vs/base/common/strings', 'vs/base/common/assert', 'vs/base/browser/dom', 'vs/base/browser/browserService', 'vs/css!./builder'], function (require, exports, winjs_base_1, types, lifecycle_1, strings, assert, DOM, BrowserService) {
    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    'use strict';
    /**
     * Create a new builder from the element that is uniquely identified by the given identifier. If the
     *  second parameter "offdom" is set to true, the created elements will only be added to the provided
     *  element when the build() method is called.
     */
    function withElementById(id, offdom) {
        assert.ok(types.isString(id), 'Expected String as parameter');
        var element = BrowserService.getService().document.getElementById(id);
        if (element) {
            return new Builder(element, offdom);
        }
        return null;
    }
    exports.withElementById = withElementById;
    exports.Build = {
        withElementById: withElementById
    };
    // --- Implementation starts here
    var MS_DATA_KEY = '_msDataKey';
    var DATA_BINDING_ID = '__$binding';
    var LISTENER_BINDING_ID = '__$listeners';
    var VISIBILITY_BINDING_ID = '__$visibility';
    var Position = (function () {
        function Position(x, y) {
            this.x = x;
            this.y = y;
        }
        return Position;
    }());
    exports.Position = Position;
    var Box = (function () {
        function Box(top, right, bottom, left) {
            this.top = top;
            this.right = right;
            this.bottom = bottom;
            this.left = left;
        }
        return Box;
    }());
    exports.Box = Box;
    var Dimension = (function () {
        function Dimension(width, height) {
            this.width = width;
            this.height = height;
        }
        Dimension.prototype.substract = function (box) {
            return new Dimension(this.width - box.left - box.right, this.height - box.top - box.bottom);
        };
        return Dimension;
    }());
    exports.Dimension = Dimension;
    function data(element) {
        if (!element[MS_DATA_KEY]) {
            element[MS_DATA_KEY] = {};
        }
        return element[MS_DATA_KEY];
    }
    function hasData(element) {
        return !!element[MS_DATA_KEY];
    }
    /**
     *  Wraps around the provided element to manipulate it and add more child elements.
     */
    var Builder = (function () {
        function Builder(element, offdom) {
            this.offdom = offdom;
            this.container = element;
            this.currentElement = element;
            this.createdElements = [];
            this.toUnbind = {};
            this.captureToUnbind = {};
            this.browserService = BrowserService.getService();
        }
        /**
         *  Returns a new builder that lets the current HTML Element of this builder be the container
         *  for future additions on the builder.
         */
        Builder.prototype.asContainer = function () {
            return withBuilder(this, this.offdom);
        };
        /**
         *  Clones the builder providing the same properties as this one.
         */
        Builder.prototype.clone = function () {
            var builder = new Builder(this.container, this.offdom);
            builder.currentElement = this.currentElement;
            builder.createdElements = this.createdElements;
            builder.captureToUnbind = this.captureToUnbind;
            builder.toUnbind = this.toUnbind;
            return builder;
        };
        Builder.prototype.and = function (obj) {
            // Convert HTMLElement to Builder as necessary
            if (!(obj instanceof Builder) && !(obj instanceof MultiBuilder)) {
                obj = new Builder(obj, this.offdom);
            }
            // Wrap Builders into MultiBuilder
            var builders = [this];
            if (obj instanceof MultiBuilder) {
                for (var i = 0; i < obj.length; i++) {
                    builders.push(obj.item(i));
                }
            }
            else {
                builders.push(obj);
            }
            return new MultiBuilder(builders);
        };
        Builder.prototype.build = function (container, index) {
            assert.ok(this.offdom, 'This builder was not created off-dom, so build() can not be called.');
            // Use builders own container if present
            if (!container) {
                container = this.container;
            }
            else if (container instanceof Builder) {
                container = container.getHTMLElement();
            }
            assert.ok(container, 'Builder can only be build() with a container provided.');
            assert.ok(DOM.isHTMLElement(container), 'The container must either be a HTMLElement or a Builder.');
            var htmlContainer = container;
            // Append
            var i, len;
            var childNodes = htmlContainer.childNodes;
            if (types.isNumber(index) && index < childNodes.length) {
                for (i = 0, len = this.createdElements.length; i < len; i++) {
                    htmlContainer.insertBefore(this.createdElements[i], childNodes[index++]);
                }
            }
            else {
                for (i = 0, len = this.createdElements.length; i < len; i++) {
                    htmlContainer.appendChild(this.createdElements[i]);
                }
            }
            return this;
        };
        Builder.prototype.appendTo = function (container, index) {
            // Use builders own container if present
            if (!container) {
                container = this.container;
            }
            else if (container instanceof Builder) {
                container = container.getHTMLElement();
            }
            assert.ok(container, 'Builder can only be build() with a container provided.');
            assert.ok(DOM.isHTMLElement(container), 'The container must either be a HTMLElement or a Builder.');
            var htmlContainer = container;
            // Remove node from parent, if needed
            if (this.currentElement.parentNode) {
                this.currentElement.parentNode.removeChild(this.currentElement);
            }
            var childNodes = htmlContainer.childNodes;
            if (types.isNumber(index) && index < childNodes.length) {
                htmlContainer.insertBefore(this.currentElement, childNodes[index]);
            }
            else {
                htmlContainer.appendChild(this.currentElement);
            }
            return this;
        };
        Builder.prototype.append = function (child, index) {
            assert.ok(child, 'Need a child to append');
            if (DOM.isHTMLElement(child)) {
                child = withElement(child);
            }
            assert.ok(child instanceof Builder || child instanceof MultiBuilder, 'Need a child to append');
            child.appendTo(this, index);
            return this;
        };
        /**
         *  Removes the current element of this builder from its parent node.
         */
        Builder.prototype.offDOM = function () {
            if (this.currentElement.parentNode) {
                this.currentElement.parentNode.removeChild(this.currentElement);
            }
            return this;
        };
        /**
         *  Returns the HTML Element the builder is currently active on.
         */
        Builder.prototype.getHTMLElement = function () {
            return this.currentElement;
        };
        /**
         *  Returns the HTML Element the builder is building in.
         */
        Builder.prototype.getContainer = function () {
            return this.container;
        };
        // HTML Elements
        /**
         *  Creates a new element of this kind as child of the current element or parent.
         *  Accepts an object literal as first parameter that can be used to describe the
         *  attributes of the element.
         *  Accepts a function as second parameter that can be used to create child elements
         *  of the element. The function will be called with a new builder created with the
         *  provided element.
         */
        Builder.prototype.div = function (attributes, fn) {
            return this.doElement('div', attributes, fn);
        };
        /**
         *  Creates a new element of this kind as child of the current element or parent.
         *  Accepts an object literal as first parameter that can be used to describe the
         *  attributes of the element.
         *  Accepts a function as second parameter that can be used to create child elements
         *  of the element. The function will be called with a new builder created with the
         *  provided element.
         */
        Builder.prototype.p = function (attributes, fn) {
            return this.doElement('p', attributes, fn);
        };
        /**
         *  Creates a new element of this kind as child of the current element or parent.
         *  Accepts an object literal as first parameter that can be used to describe the
         *  attributes of the element.
         *  Accepts a function as second parameter that can be used to create child elements
         *  of the element. The function will be called with a new builder created with the
         *  provided element.
         */
        Builder.prototype.ul = function (attributes, fn) {
            return this.doElement('ul', attributes, fn);
        };
        /**
         *  Creates a new element of this kind as child of the current element or parent.
         *  Accepts an object literal as first parameter that can be used to describe the
         *  attributes of the element.
         *  Accepts a function as second parameter that can be used to create child elements
         *  of the element. The function will be called with a new builder created with the
         *  provided element.
         */
        Builder.prototype.ol = function (attributes, fn) {
            return this.doElement('ol', attributes, fn);
        };
        /**
         *  Creates a new element of this kind as child of the current element or parent.
         *  Accepts an object literal as first parameter that can be used to describe the
         *  attributes of the element.
         *  Accepts a function as second parameter that can be used to create child elements
         *  of the element. The function will be called with a new builder created with the
         *  provided element.
         */
        Builder.prototype.li = function (attributes, fn) {
            return this.doElement('li', attributes, fn);
        };
        /**
         *  Creates a new element of this kind as child of the current element or parent.
         *  Accepts an object literal as first parameter that can be used to describe the
         *  attributes of the element.
         *  Accepts a function as second parameter that can be used to create child elements
         *  of the element. The function will be called with a new builder created with the
         *  provided element.
         */
        Builder.prototype.span = function (attributes, fn) {
            return this.doElement('span', attributes, fn);
        };
        /**
         *  Creates a new element of this kind as child of the current element or parent.
         *  Accepts an object literal as first parameter that can be used to describe the
         *  attributes of the element.
         *  Accepts a function as second parameter that can be used to create child elements
         *  of the element. The function will be called with a new builder created with the
         *  provided element.
         */
        Builder.prototype.img = function (attributes, fn) {
            return this.doElement('img', attributes, fn);
        };
        /**
         *  Creates a new element of this kind as child of the current element or parent.
         *  Accepts an object literal as first parameter that can be used to describe the
         *  attributes of the element.
         *  Accepts a function as second parameter that can be used to create child elements
         *  of the element. The function will be called with a new builder created with the
         *  provided element.
         */
        Builder.prototype.a = function (attributes, fn) {
            return this.doElement('a', attributes, fn);
        };
        /**
         *  Creates a new element of this kind as child of the current element or parent.
         *  Accepts an object literal as first parameter that can be used to describe the
         *  attributes of the element.
         *  Accepts a function as second parameter that can be used to create child elements
         *  of the element. The function will be called with a new builder created with the
         *  provided element.
         */
        Builder.prototype.header = function (attributes, fn) {
            return this.doElement('header', attributes, fn);
        };
        /**
         *  Creates a new element of this kind as child of the current element or parent.
         *  Accepts an object literal as first parameter that can be used to describe the
         *  attributes of the element.
         *  Accepts a function as second parameter that can be used to create child elements
         *  of the element. The function will be called with a new builder created with the
         *  provided element.
         */
        Builder.prototype.section = function (attributes, fn) {
            return this.doElement('section', attributes, fn);
        };
        /**
         *  Creates a new element of this kind as child of the current element or parent.
         *  Accepts an object literal as first parameter that can be used to describe the
         *  attributes of the element.
         *  Accepts a function as second parameter that can be used to create child elements
         *  of the element. The function will be called with a new builder created with the
         *  provided element.
         */
        Builder.prototype.footer = function (attributes, fn) {
            return this.doElement('footer', attributes, fn);
        };
        /**
         *  Creates a new element of given tag name as child of the current element or parent.
         *  Accepts an object literal as first parameter that can be used to describe the
         *  attributes of the element.
         *  Accepts a function as second parameter that can be used to create child elements
         *  of the element. The function will be called with a new builder created with the
         *  provided element.
         */
        Builder.prototype.element = function (name, attributes, fn) {
            return this.doElement(name, attributes, fn);
        };
        Builder.prototype.doElement = function (name, attributesOrFn, fn) {
            // Create Element
            var element = this.browserService.document.createElement(name);
            this.currentElement = element;
            // Off-DOM: Remember in array of created elements
            if (this.offdom) {
                this.createdElements.push(element);
            }
            // Object (apply properties as attributes to HTML element)
            if (types.isObject(attributesOrFn)) {
                this.attr(attributesOrFn);
            }
            // Support second argument being function
            if (types.isFunction(attributesOrFn)) {
                fn = attributesOrFn;
            }
            // Apply Functions (Elements created in Functions will be added as child to current element)
            if (types.isFunction(fn)) {
                var builder = new Builder(element);
                fn.call(builder, builder); // Set both 'this' and the first parameter to the new builder
            }
            // Add to parent
            if (!this.offdom) {
                this.container.appendChild(element);
            }
            return this;
        };
        /**
         *  Calls focus() on the current HTML element;
         */
        Builder.prototype.domFocus = function () {
            this.currentElement.focus();
            return this;
        };
        /**
         *  Returns true if the current element of this builder is the active element.
         */
        Builder.prototype.hasFocus = function () {
            var activeElement = this.browserService.document.activeElement;
            return (activeElement === this.currentElement);
        };
        /**
         *  Calls select() on the current HTML element;
         */
        Builder.prototype.domSelect = function (range) {
            if (range === void 0) { range = null; }
            var input = this.currentElement;
            input.select();
            if (range) {
                input.setSelectionRange(range.start, range.end);
            }
            return this;
        };
        /**
         *  Calls blur() on the current HTML element;
         */
        Builder.prototype.domBlur = function () {
            this.currentElement.blur();
            return this;
        };
        /**
         *  Calls click() on the current HTML element;
         */
        Builder.prototype.domClick = function () {
            this.currentElement.click();
            return this;
        };
        Builder.prototype.on = function (arg1, fn, listenerToUnbindContainer, useCapture) {
            var _this = this;
            // Event Type Array
            if (types.isArray(arg1)) {
                arg1.forEach(function (type) {
                    _this.on(type, fn, listenerToUnbindContainer, useCapture);
                });
            }
            else {
                var type = arg1;
                // Add Listener
                var unbind_1 = DOM.addDisposableListener(this.currentElement, type, function (e) {
                    fn(e, _this, unbind_1); // Pass in Builder as Second Argument
                }, useCapture || false);
                // Remember for off() use
                if (useCapture) {
                    if (!this.captureToUnbind[type]) {
                        this.captureToUnbind[type] = [];
                    }
                    this.captureToUnbind[type].push(unbind_1);
                }
                else {
                    if (!this.toUnbind[type]) {
                        this.toUnbind[type] = [];
                    }
                    this.toUnbind[type].push(unbind_1);
                }
                // Bind to Element
                var listenerBinding = this.getProperty(LISTENER_BINDING_ID, []);
                listenerBinding.push(unbind_1);
                this.setProperty(LISTENER_BINDING_ID, listenerBinding);
                // Add to Array if passed in
                if (listenerToUnbindContainer && types.isArray(listenerToUnbindContainer)) {
                    listenerToUnbindContainer.push(unbind_1);
                }
            }
            return this;
        };
        Builder.prototype.off = function (arg1, useCapture) {
            var _this = this;
            // Event Type Array
            if (types.isArray(arg1)) {
                arg1.forEach(function (type) {
                    _this.off(type);
                });
            }
            else {
                var type = arg1;
                if (useCapture) {
                    if (this.captureToUnbind[type]) {
                        this.captureToUnbind[type] = lifecycle_1.dispose(this.captureToUnbind[type]);
                    }
                }
                else {
                    if (this.toUnbind[type]) {
                        this.toUnbind[type] = lifecycle_1.dispose(this.toUnbind[type]);
                    }
                }
            }
            return this;
        };
        Builder.prototype.once = function (arg1, fn, listenerToUnbindContainer, useCapture) {
            var _this = this;
            // Event Type Array
            if (types.isArray(arg1)) {
                arg1.forEach(function (type) {
                    _this.once(type, fn);
                });
            }
            else {
                var type = arg1;
                // Add Listener
                var unbind_2 = DOM.addDisposableListener(this.currentElement, type, function (e) {
                    fn(e, _this, unbind_2); // Pass in Builder as Second Argument
                    unbind_2.dispose();
                }, useCapture || false);
                // Add to Array if passed in
                if (listenerToUnbindContainer && types.isArray(listenerToUnbindContainer)) {
                    listenerToUnbindContainer.push(unbind_2);
                }
            }
            return this;
        };
        Builder.prototype.preventDefault = function (arg1, cancelBubble, listenerToUnbindContainer, useCapture) {
            var fn = function (e) {
                e.preventDefault();
                if (cancelBubble) {
                    if (e.stopPropagation) {
                        e.stopPropagation();
                    }
                    else {
                        e.cancelBubble = true;
                    }
                }
            };
            return this.on(arg1, fn, listenerToUnbindContainer);
        };
        Builder.prototype.attr = function (firstP, secondP) {
            // Apply Object Literal to Attributes of Element
            if (types.isObject(firstP)) {
                for (var prop in firstP) {
                    if (firstP.hasOwnProperty(prop)) {
                        var value = firstP[prop];
                        this.doSetAttr(prop, value);
                    }
                }
                return this;
            }
            // Get Attribute Value
            if (types.isString(firstP) && !types.isString(secondP)) {
                return this.currentElement.getAttribute(firstP);
            }
            // Set Attribute Value
            if (types.isString(firstP)) {
                if (!types.isString(secondP)) {
                    secondP = String(secondP);
                }
                this.doSetAttr(firstP, secondP);
            }
            return this;
        };
        Builder.prototype.doSetAttr = function (prop, value) {
            if (prop === 'class') {
                prop = 'addClass'; // Workaround for the issue that a function name can not be 'class' in ES
            }
            if (this[prop]) {
                if (types.isArray(value)) {
                    this[prop].apply(this, value);
                }
                else {
                    this[prop].call(this, value);
                }
            }
            else {
                this.currentElement.setAttribute(prop, value);
            }
        };
        /**
         * Removes an attribute by the given name.
         */
        Builder.prototype.removeAttribute = function (prop) {
            this.currentElement.removeAttribute(prop);
        };
        /**
         *  Sets the id attribute to the value provided for the current HTML element of the builder.
         */
        Builder.prototype.id = function (id) {
            this.currentElement.setAttribute('id', id);
            return this;
        };
        /**
         *  Sets the src attribute to the value provided for the current HTML element of the builder.
         */
        Builder.prototype.src = function (src) {
            this.currentElement.setAttribute('src', src);
            return this;
        };
        /**
         *  Sets the href attribute to the value provided for the current HTML element of the builder.
         */
        Builder.prototype.href = function (href) {
            this.currentElement.setAttribute('href', href);
            return this;
        };
        /**
         *  Sets the title attribute to the value provided for the current HTML element of the builder.
         */
        Builder.prototype.title = function (title) {
            this.currentElement.setAttribute('title', title);
            return this;
        };
        /**
         *  Sets the name attribute to the value provided for the current HTML element of the builder.
         */
        Builder.prototype.name = function (name) {
            this.currentElement.setAttribute('name', name);
            return this;
        };
        /**
         *  Sets the type attribute to the value provided for the current HTML element of the builder.
         */
        Builder.prototype.type = function (type) {
            this.currentElement.setAttribute('type', type);
            return this;
        };
        /**
         *  Sets the value attribute to the value provided for the current HTML element of the builder.
         */
        Builder.prototype.value = function (value) {
            this.currentElement.setAttribute('value', value);
            return this;
        };
        /**
         *  Sets the alt attribute to the value provided for the current HTML element of the builder.
         */
        Builder.prototype.alt = function (alt) {
            this.currentElement.setAttribute('alt', alt);
            return this;
        };
        /**
         *  Sets the name draggable to the value provided for the current HTML element of the builder.
         */
        Builder.prototype.draggable = function (isDraggable) {
            this.currentElement.setAttribute('draggable', isDraggable ? 'true' : 'false');
            return this;
        };
        /**
         *  Sets the tabindex attribute to the value provided for the current HTML element of the builder.
         */
        Builder.prototype.tabindex = function (index) {
            this.currentElement.setAttribute('tabindex', index.toString());
            return this;
        };
        Builder.prototype.style = function (firstP, secondP) {
            // Apply Object Literal to Styles of Element
            if (types.isObject(firstP)) {
                for (var prop in firstP) {
                    if (firstP.hasOwnProperty(prop)) {
                        var value = firstP[prop];
                        this.doSetStyle(prop, value);
                    }
                }
            }
            else if (types.isString(firstP) && !types.isString(secondP)) {
                return this.currentElement.style[this.cssKeyToJavaScriptProperty(firstP)];
            }
            else if (types.isString(firstP) && types.isString(secondP)) {
                this.doSetStyle(firstP, secondP);
            }
            return this;
        };
        Builder.prototype.doSetStyle = function (key, value) {
            if (key.indexOf('-') >= 0) {
                var segments = key.split('-');
                key = segments[0];
                for (var i = 1; i < segments.length; i++) {
                    var segment = segments[i];
                    key = key + segment.charAt(0).toUpperCase() + segment.substr(1);
                }
            }
            this.currentElement.style[this.cssKeyToJavaScriptProperty(key)] = value;
        };
        Builder.prototype.cssKeyToJavaScriptProperty = function (key) {
            // Automagically convert dashes as they are not allowed when programmatically
            // setting a CSS style property
            if (key.indexOf('-') >= 0) {
                var segments = key.split('-');
                key = segments[0];
                for (var i = 1; i < segments.length; i++) {
                    var segment = segments[i];
                    key = key + segment.charAt(0).toUpperCase() + segment.substr(1);
                }
            }
            else if (key === 'float') {
                key = 'cssFloat';
            }
            return key;
        };
        /**
         *  Returns the computed CSS style for the current HTML element of the builder.
         */
        Builder.prototype.getComputedStyle = function () {
            return DOM.getComputedStyle(this.currentElement);
        };
        /**
         *  Adds the variable list of arguments as class names to the current HTML element of the builder.
         */
        Builder.prototype.addClass = function () {
            var _this = this;
            var classes = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                classes[_i - 0] = arguments[_i];
            }
            classes.forEach(function (nameValue) {
                var names = nameValue.split(' ');
                names.forEach(function (name) {
                    DOM.addClass(_this.currentElement, name);
                });
            });
            return this;
        };
        /**
         *  Sets the class name of the current HTML element of the builder to the provided className.
         *  If shouldAddClass is provided - for true class is added, for false class is removed.
         */
        Builder.prototype.setClass = function (className, shouldAddClass) {
            if (shouldAddClass === void 0) { shouldAddClass = null; }
            if (shouldAddClass === null) {
                this.currentElement.className = className;
            }
            else if (shouldAddClass) {
                this.addClass(className);
            }
            else {
                this.removeClass(className);
            }
            return this;
        };
        /**
         *  Returns whether the current HTML element of the builder has the provided class assigned.
         */
        Builder.prototype.hasClass = function (className) {
            return DOM.hasClass(this.currentElement, className);
        };
        /**
         *  Removes the variable list of arguments as class names from the current HTML element of the builder.
         */
        Builder.prototype.removeClass = function () {
            var _this = this;
            var classes = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                classes[_i - 0] = arguments[_i];
            }
            classes.forEach(function (nameValue) {
                var names = nameValue.split(' ');
                names.forEach(function (name) {
                    DOM.removeClass(_this.currentElement, name);
                });
            });
            return this;
        };
        /**
         *  Sets the first class to the current HTML element of the builder if the second class is currently set
         *  and vice versa otherwise.
         */
        Builder.prototype.swapClass = function (classA, classB) {
            if (this.hasClass(classA)) {
                this.removeClass(classA);
                this.addClass(classB);
            }
            else {
                this.removeClass(classB);
                this.addClass(classA);
            }
            return this;
        };
        /**
         *  Adds or removes the provided className for the current HTML element of the builder.
         */
        Builder.prototype.toggleClass = function (className) {
            if (this.hasClass(className)) {
                this.removeClass(className);
            }
            else {
                this.addClass(className);
            }
            return this;
        };
        /**
         *  Sets the CSS property color.
         */
        Builder.prototype.color = function (color) {
            this.currentElement.style.color = color;
            return this;
        };
        /**
         *  Sets the CSS property background.
         */
        Builder.prototype.background = function (color) {
            this.currentElement.style.backgroundColor = color;
            return this;
        };
        Builder.prototype.padding = function (top, right, bottom, left) {
            if (types.isString(top) && top.indexOf(' ') >= 0) {
                return this.padding.apply(this, top.split(' '));
            }
            if (!types.isUndefinedOrNull(top)) {
                this.currentElement.style.paddingTop = this.toPixel(top);
            }
            if (!types.isUndefinedOrNull(right)) {
                this.currentElement.style.paddingRight = this.toPixel(right);
            }
            if (!types.isUndefinedOrNull(bottom)) {
                this.currentElement.style.paddingBottom = this.toPixel(bottom);
            }
            if (!types.isUndefinedOrNull(left)) {
                this.currentElement.style.paddingLeft = this.toPixel(left);
            }
            return this;
        };
        Builder.prototype.margin = function (top, right, bottom, left) {
            if (types.isString(top) && top.indexOf(' ') >= 0) {
                return this.margin.apply(this, top.split(' '));
            }
            if (!types.isUndefinedOrNull(top)) {
                this.currentElement.style.marginTop = this.toPixel(top);
            }
            if (!types.isUndefinedOrNull(right)) {
                this.currentElement.style.marginRight = this.toPixel(right);
            }
            if (!types.isUndefinedOrNull(bottom)) {
                this.currentElement.style.marginBottom = this.toPixel(bottom);
            }
            if (!types.isUndefinedOrNull(left)) {
                this.currentElement.style.marginLeft = this.toPixel(left);
            }
            return this;
        };
        Builder.prototype.position = function (top, right, bottom, left, position) {
            if (types.isString(top) && top.indexOf(' ') >= 0) {
                return this.position.apply(this, top.split(' '));
            }
            if (!types.isUndefinedOrNull(top)) {
                this.currentElement.style.top = this.toPixel(top);
            }
            if (!types.isUndefinedOrNull(right)) {
                this.currentElement.style.right = this.toPixel(right);
            }
            if (!types.isUndefinedOrNull(bottom)) {
                this.currentElement.style.bottom = this.toPixel(bottom);
            }
            if (!types.isUndefinedOrNull(left)) {
                this.currentElement.style.left = this.toPixel(left);
            }
            if (!position) {
                position = 'absolute';
            }
            this.currentElement.style.position = position;
            return this;
        };
        Builder.prototype.size = function (width, height) {
            if (types.isString(width) && width.indexOf(' ') >= 0) {
                return this.size.apply(this, width.split(' '));
            }
            if (!types.isUndefinedOrNull(width)) {
                this.currentElement.style.width = this.toPixel(width);
            }
            if (!types.isUndefinedOrNull(height)) {
                this.currentElement.style.height = this.toPixel(height);
            }
            return this;
        };
        Builder.prototype.minSize = function (width, height) {
            if (types.isString(width) && width.indexOf(' ') >= 0) {
                return this.minSize.apply(this, width.split(' '));
            }
            if (!types.isUndefinedOrNull(width)) {
                this.currentElement.style.minWidth = this.toPixel(width);
            }
            if (!types.isUndefinedOrNull(height)) {
                this.currentElement.style.minHeight = this.toPixel(height);
            }
            return this;
        };
        Builder.prototype.maxSize = function (width, height) {
            if (types.isString(width) && width.indexOf(' ') >= 0) {
                return this.maxSize.apply(this, width.split(' '));
            }
            if (!types.isUndefinedOrNull(width)) {
                this.currentElement.style.maxWidth = this.toPixel(width);
            }
            if (!types.isUndefinedOrNull(height)) {
                this.currentElement.style.maxHeight = this.toPixel(height);
            }
            return this;
        };
        /**
         *  Sets the CSS property float.
         */
        Builder.prototype.float = function (float) {
            this.currentElement.style.cssFloat = float;
            return this;
        };
        /**
         *  Sets the CSS property clear.
         */
        Builder.prototype.clear = function (clear) {
            this.currentElement.style.clear = clear;
            return this;
        };
        /**
         *  Sets the CSS property for fonts back to default.
         */
        Builder.prototype.normal = function () {
            this.currentElement.style.fontStyle = 'normal';
            this.currentElement.style.fontWeight = 'normal';
            this.currentElement.style.textDecoration = 'none';
            return this;
        };
        /**
         *  Sets the CSS property font-style to italic.
         */
        Builder.prototype.italic = function () {
            this.currentElement.style.fontStyle = 'italic';
            return this;
        };
        /**
         *  Sets the CSS property font-weight to bold.
         */
        Builder.prototype.bold = function () {
            this.currentElement.style.fontWeight = 'bold';
            return this;
        };
        /**
         *  Sets the CSS property text-decoration to underline.
         */
        Builder.prototype.underline = function () {
            this.currentElement.style.textDecoration = 'underline';
            return this;
        };
        /**
         *  Sets the CSS property overflow.
         */
        Builder.prototype.overflow = function (overflow) {
            this.currentElement.style.overflow = overflow;
            return this;
        };
        /**
         *  Sets the CSS property display.
         */
        Builder.prototype.display = function (display) {
            this.currentElement.style.display = display;
            return this;
        };
        Builder.prototype.disable = function () {
            this.currentElement.setAttribute('disabled', 'disabled');
            return this;
        };
        Builder.prototype.enable = function () {
            this.currentElement.removeAttribute('disabled');
            return this;
        };
        /**
         *  Shows the current element of the builder.
         */
        Builder.prototype.show = function () {
            if (this.hasClass('hidden')) {
                this.removeClass('hidden');
            }
            this.attr('aria-hidden', 'false');
            // Cancel any pending showDelayed() invocation
            this.cancelVisibilityPromise();
            return this;
        };
        /**
         *  Shows the current builder element after the provided delay. If the builder
         *  was set to hidden using the hide() method before this method executed, the
         *  function will return without showing the current element. This is useful to
         *  only show the element when a specific delay is reached (e.g. for a long running
         *  operation.
         */
        Builder.prototype.showDelayed = function (delay) {
            var _this = this;
            // Cancel any pending showDelayed() invocation
            this.cancelVisibilityPromise();
            var promise = winjs_base_1.TPromise.timeout(delay);
            this.setProperty(VISIBILITY_BINDING_ID, promise);
            promise.done(function () {
                _this.removeProperty(VISIBILITY_BINDING_ID);
                _this.show();
            });
            return this;
        };
        /**
         *  Hides the current element of the builder.
         */
        Builder.prototype.hide = function () {
            if (!this.hasClass('hidden')) {
                this.addClass('hidden');
            }
            this.attr('aria-hidden', 'true');
            // Cancel any pending showDelayed() invocation
            this.cancelVisibilityPromise();
            return this;
        };
        /**
         *  Returns true if the current element of the builder is hidden.
         */
        Builder.prototype.isHidden = function () {
            return this.hasClass('hidden') || this.currentElement.style.display === 'none';
        };
        /**
         *  Toggles visibility of the current element of the builder.
         */
        Builder.prototype.toggleVisibility = function () {
            // Cancel any pending showDelayed() invocation
            this.cancelVisibilityPromise();
            this.swapClass('builder-visible', 'hidden');
            if (this.isHidden()) {
                this.attr('aria-hidden', 'true');
            }
            else {
                this.attr('aria-hidden', 'false');
            }
            return this;
        };
        Builder.prototype.cancelVisibilityPromise = function () {
            var promise = this.getProperty(VISIBILITY_BINDING_ID);
            if (promise) {
                promise.cancel();
                this.removeProperty(VISIBILITY_BINDING_ID);
            }
        };
        Builder.prototype.border = function (width, style, color) {
            if (types.isString(width) && width.indexOf(' ') >= 0) {
                return this.border.apply(this, width.split(' '));
            }
            this.currentElement.style.borderWidth = this.toPixel(width);
            if (color) {
                this.currentElement.style.borderColor = color;
            }
            if (style) {
                this.currentElement.style.borderStyle = style;
            }
            return this;
        };
        Builder.prototype.borderTop = function (width, style, color) {
            if (types.isString(width) && width.indexOf(' ') >= 0) {
                return this.borderTop.apply(this, width.split(' '));
            }
            this.currentElement.style.borderTopWidth = this.toPixel(width);
            if (color) {
                this.currentElement.style.borderTopColor = color;
            }
            if (style) {
                this.currentElement.style.borderTopStyle = style;
            }
            return this;
        };
        Builder.prototype.borderBottom = function (width, style, color) {
            if (types.isString(width) && width.indexOf(' ') >= 0) {
                return this.borderBottom.apply(this, width.split(' '));
            }
            this.currentElement.style.borderBottomWidth = this.toPixel(width);
            if (color) {
                this.currentElement.style.borderBottomColor = color;
            }
            if (style) {
                this.currentElement.style.borderBottomStyle = style;
            }
            return this;
        };
        Builder.prototype.borderLeft = function (width, style, color) {
            if (types.isString(width) && width.indexOf(' ') >= 0) {
                return this.borderLeft.apply(this, width.split(' '));
            }
            this.currentElement.style.borderLeftWidth = this.toPixel(width);
            if (color) {
                this.currentElement.style.borderLeftColor = color;
            }
            if (style) {
                this.currentElement.style.borderLeftStyle = style;
            }
            return this;
        };
        Builder.prototype.borderRight = function (width, style, color) {
            if (types.isString(width) && width.indexOf(' ') >= 0) {
                return this.borderRight.apply(this, width.split(' '));
            }
            this.currentElement.style.borderRightWidth = this.toPixel(width);
            if (color) {
                this.currentElement.style.borderRightColor = color;
            }
            if (style) {
                this.currentElement.style.borderRightStyle = style;
            }
            return this;
        };
        /**
         *  Sets the CSS property text-align.
         */
        Builder.prototype.textAlign = function (textAlign) {
            this.currentElement.style.textAlign = textAlign;
            return this;
        };
        /**
         *  Sets the CSS property vertical-align.
         */
        Builder.prototype.verticalAlign = function (valign) {
            this.currentElement.style.verticalAlign = valign;
            return this;
        };
        Builder.prototype.toPixel = function (obj) {
            if (obj.toString().indexOf('px') === -1) {
                return obj.toString() + 'px';
            }
            return obj;
        };
        /**
         *  Sets the innerHTML attribute.
         */
        Builder.prototype.innerHtml = function (html, append) {
            if (append) {
                this.currentElement.innerHTML += html;
            }
            else {
                this.currentElement.innerHTML = html;
            }
            return this;
        };
        /**
         *  Sets the textContent property of the element.
         *  All HTML special characters will be escaped.
         */
        Builder.prototype.text = function (text, append) {
            if (append) {
                // children is child Elements versus childNodes includes textNodes
                if (this.currentElement.children.length === 0) {
                    this.currentElement.textContent += text;
                }
                else {
                    // if there are elements inside this node, append the string as a new text node
                    // to avoid wiping out the innerHTML and replacing it with only text content
                    this.currentElement.appendChild(this.browserService.document.createTextNode(text));
                }
            }
            else {
                this.currentElement.textContent = text;
            }
            return this;
        };
        /**
         *  Sets the innerHTML attribute in escaped form.
         */
        Builder.prototype.safeInnerHtml = function (html, append) {
            return this.innerHtml(strings.escape(html), append);
        };
        /**
         *  Adds the provided object as property to the current element. Call getBinding()
         *  to retrieve it again.
         */
        Builder.prototype.bind = function (object) {
            bindElement(this.currentElement, object);
            return this;
        };
        /**
         *  Removes the binding of the current element.
         */
        Builder.prototype.unbind = function () {
            unbindElement(this.currentElement);
            return this;
        };
        /**
         *  Returns the object that was passed into the bind() call.
         */
        Builder.prototype.getBinding = function () {
            return getBindingFromElement(this.currentElement);
        };
        /**
         *  Allows to store arbritary data into the current element.
         */
        Builder.prototype.setProperty = function (key, value) {
            setPropertyOnElement(this.currentElement, key, value);
            return this;
        };
        /**
         *  Allows to get arbritary data from the current element.
         */
        Builder.prototype.getProperty = function (key, fallback) {
            return getPropertyFromElement(this.currentElement, key, fallback);
        };
        /**
         *  Removes a property from the current element that is stored under the given key.
         */
        Builder.prototype.removeProperty = function (key) {
            if (hasData(this.currentElement)) {
                delete data(this.currentElement)[key];
            }
            return this;
        };
        /**
         *  Returns a new builder with the parent element of the current element of the builder.
         */
        Builder.prototype.parent = function (offdom) {
            assert.ok(!this.offdom, 'Builder was created with offdom = true and thus has no parent set');
            return withElement(this.currentElement.parentNode, offdom);
        };
        /**
         *  Returns a new builder with all child elements of the current element of the builder.
         */
        Builder.prototype.children = function (offdom) {
            var children = this.currentElement.children;
            var builders = [];
            for (var i = 0; i < children.length; i++) {
                builders.push(withElement(children.item(i), offdom));
            }
            return new MultiBuilder(builders);
        };
        /**
         *  Removes the current HTMLElement from the given builder from this builder if this builders
         *  current HTMLElement is the direct parent.
         */
        Builder.prototype.removeChild = function (builder) {
            if (this.currentElement === builder.parent().getHTMLElement()) {
                this.currentElement.removeChild(builder.getHTMLElement());
            }
            return this;
        };
        /**
         *  Returns a new builder with all elements matching the provided selector scoped to the
         *  current element of the builder. Use Build.withElementsBySelector() to run the selector
         *  over the entire DOM.
         *  The returned builder is an instance of array that can have 0 elements if the selector does not match any
         *  elements.
         */
        Builder.prototype.select = function (selector, offdom) {
            assert.ok(types.isString(selector), 'Expected String as parameter');
            var elements = this.currentElement.querySelectorAll(selector);
            var builders = [];
            for (var i = 0; i < elements.length; i++) {
                builders.push(withElement(elements.item(i), offdom));
            }
            return new MultiBuilder(builders);
        };
        /**
         *  Returns true if the current element of the builder matches the given selector and false otherwise.
         */
        Builder.prototype.matches = function (selector) {
            var element = this.currentElement;
            var matches = element.webkitMatchesSelector || element.mozMatchesSelector || element.msMatchesSelector || element.oMatchesSelector;
            return matches && matches.call(element, selector);
        };
        /**
         *  Returns true if the current element of the builder has no children.
         */
        Builder.prototype.isEmpty = function () {
            return !this.currentElement.childNodes || this.currentElement.childNodes.length === 0;
        };
        /**
         * Recurse through all descendant nodes and remove their data binding.
         */
        Builder.prototype.unbindDescendants = function (current) {
            if (current && current.children) {
                for (var i = 0, length_1 = current.children.length; i < length_1; i++) {
                    var element = current.children.item(i);
                    // Unbind
                    if (hasData(element)) {
                        // Listeners
                        var listeners = data(element)[LISTENER_BINDING_ID];
                        if (types.isArray(listeners)) {
                            while (listeners.length) {
                                listeners.pop().dispose();
                            }
                        }
                        // Delete Data Slot
                        delete element[MS_DATA_KEY];
                    }
                    // Recurse
                    this.unbindDescendants(element);
                }
            }
        };
        /**
         *  Removes all HTML elements from the current element of the builder. Will also clean up any
         *  event listners registered and also clear any data binding and properties stored
         *  to any child element.
         */
        Builder.prototype.empty = function () {
            this.unbindDescendants(this.currentElement);
            this.clearChildren();
            if (this.offdom) {
                this.createdElements = [];
            }
            return this;
        };
        /**
         *  Removes all HTML elements from the current element of the builder.
         */
        Builder.prototype.clearChildren = function () {
            // Remove Elements
            if (this.currentElement) {
                DOM.clearNode(this.currentElement);
            }
            return this;
        };
        /**
         *  Removes the current HTML element and all its children from its parent and unbinds
         *  all listeners and properties set to the data slots.
         */
        Builder.prototype.destroy = function () {
            if (this.currentElement) {
                // Remove from parent
                if (this.currentElement.parentNode) {
                    this.currentElement.parentNode.removeChild(this.currentElement);
                }
                // Empty to clear listeners and bindings from children
                this.empty();
                // Unbind
                if (hasData(this.currentElement)) {
                    // Listeners
                    var listeners = data(this.currentElement)[LISTENER_BINDING_ID];
                    if (types.isArray(listeners)) {
                        while (listeners.length) {
                            listeners.pop().dispose();
                        }
                    }
                    // Delete Data Slot
                    delete this.currentElement[MS_DATA_KEY];
                }
            }
            var type;
            for (type in this.toUnbind) {
                if (this.toUnbind.hasOwnProperty(type) && types.isArray(this.toUnbind[type])) {
                    this.toUnbind[type] = lifecycle_1.dispose(this.toUnbind[type]);
                }
            }
            for (type in this.captureToUnbind) {
                if (this.captureToUnbind.hasOwnProperty(type) && types.isArray(this.captureToUnbind[type])) {
                    this.captureToUnbind[type] = lifecycle_1.dispose(this.captureToUnbind[type]);
                }
            }
            // Nullify fields
            this.currentElement = null;
            this.container = null;
            this.offdom = null;
            this.createdElements = null;
            this.captureToUnbind = null;
            this.toUnbind = null;
        };
        /**
         *  Removes the current HTML element and all its children from its parent and unbinds
         *  all listeners and properties set to the data slots.
         */
        Builder.prototype.dispose = function () {
            this.destroy();
        };
        Builder.prototype.getPositionRelativeTo = function (element) {
            if (element instanceof Builder) {
                element = element.getHTMLElement();
            }
            var left = DOM.getRelativeLeft(this.currentElement, element);
            var top = DOM.getRelativeTop(this.currentElement, element);
            return new Box(top, -1, -1, left);
        };
        /**
         *  Gets the absolute coordinates of the element.
         */
        Builder.prototype.getPosition = function () {
            var position = DOM.getTopLeftOffset(this.currentElement);
            return new Box(position.top, -1, -1, position.left);
        };
        /**
         *  Gets the size (in pixels) of an element, including the margin.
         */
        Builder.prototype.getTotalSize = function () {
            var totalWidth = DOM.getTotalWidth(this.currentElement);
            var totalHeight = DOM.getTotalHeight(this.currentElement);
            return new Dimension(totalWidth, totalHeight);
        };
        /**
         *  Gets the size (in pixels) of the inside of the element, excluding the border and padding.
         */
        Builder.prototype.getContentSize = function () {
            var contentWidth = DOM.getContentWidth(this.currentElement);
            var contentHeight = DOM.getContentHeight(this.currentElement);
            return new Dimension(contentWidth, contentHeight);
        };
        /**
         *  Another variant of getting the inner dimensions of an element.
         */
        Builder.prototype.getClientArea = function () {
            // 0.) Try with DOM getDomNodePosition
            if (this.currentElement !== this.browserService.document.body) {
                var dimensions = DOM.getDomNodePosition(this.currentElement);
                return new Dimension(dimensions.width, dimensions.height);
            }
            // 1.) Try innerWidth / innerHeight
            if (this.browserService.window.innerWidth && this.browserService.window.innerHeight) {
                return new Dimension(this.browserService.window.innerWidth, this.browserService.window.innerHeight);
            }
            // 2.) Try with document.body.clientWidth / document.body.clientHeigh
            if (this.browserService.document.body && this.browserService.document.body.clientWidth && this.browserService.document.body.clientWidth) {
                return new Dimension(this.browserService.document.body.clientWidth, this.browserService.document.body.clientHeight);
            }
            // 3.) Try with document.documentElement.clientWidth / document.documentElement.clientHeight
            if (this.browserService.document.documentElement && this.browserService.document.documentElement.clientWidth && this.browserService.document.documentElement.clientHeight) {
                return new Dimension(this.browserService.document.documentElement.clientWidth, this.browserService.document.documentElement.clientHeight);
            }
            throw new Error('Unable to figure out browser width and height');
        };
        return Builder;
    }());
    exports.Builder = Builder;
    /**
     *  The multi builder provides the same methods as the builder, but allows to call
     *  them on an array of builders.
     */
    var MultiBuilder = (function (_super) {
        __extends(MultiBuilder, _super);
        function MultiBuilder(builders) {
            assert.ok(types.isArray(builders) || builders instanceof MultiBuilder, 'Expected Array or MultiBuilder as parameter');
            _super.call(this);
            this.length = 0;
            this.builders = [];
            // Add Builders to Array
            if (types.isArray(builders)) {
                for (var i = 0; i < builders.length; i++) {
                    if (builders[i] instanceof HTMLElement) {
                        this.push(withElement(builders[i]));
                    }
                    else {
                        this.push(builders[i]);
                    }
                }
            }
            else {
                for (var i = 0; i < builders.length; i++) {
                    this.push(builders.item(i));
                }
            }
            // Mixin Builder functions to operate on all builders
            var $outer = this;
            var propertyFn = function (prop) {
                $outer[prop] = function () {
                    var args = Array.prototype.slice.call(arguments);
                    var returnValues;
                    var mergeBuilders = false;
                    for (var i = 0; i < $outer.length; i++) {
                        var res = $outer.item(i)[prop].apply($outer.item(i), args);
                        // Merge MultiBuilders into one
                        if (res instanceof MultiBuilder) {
                            if (!returnValues) {
                                returnValues = [];
                            }
                            mergeBuilders = true;
                            for (var j = 0; j < res.length; j++) {
                                returnValues.push(res.item(j));
                            }
                        }
                        else if (!types.isUndefined(res) && !(res instanceof Builder)) {
                            if (!returnValues) {
                                returnValues = [];
                            }
                            returnValues.push(res);
                        }
                    }
                    if (returnValues && mergeBuilders) {
                        return new MultiBuilder(returnValues);
                    }
                    return returnValues || $outer;
                };
            };
            for (var prop in Builder.prototype) {
                if (prop !== 'clone' && prop !== 'and') {
                    if (Builder.prototype.hasOwnProperty(prop) && types.isFunction(Builder.prototype[prop])) {
                        propertyFn(prop);
                    }
                }
            }
        }
        MultiBuilder.prototype.item = function (i) {
            return this.builders[i];
        };
        MultiBuilder.prototype.push = function () {
            var items = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                items[_i - 0] = arguments[_i];
            }
            for (var i = 0; i < items.length; i++) {
                this.builders.push(items[i]);
            }
            this.length = this.builders.length;
        };
        MultiBuilder.prototype.pop = function () {
            var element = this.builders.pop();
            this.length = this.builders.length;
            return element;
        };
        MultiBuilder.prototype.concat = function (items) {
            var elements = this.builders.concat(items);
            this.length = this.builders.length;
            return elements;
        };
        MultiBuilder.prototype.shift = function () {
            var element = this.builders.shift();
            this.length = this.builders.length;
            return element;
        };
        MultiBuilder.prototype.unshift = function (item) {
            var res = this.builders.unshift(item);
            this.length = this.builders.length;
            return res;
        };
        MultiBuilder.prototype.slice = function (start, end) {
            var elements = this.builders.slice(start, end);
            this.length = this.builders.length;
            return elements;
        };
        MultiBuilder.prototype.splice = function (start, deleteCount) {
            var elements = this.builders.splice(start, deleteCount);
            this.length = this.builders.length;
            return elements;
        };
        MultiBuilder.prototype.clone = function () {
            return new MultiBuilder(this);
        };
        MultiBuilder.prototype.and = function (obj) {
            // Convert HTMLElement to Builder as necessary
            if (!(obj instanceof Builder) && !(obj instanceof MultiBuilder)) {
                obj = new Builder(obj);
            }
            var builders = [];
            if (obj instanceof MultiBuilder) {
                for (var i = 0; i < obj.length; i++) {
                    builders.push(obj.item(i));
                }
            }
            else {
                builders.push(obj);
            }
            this.push.apply(this, builders);
            return this;
        };
        return MultiBuilder;
    }(Builder));
    exports.MultiBuilder = MultiBuilder;
    function withBuilder(builder, offdom) {
        if (builder instanceof MultiBuilder) {
            return new MultiBuilder(builder);
        }
        return new Builder(builder.getHTMLElement(), offdom);
    }
    function withElement(element, offdom) {
        return new Builder(element, offdom);
    }
    function offDOM() {
        return new Builder(null, true);
    }
    // Binding functions
    /**
     *  Allows to store arbritary data into element.
     */
    function setPropertyOnElement(element, key, value) {
        data(element)[key] = value;
    }
    exports.setPropertyOnElement = setPropertyOnElement;
    /**
     *  Allows to get arbritary data from element.
     */
    function getPropertyFromElement(element, key, fallback) {
        if (hasData(element)) {
            var value = data(element)[key];
            if (!types.isUndefined(value)) {
                return value;
            }
        }
        return fallback;
    }
    exports.getPropertyFromElement = getPropertyFromElement;
    /**
     *  Removes a property from an element.
     */
    function removePropertyFromElement(element, key) {
        if (hasData(element)) {
            delete data(element)[key];
        }
    }
    exports.removePropertyFromElement = removePropertyFromElement;
    /**
     *  Adds the provided object as property to the given element. Call getBinding()
     *  to retrieve it again.
     */
    function bindElement(element, object) {
        setPropertyOnElement(element, DATA_BINDING_ID, object);
    }
    exports.bindElement = bindElement;
    /**
     *  Removes the binding of the given element.
     */
    function unbindElement(element) {
        removePropertyFromElement(element, DATA_BINDING_ID);
    }
    exports.unbindElement = unbindElement;
    /**
     *  Returns the object that was passed into the bind() call for the element.
     */
    function getBindingFromElement(element) {
        return getPropertyFromElement(element, DATA_BINDING_ID);
    }
    exports.getBindingFromElement = getBindingFromElement;
    exports.Binding = {
        setPropertyOnElement: setPropertyOnElement,
        getPropertyFromElement: getPropertyFromElement,
        removePropertyFromElement: removePropertyFromElement,
        bindElement: bindElement,
        unbindElement: unbindElement,
        getBindingFromElement: getBindingFromElement
    };
    var SELECTOR_REGEX = /([\w\-]+)?(#([\w\-]+))?((.([\w\-]+))*)/;
    exports.$ = function (arg) {
        // Off-DOM use
        if (types.isUndefined(arg)) {
            return offDOM();
        }
        // Falsified values cause error otherwise
        if (!arg) {
            throw new Error('Bad use of $');
        }
        // Wrap the given element
        if (DOM.isHTMLElement(arg) || arg === window) {
            return withElement(arg);
        }
        // Wrap the given builders
        if (types.isArray(arg)) {
            return new MultiBuilder(arg);
        }
        // Wrap the given builder
        if (arg instanceof Builder) {
            return withBuilder(arg);
        }
        if (types.isString(arg)) {
            // Use the argument as HTML code
            if (arg[0] === '<') {
                var element = void 0;
                var container = BrowserService.getService().document.createElement('div');
                container.innerHTML = strings.format.apply(strings, arguments);
                if (container.children.length === 0) {
                    throw new Error('Bad use of $');
                }
                if (container.children.length === 1) {
                    element = container.firstChild;
                    container.removeChild(element);
                    return withElement(element);
                }
                var builders = [];
                while (container.firstChild) {
                    element = container.firstChild;
                    container.removeChild(element);
                    builders.push(withElement(element));
                }
                return new MultiBuilder(builders);
            }
            else if (arguments.length === 1) {
                var match = SELECTOR_REGEX.exec(arg);
                if (!match) {
                    throw new Error('Bad use of $');
                }
                var tag = match[1] || 'div';
                var id = match[3] || undefined;
                var classes = (match[4] || '').replace(/\./g, ' ');
                var props = {};
                if (id) {
                    props['id'] = id;
                }
                if (classes) {
                    props['class'] = classes;
                }
                return offDOM().element(tag, props);
            }
            else {
                var result = offDOM();
                result.element.apply(result, arguments);
                return result;
            }
        }
        else {
            throw new Error('Bad use of $');
        }
    };
    exports.$.Box = Box;
    exports.$.Dimension = Dimension;
    exports.$.Position = Position;
    exports.$.Builder = Builder;
    exports.$.MultiBuilder = MultiBuilder;
    exports.$.Build = exports.Build;
    exports.$.Binding = exports.Binding;
});
