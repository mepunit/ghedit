define(["require", "exports"], function (require, exports) {
    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    'use strict';
    var __space = ' '.charCodeAt(0);
    var __tab = '\t'.charCodeAt(0);
    /**
     * Compute the diff in spaces between two line's indentation.
     */
    function spacesDiff(a, aLength, b, bLength) {
        // This can go both ways (e.g.):
        //  - a: "\t"
        //  - b: "\t    "
        //  => This should count 1 tab and 4 spaces
        var i;
        for (i = 0; i < aLength && i < bLength; i++) {
            var aCharCode = a.charCodeAt(i);
            var bCharCode = b.charCodeAt(i);
            if (aCharCode !== bCharCode) {
                break;
            }
        }
        var aSpacesCnt = 0, aTabsCount = 0;
        for (var j = i; j < aLength; j++) {
            var aCharCode = a.charCodeAt(j);
            if (aCharCode === __space) {
                aSpacesCnt++;
            }
            else {
                aTabsCount++;
            }
        }
        var bSpacesCnt = 0, bTabsCount = 0;
        for (var j = i; j < bLength; j++) {
            var bCharCode = b.charCodeAt(j);
            if (bCharCode === __space) {
                bSpacesCnt++;
            }
            else {
                bTabsCount++;
            }
        }
        if (aSpacesCnt > 0 && aTabsCount > 0) {
            return 0;
        }
        if (bSpacesCnt > 0 && bTabsCount > 0) {
            return 0;
        }
        var tabsDiff = Math.abs(aTabsCount - bTabsCount);
        var spacesDiff = Math.abs(aSpacesCnt - bSpacesCnt);
        if (tabsDiff === 0) {
            return spacesDiff;
        }
        if (spacesDiff % tabsDiff === 0) {
            return spacesDiff / tabsDiff;
        }
        return 0;
    }
    function guessIndentation(lines, defaultTabSize, defaultInsertSpaces) {
        var linesIndentedWithTabsCount = 0; // number of lines that contain at least one tab in indentation
        var linesIndentedWithSpacesCount = 0; // number of lines that contain only spaces in indentation
        var previousLineText = ''; // content of latest line that contained non-whitespace chars
        var previousLineIndentation = 0; // index at which latest line contained the first non-whitespace char
        var ALLOWED_TAB_SIZE_GUESSES = [2, 4, 6, 8]; // limit guesses for `tabSize` to 2, 4, 6 or 8.
        var MAX_ALLOWED_TAB_SIZE_GUESS = 8; // max(2,4,6,8) = 8
        var spacesDiffCount = [0, 0, 0, 0, 0, 0, 0, 0, 0]; // `tabSize` scores
        for (var i = 0, len = lines.length; i < len; i++) {
            var currentLineText = lines[i];
            var currentLineHasContent = false; // does `currentLineText` contain non-whitespace chars
            var currentLineIndentation = 0; // index at which `currentLineText` contains the first non-whitespace char
            var currentLineSpacesCount = 0; // count of spaces found in `currentLineText` indentation
            var currentLineTabsCount = 0; // count of tabs found in `currentLineText` indentation
            for (var j = 0, lenJ = currentLineText.length; j < lenJ; j++) {
                var charCode = currentLineText.charCodeAt(j);
                if (charCode === __tab) {
                    currentLineTabsCount++;
                }
                else if (charCode === __space) {
                    currentLineSpacesCount++;
                }
                else {
                    // Hit non whitespace character on this line
                    currentLineHasContent = true;
                    currentLineIndentation = j;
                    break;
                }
            }
            // Ignore empty or only whitespace lines
            if (!currentLineHasContent) {
                continue;
            }
            if (currentLineTabsCount > 0) {
                linesIndentedWithTabsCount++;
            }
            else if (currentLineSpacesCount > 1) {
                linesIndentedWithSpacesCount++;
            }
            var currentSpacesDiff = spacesDiff(previousLineText, previousLineIndentation, currentLineText, currentLineIndentation);
            if (currentSpacesDiff <= MAX_ALLOWED_TAB_SIZE_GUESS) {
                spacesDiffCount[currentSpacesDiff]++;
            }
            previousLineText = currentLineText;
            previousLineIndentation = currentLineIndentation;
        }
        // Take into account the last line as well
        var deltaSpacesCount = spacesDiff(previousLineText, previousLineIndentation, '', 0);
        if (deltaSpacesCount <= MAX_ALLOWED_TAB_SIZE_GUESS) {
            spacesDiffCount[deltaSpacesCount]++;
        }
        var insertSpaces = defaultInsertSpaces;
        if (linesIndentedWithTabsCount !== linesIndentedWithSpacesCount) {
            insertSpaces = (linesIndentedWithTabsCount < linesIndentedWithSpacesCount);
        }
        var tabSize = defaultTabSize;
        var tabSizeScore = (insertSpaces ? 0 : 0.1 * lines.length);
        // console.log("score threshold: " + tabSizeScore);
        ALLOWED_TAB_SIZE_GUESSES.forEach(function (possibleTabSize) {
            var possibleTabSizeScore = spacesDiffCount[possibleTabSize];
            if (possibleTabSizeScore > tabSizeScore) {
                tabSizeScore = possibleTabSizeScore;
                tabSize = possibleTabSize;
            }
        });
        // console.log('--------------------------');
        // console.log('linesIndentedWithTabsCount: ' + linesIndentedWithTabsCount + ', linesIndentedWithSpacesCount: ' + linesIndentedWithSpacesCount);
        // console.log('spacesDiffCount: ' + spacesDiffCount);
        // console.log('tabSize: ' + tabSize + ', tabSizeScore: ' + tabSizeScore);
        return {
            insertSpaces: insertSpaces,
            tabSize: tabSize
        };
    }
    exports.guessIndentation = guessIndentation;
});
