# Amara, universalsubtitles.org
#
# Copyright (C) 2013 Participatory Culture Foundation
#
# This program is free software: you can redistribute it and/or modify it under
# the terms of the GNU Affero General Public License as published by the Free
# Software Foundation, either version 3 of the License, or (at your option) any
# later version.
#
# This program is distributed in the hope that it will be useful, but WITHOUT
# ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
# FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more
# details.
#
# You should have received a copy of the GNU Affero General Public License along
# with this program.  If not, see http://www.gnu.org/licenses/agpl-3.0.html.

from django.conf.urls import patterns, url, include
from rest_framework import routers

from api import views

router = routers.SimpleRouter()
router.register(r'videos', views.VideoViewSet)
router.register(r'videos/(?P<video_id>[\w\d]+)/languages',
                views.SubtitleLanguageViewSet, base_name='subtitle-language')

urlpatterns = router.urls + patterns('',
    url(r'^videos/(?P<video_id>[\w\d]+)'
        '/languages/(?P<language_code>[\w-]+)/subtitles/$',
        views.SubtitlesView.as_view(), name='subtitles'),
    url(r'^videos/(?P<video_id>[\w\d]+)'
        '/languages/(?P<language_code>[\w-]+)/subtitles/actions/$',
        views.Actions.as_view(), name='subtitle-actions'),
    url(r'^videos/(?P<video_id>[\w\d]+)'
        '/languages/(?P<language_code>[\w-]+)/subtitles/notes/$',
        views.NotesList.as_view()),
)
