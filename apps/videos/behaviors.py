# Amara, universalsubtitles.org
#
# Copyright (C) 2013 Participatory Culture Foundation
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see
# http://www.gnu.org/licenses/agpl-3.0.html.

from collections import namedtuple

from utils.behaviors import behavior

@behavior
def get_video_subtitle(video, metadata):
    return metadata.get('speaker-name')

VideoPageCustomization = namedtuple('VideoPageCustomization',
                                    'sidebar_extra header')
@behavior
def video_page_customize(request, video):
    """Customize the video page.

    Note: this is already overridden by the team.workflows package.  If you
    want to override the page by team, then check out the TeamWorkflow class.
    """
    return VideoPageCustomization(None, None)

class SubtitlesPageCustomization(object):
    """
    Base class for customizing the subtitles page.

    To customize the subtitles page, create a subclass of this then make sure
    it gets returned from the subtitles_page_customize() behavior.
    subtitles_page_customize() is already overridden by the team.workflows
    package.  The simplest way to customize the page is probably using the
    TeamWorkflow class.

    Attrs:
        steps: list of SubtitlesStep objects to display in the top-right
            section
        action_button: Button object to display underneath the steps
        header: HTML to display in the header
    """
    def __init__(self):
        self.steps = None
        self.action_button = None
        self.header = None

@behavior
def subtitles_page_customize(request, video, subtitle_language):
    """Customize the subtitles page.

    """
    return SubtitlesPageCustomization()

class SubtitlesStep(object):
    """Represents an item on the subtitle steps list

    These are displayed on the top-right of the subtitles page.  By default,
    we don't display anything.  They are used in more complex workflows like
    the collab model.  To set this up, override the subtitles_page_customize()
    function which can be done from the TeamWorkflow class.

    Attrs:
        label: text that describes the step (Subtitle, Review, Approve, etc).
        status: text that describes the progress on the step (In progress,
           Complete, etc).
        icon: icon that represents the step
        user: user icon to display in the step.  If present, the avatar for
            this user is displayed instead of the icon.
        team: team icon to display in the step.  If present, the avatar for
            this team is displayed instead of the icon.
        current: Is this step currently in-progress?
    """
    def __init__(self, label, status, icon=None, user=None, team=None,
                 current=False):
        self.label = label
        self.status = status
        self.icon = icon
        self.user = user
        self.team = team
        self.current = current

Button = namedtuple('Button', 'url label')
