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

(function() {

    var root = this;

    var TimelineController = function($scope, $timeout, SubtitleStorage, VideoPlayer) {
        // Controls the scale of the timeline, currently we just set this to
        // 1.0 and leave it.
        $scope.scale = 1.0;
        // Video time info.
        $scope.currentTime = $scope.duration = null;
        // Subtitle at currentTime, or null.
        $scope.subtitle = null;
        /* Subtitles that we will sync when the user hits the up/down arrows.
         *
         * Contains the following properties:
         *    start - subtitle whose startTime will be synced
         *    end - subtitle whose endTime will be synced
         */
        var willSync = { start: null, end: null};
        var lastTimeReturned = null;
        var lastTimeReturnedAt = null;
        var lastTime = null;

        // Handle animating the timeline.  We don't use the timeupdate event
        // from popcorn because it doesn't fire granularly enough.
        var timeoutPromise = null;
        function startTimer() {
            if(timeoutPromise === null) {
                var delay = 30; // aim for 30 FPS or so
                timeoutPromise = $timeout(handleTimeout, delay, false);
            }
        }

        function cancelTimer() {
            if(timeoutPromise !== null) {
                $timeout.cancel(timeoutPromise);
                timeoutPromise = null;
            }
        }

        function handleTimeout() {
            updateTimeline();
            timeoutPromise = null;
            startTimer();
        }

        function updateTime() {
            var newTime = VideoPlayer.currentTime();
            $scope.currentTime = newTime;
            // On the youtube player, popcorn only updates the time every 250
            // ms, which is not enough granularity for our animation.  Try to
            // get more granularity by starting a timer of our own.
            if(VideoPlayer.isPlaying() && lastTimeReturned === newTime) {
                var timePassed = Date.now() - lastTimeReturnedAt;
                // If lots of time has bassed since the last new time, it's
                // possible that the video is slowing down for some reason.
                // Don't adjust the time too much.
                timePassed = Math.min(timePassed, 250);
                $scope.currentTime = newTime + timePassed;
            }
            lastTimeReturned = newTime;
            lastTimeReturnedAt = Date.now();

            // If we adjust the time with the code above, then get a new time
            // from popcorn, it's possible that the time given will be less
            // that our adjusted time.  Try to fudge things a little so that
            // time doesn't go backwards while we're playing.
            if(lastTime !== null && $scope.currentTime < lastTime &&
                $scope.currentTime > lastTime - 250) {
                $scope.currentTime = lastTime;
            }
            lastTime = $scope.currentTime;
        }

        function updateWillSync() {
            if($scope.currentTime === null) {
                return;
            }
            var time = $scope.currentTime;
            var subtitleList = $scope.workingSubtitles.subtitleList;
            var nextIndex = subtitleList.indexOfFirstSubtitleAfter(time);
            if(nextIndex >= 0) {
                /* We are in the range of synced subtitles */
                var next = subtitleList.subtitles[nextIndex];
                willSync.start = next;
                if(next.isAt(time)) {
                    willSync.end = next;
                } else if(nextIndex > 0) {
                    willSync.end = subtitleList.subtitles[nextIndex-1];
                } else {
                    willSync.end = null;
                }
                return;
            }

            var firstUnsynced = subtitleList.firstUnsyncedSubtitle();
            if(firstUnsynced == null) {
                /* We are past the last synced subtitle, but there are no
                 * unsynced ones.
                 */
                willSync.start = null;
                willSync.end = subtitleList.lastSyncedSubtitle();
                return;
            }

            if(firstUnsynced.startTime < 0) {
                // The first unsynced subtitle needs a start time
                willSync.start = firstUnsynced;
                willSync.end = subtitleList.lastSyncedSubtitle();
            } else {
                // The first unsynced subtitle has a start time set.  If the
                // user syncs the start time, then we will set the start time
                // for the second unsynced subtitle.
                willSync.end = firstUnsynced;
                var nextUnsynced = subtitleList.secondUnsyncedSubtitle();
                if(nextUnsynced == null) {
                    willSync.start = null;
                } else {
                    willSync.start = nextUnsynced;
                }
            }
        }

        function updateTimeline() {
            updateTime();
            updateWillSync();
            $scope.redrawCanvas();
            $scope.redrawSubtitles();
        }

        $scope.$root.$on('video-update', function() {
            $scope.duration = VideoPlayer.duration();
            updateTimeline();
            if(VideoPlayer.isPlaying()) {
                startTimer();
            } else {
                cancelTimer();
            }
        });

        // Update the timeline subtitles when the underlying data changes.
        $scope.$root.$on('work-done', function() {
            $scope.redrawSubtitles({forcePlace: true});
        });
        $scope.$root.$on('subtitles-fetched', function() {
            $scope.redrawSubtitles({forcePlace: true});
        });

        $scope.$root.$on('sync-next-start-time', function($event) {
            var subtitleList = $scope.workingSubtitles.subtitleList;
            if(willSync.start === null) {
                if(!willSync.end.isSynced()) {
                    /* Special case: the user hit the down arrow when only 1
                     * subtitle was left and it had a start time set.  In this
                     * case, set the end time for that subtile
                     */
                    subtitleList.updateSubtitleTime(willSync.end,
                        willSync.end.startTime, $scope.currentTime);
                    $scope.$root.$emit("work-done");
                }
                return;
            }
            subtitleList.updateSubtitleTime(willSync.start,
                $scope.currentTime, willSync.start.endTime);

            /* Check to see if we're setting the start time for the second
             * unsynced subtitle.  In this case, we should also set the end
             * time for the first.
             */

            var prev = subtitleList.prevSubtitle(willSync.start);
            if(prev !== null && !prev.isSynced()) {
                subtitleList.updateSubtitleTime(prev, prev.startTime,
                    $scope.currentTime);
            }
            $scope.$root.$emit("work-done");
        });
        $scope.$root.$on('sync-next-end-time', function($event) {
            var subtitleList = $scope.workingSubtitles.subtitleList;
            if(willSync.end === null) {
                return;
            }
            subtitleList.updateSubtitleTime(willSync.end,
                willSync.end.startTime, $scope.currentTime);
            $scope.$root.$emit("work-done");
        });
    };

    root.TimelineController = TimelineController;

}).call(this);
