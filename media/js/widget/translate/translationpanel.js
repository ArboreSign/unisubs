// Universal Subtitles, universalsubtitles.org
//
// Copyright (C) 2010 Participatory Culture Foundation
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see
// http://www.gnu.org/licenses/agpl-3.0.html.

goog.provide('unisubs.translate.TranslationPanel');

// FIXME: I think that since the latest translation changes, this class no 
//     longer really does anything. Probably just go straight to TranslationList
//     instead of using this as an intermediary.

/**
 *
 *
 * @constructor
 * @param {unisubs.subtitle.EditableCaptionSet} captionSet
 * @param {unisubs.subtitle.SubtitleState} standardSubState
 */
unisubs.translate.TranslationPanel = function(captionSet,
                                               standardSubState, dialog) {
    this.captionSet_ = captionSet
    this.standardSubState_ = standardSubState;
    goog.ui.Component.call(this);
    this.contentElem_ = null;
    this.dialog_ = dialog;
};
goog.inherits(unisubs.translate.TranslationPanel, goog.ui.Component);

unisubs.translate.TranslationPanel.prototype.getContentElement = function() {
    return this.contentElem_;
};
unisubs.translate.TranslationPanel.prototype.createDom = function() {
    unisubs.translate.TranslationPanel.superClass_.createDom.call(this);
    var el = this.getElement();
    var $d = goog.bind(this.getDomHelper().createDom, this.getDomHelper());

    el.appendChild(this.contentElem_ = $d('div'));
    this.translationList_ =
        new unisubs.translate.TranslationList(
            this.captionSet_,
            this.standardSubState_.SUBTITLES,
            this.standardSubState_.TITLE);
    this.addChild(this.translationList_, true);
    this.translationList_.getElement().className =
        "unisubs-titlesList";
};
unisubs.translate.TranslationPanel.prototype.getTranslationList = function(){
    return this.translationList_;
};
unisubs.translate.TranslationPanel.prototype.getRightPanel =
    function(serverModel)
{
    if (!this.rightPanel_) {
        this.rightPanel_ = this.createRightPanel_();
        //this.listenToRightPanel_();
    }
    return this.rightPanel_;
};

unisubs.translate.TranslationPanel.prototype.createRightPanel_ = function(){
    var title = this.captionSet_.VERSION > 0 ? 
        "Editing Translation" : "Adding a New Translation";
    var helpContents = new unisubs.RightPanel.HelpContents(
        title,
        [["Thanks for volunteering to translate! Your translation will be available to ",
"everyone  watching the video in our widget."].join(''),
         ["Please translate each line, one by one, in the white  ", 
          "space below each line."].join(''),
         ["If you need to rearrange the order of words or split a phrase ",
          "differently, that's okay."].join(''),
         ["As you're translating, you can use the \"TAB\" key to advance to ",
          "the next line, and \"Shift-TAB\" to go back."].join('')
        ], 2, 0);
    var extraHelp = [
        ["Google Translate", "http://translate.google.com/"],
        ["List of dictionaries", "http://yourdictionary.com/languages.html"],
        ["Firefox spellcheck dictionaries", 
         "https://addons.mozilla.org/en-US/firefox/browse/type:3"]
    ];
    return new unisubs.translate.TranslationRightPanel(
        this.dialog_,
        this.serverModel_, helpContents, extraHelp, [], false, "Done?", 
        "Next step: Title & Description", "Resources for Translators");

}
