# Amara, universalsubtitles.org
#
# Copyright (C) 2016 Participatory Culture Foundation
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

from contextlib import contextmanager
from django.test import TestCase
from nose.tools import *
from requests.exceptions import ConnectionError, Timeout, TooManyRedirects
import json
import mock

from notifications import handlers
from notifications.models import TeamNotificationSettings, TeamNotification
from subtitles import pipeline
from teams.models import TeamMember
from utils import dates
from utils.factories import *
from utils.test_utils import *
import subtitles.signals
import videos.signals

class TestNotificationHandlerLookup(TestCase):
    # Test that we lookup the correct NotificationHandler and call the correct
    # method on various events
    def setUp(self):
        self.user = UserFactory()
        self.team = TeamFactory(admin=self.user)
        self.url = 'http://example.com'

    @contextmanager
    def patch_handler_lookup(self):
        mock_settings = mock.Mock(
            team=self.team,
            type='unittest',
            url='http://example.com/unittests')
        mock_handler_class = mock.Mock()
        patcher = mock.patch(
            'notifications.models.TeamNotificationSettings.lookup')
        handlers._registry['unittest'] = mock_handler_class
        with patcher as lookup:
            lookup.return_value = mock_settings
            # We yield the mock handler instance.  This is what gets bound to
            # the as clause
            yield mock_handler_class.return_value
        # check that the handler gets instantiated with the correct arguments
        assert_true(mock_handler_class.called)
        assert_equal(mock_handler_class.call_args, mock.call(mock_settings))
        del handlers._registry['unittest']

    def test_on_video_added(self):
        with self.patch_handler_lookup() as mock_handler:
            video = VideoFactory(team=self.team)
        assert_equal(mock_handler.on_video_added.call_args,
                     mock.call(video, None))

    def test_on_video_added_from_other_team(self):
        other_team = TeamFactory()
        team_video = TeamVideoFactory(team=other_team)
        with self.patch_handler_lookup() as mock_handler:
            team_video.move_to(self.team)
        assert_equal(mock_handler.on_video_added.call_args,
                     mock.call(team_video.video, other_team))

    def test_on_video_removed(self):
        tv = TeamVideoFactory(team=self.team)
        with self.patch_handler_lookup() as mock_handler:
            tv.remove(self.user)
        assert_equal(mock_handler.on_video_removed.call_args,
                     mock.call(tv.video, None))

    def test_on_video_moved_to_other_team(self):
        other_team = TeamFactory()
        tv = TeamVideoFactory(team=self.team)
        with self.patch_handler_lookup() as mock_handler:
            tv.move_to(other_team)
        assert_equal(mock_handler.on_video_removed.call_args,
                     mock.call(tv.video, other_team))

    def test_on_subtitle_version_added(self):
        video = VideoFactory(team=self.team)
        with self.patch_handler_lookup() as mock_handler:
            version = pipeline.add_subtitles(video, 'en', SubtitleSetFactory())
        assert_equal(mock_handler.on_subtitles_added.call_args,
                     mock.call(video, version))

    def test_on_subtitles_published(self):
        video = VideoFactory(team=self.team)
        version = pipeline.add_subtitles(video, 'en', SubtitleSetFactory(),
                                         action='save-draft')
        with self.patch_handler_lookup() as mock_handler:
            workflow = video.get_workflow()
            workflow.perform_action(self.user, 'en', 'publish')
        assert_equal(mock_handler.on_subtitles_published.call_args,
                     mock.call(video, version.subtitle_language))

    def test_on_subtitles_deleted(self):
        video = VideoFactory(team=self.team)
        version = pipeline.add_subtitles(video, 'en', SubtitleSetFactory(),
                                         action='save-draft')
        with self.patch_handler_lookup() as mock_handler:
            version.subtitle_language.nuke_language()
        assert_equal(mock_handler.on_subtitles_deleted.call_args,
                     mock.call(video, version.subtitle_language))

    def test_on_user_added(self):
        with self.patch_handler_lookup() as mock_handler:
            member = TeamMemberFactory(team=self.team)
        assert_equal(mock_handler.on_user_added.call_args,
                     mock.call(member.user))

    def test_on_user_removed(self):
        member = TeamMemberFactory(team=self.team)
        with self.patch_handler_lookup() as mock_handler:
            member.delete()
        assert_equal(mock_handler.on_user_removed.call_args,
                     mock.call(member.user))

    def test_on_user_info_updated(self):
        member = TeamMemberFactory(team=self.team)
        with self.patch_handler_lookup() as mock_handler:
            member.user.first_name = 'new'
            member.user.last_name = 'name'
            member.user.save()
        assert_equal(mock_handler.on_user_info_updated.call_args,
                     mock.call(member.user))

    def test_exception_in_handler(self):
        with self.patch_handler_lookup() as mock_handler:
            mock_handler.on_video_added.side_effect = ValueError()
            # Cause on_video_added to be called.  It should throw an
            # exception, but the exception should be delt and not bubble out
            video = VideoFactory(team=self.team)
        assert_true(mock_handler.on_video_added.called)

class TestNotificationNumbers(TestCase):
    def test_notification_number(TestCase):
        # test setting the number field
        team = TeamFactory()
        def make_notification():
            return TeamNotification.objects.create(team=team,
                                                   url='http://example.com',
                                                   data='123')
        assert_equal(make_notification().number, 1)
        assert_equal(make_notification().number, 2)
        assert_equal(make_notification().number, 3)

    def test_notification_number_collision(self):
        # Simulate a potential race condition where we create notifications in
        # different threads.  We should still get unique, increasing,
        # notification numbers and not get Integrity Errors
        team = TeamFactory()
        notification1 = TeamNotification.objects.create(
            team=team, url='http://example.com', data='123')
        notification2 = TeamNotification.objects.create(
            team=team, url='http://example.com', data='123')
        notification1.set_number()
        notification2.set_number()
        notification1.save()
        # If we aren't careful, this next save will cause an IntegrityError
        notification2.save()
        assert_equal(notification2.number, notification1.number + 1)

class TestSendNotification(TestCase):
    def test_send_notification(self):
        team = TeamFactory()
        settings = TeamNotificationSettings(team=team,
                                            type='mock-type',
                                            url='http://example.com/')
        handler = handlers.NotificationHandlerBase(settings)
        data = {'foo': 'bar'}
        handler.send_notification(data)
        # Note: do_http_post gets replaced with a mock function for the
        # unittests
        assert_equal(handlers.do_http_post.delay.call_args,
                     mock.call(team.id, settings.url, data))

class TestDoHTTPPost(TestCase):
    def setUp(self):
        self.team = TeamFactory()
        self.data = {'foo': 'bar'}
        self.url = 'http://example.com/notifications/'
        handlers.do_http_post.run_original_for_test()
        self.now = dates.now.freeze()

    def check_notification(self, status_code, error_message=None):
        notification = TeamNotification.objects.get(team=self.team)
        assert_equal(notification.team, self.team)
        assert_equal(notification.url, self.url)
        assert_equal(notification.data, json.dumps(self.data))
        assert_equal(notification.timestamp, self.now)
        assert_equal(notification.response_status, status_code)
        assert_equal(notification.error_message, error_message)

    def calc_post_data(self):
        post_data = self.data.copy()
        post_data['number'] = TeamNotification.next_number_for_team(self.team)
        return json.dumps(post_data)

    def test_http_request(self):
        mocker = RequestsMocker()
        mocker.expect_request(
            'post', self.url, data=self.calc_post_data(),
            headers={'Content-type': 'application/json'},
        )
        with mocker:
            handlers.do_http_post(self.team.id, self.url, self.data)
        self.check_notification(200)

    def test_status_code_error(self):
        mocker = RequestsMocker()
        mocker.expect_request(
            'post', self.url, data=self.calc_post_data(),
            headers={'Content-type': 'application/json'},
            status_code=500,
        )
        with mocker:
            handlers.do_http_post(self.team.id, self.url, self.data)
        self.check_notification(500, "Response status: 500")

    def test_network_errors(self):
        self.check_network_error(ConnectionError(), 'Connection error')
        self.check_network_error(Timeout(), 'Request timeout')
        self.check_network_error(TooManyRedirects(), 'Too many redirects')

    def check_network_error(self, exception, error_message):
        mocker = RequestsMocker()
        mocker.expect_request(
            'post', self.url, data=self.calc_post_data(),
            headers={'Content-type': 'application/json'},
            error=exception,
        )
        with mocker:
            handlers.do_http_post(self.team.id, self.url, self.data)
        self.check_notification(None, error_message)
        TeamNotification.objects.all().delete()
