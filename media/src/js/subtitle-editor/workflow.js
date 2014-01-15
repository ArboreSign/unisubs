// Amara, universalsubtitles.org
//
// Copyright (C) 2013 Participatory Culture Foundation
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

var angular = angular || null;

(function() {
    var module = angular.module('amara.SubtitleEditor.workflow', []);

    /*
     * App-level Workflow object
     */

    Workflow = function(subtitleList, translating, titleEdited) {
	this.translating = translating;
	this.titleEdited = titleEdited;
        var self = this;
        this.subtitleList = subtitleList;
        if(this.subtitleList.length() == 0) {
            this.stage = 'type';
        } else {
            this.stage = 'sync';
        }
        this.subtitleList.addChangeCallback(function() {
            if(self.stage == 'review' && !self.canMoveToReview()) {
                self.stage = 'sync';
            }
        });
    }

    Workflow.prototype = {
        switchStage: function(newStage) {
            if(newStage == 'review' && !this.canMoveToReview()) {
                return;
            }
	    if (newStage == 'title') {
		window.location.hash = 'set-title-modal';
		this.titleEdited(true);
	    }
            this.stage = newStage;
        },
        canMoveToTitle: function() {
	    if (this.translating())
		return (this.subtitleList.length() > 0 &&
			!this.subtitleList.needsAnyTranscribed() &&
			!this.subtitleList.needsAnySynced());
	    else return true;
        },
        canMoveToReview: function() {
	    if (this.translating())
		return (this.titleEdited());
	    else
		return (this.subtitleList.length() > 0 &&
			!this.subtitleList.needsAnyTranscribed() &&
			!this.subtitleList.needsAnySynced());
        },
        stageDone: function(stageName) {
            if(stageName == 'type') {
                return (this.stage == 'review' || this.stage == 'sync' || this.stage == 'title');
            } else if(stageName == 'sync') {
                return (this.stage == 'review' || this.stage == 'title');
            } else if(stageName == 'title') {
                return this.stage == 'review'
            } else {
                return false;
            }
        },
    }
    module.value('Workflow', Workflow);

    module.controller('WorkflowProgressionController', function($scope, EditorData, VideoPlayer) {

        function rewindPlayback() {
            VideoPlayer.pause();
            VideoPlayer.seek(0);
        }

        $scope.endorse = function() {
            if(EditorData.task_id === undefined || 
                    EditorData.task_id === null) {
                $scope.$root.$emit('save', {
                    allowResume: false,
                    markComplete: true,
                });
            } else {
                $scope.$root.$emit('approve-task');
            }
        }

        $scope.onNextClicked = function(evt) {
            if($scope.workflow.stage == 'type') {
                $scope.workflow.switchStage('sync');
                if(!$scope.timelineShown) {
                    $scope.toggleTimelineShown();
                }
                rewindPlayback();
            } else if ($scope.workflow.stage == 'title') {
                $scope.workflow.switchStage('review');
                rewindPlayback();
	    }
	    else if ($scope.workflow.stage == 'sync') {
		if ($scope.translating())
                    $scope.workflow.switchStage('title');
		else
                    $scope.workflow.switchStage('review');
                rewindPlayback();
            }
            evt.preventDefault();
        }
    });


})(this);
