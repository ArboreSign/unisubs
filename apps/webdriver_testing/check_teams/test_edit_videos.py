#!/usr/bin/python
# -*- coding: utf-8 -*-
import time
import os
import filecmp

from videos import metadata_manager
from videos.models import Video
from webdriver_testing.webdriver_base import WebdriverTestCase
from webdriver_testing.pages.site_pages.teams import videos_tab
from webdriver_testing.pages.site_pages.teams.tasks_tab import TasksTab
from webdriver_testing.pages.site_pages import watch_page
from webdriver_testing.data_factories import TeamMemberFactory
from webdriver_testing.data_factories import TeamProjectFactory
from webdriver_testing.data_factories import TeamVideoFactory
from webdriver_testing.data_factories import VideoUrlFactory
from webdriver_testing.data_factories import UserFactory
from webdriver_testing import data_helpers
from testhelpers.views import _create_videos

from django.core import management


class TestCaseEdit(WebdriverTestCase):    
    NEW_BROWSER_PER_TEST_CASE = False

    @classmethod
    def setUpClass(cls):
        super(TestCaseEdit, cls).setUpClass()

        cls.data_utils = data_helpers.DataHelpers()
        cls.logger.info("Create team and add 1 video")

        cls.team_owner = UserFactory.create()
        cls.team = TeamMemberFactory.create(
            user = cls.team_owner).team
        
        cls.admin_user = TeamMemberFactory(role="ROLE_ADMIN",
            team = cls.team,
            user = UserFactory(username = 'TeamAdmin')).user
        cls.videos_tab = videos_tab.VideosTab(cls)
        data = {'url': 'http://www.youtube.com/watch?v=WqJineyEszo',
                'video__title': ('X Factor Audition - Stop Looking At My '
                                'Mom Rap - Brian Bradley'),
                'type': 'Y'
               }
        cls.test_video = cls.data_utils.create_video(**data)
        cls.data_utils.add_subs(video=cls.test_video)
        TeamVideoFactory.create(
            team=cls.team, 
            video=cls.test_video, 
            added_by=cls.admin_user)
        management.call_command('update_index', interactive=False)
        cls.videos_tab.open_videos_tab(cls.team.slug)


    def test_add_new(self):
        """Submit a new video for the team.

        """
        test_url = 'http://www.youtube.com/watch?v=i_0DXxNeaQ0'
        self.videos_tab.log_in(self.team_owner.username, 'password')
        self.videos_tab.open_videos_tab(self.team.slug)
        self.videos_tab.add_video(url=test_url)
        self.videos_tab.open_videos_tab(self.team.slug)
        video, _ = Video.get_or_create_for_url(test_url)
        self.assertTrue(self.videos_tab.video_present(video.title))


    def test_add_duplicate(self):
        """Submit a video that is already in amara.

        """
        dup_url = 'http://www.youtube.com/watch?v=WqJineyEszo'
        self.videos_tab.log_in(self.team_owner.username, 'password')
        self.videos_tab.open_videos_tab(self.team.slug)
        self.videos_tab.add_video(dup_url)
        self.assertEqual(self.videos_tab.error_message(), 
            'This video already belongs to a team.')


    def test_add_team_duplicate(self):
        """Duplicate videos are not added again.

        """
        dup_url = 'http://www.youtube.com/watch?v=WqJineyEszo'

        #Create a second team.
        team2 = TeamMemberFactory.create(
            user = self.admin_user).team
        #Open the new team and try to submit the video 
        self.videos_tab.log_in(self.admin_user.username, 'password')
        self.videos_tab.open_videos_tab(team2.slug)
        self.videos_tab.add_video(dup_url)
        self.assertEqual(self.videos_tab.error_message(), 
                         'This video already belongs to a team.')

    def test_remove_site(self):
        """Remove video from team and site, total destruction!

        Must be the team owner to get the team vs. site dialog.
        """
        self.videos_tab.log_in(self.team_owner.username, 'password')
        #Create a team video for removal.
        tv = VideoUrlFactory(video__title = 'total destruction').video
        TeamVideoFactory.create(
            team=self.team, 
            video = tv,
            added_by=self.admin_user)
        management.call_command('update_index', interactive=False)

        #Search for the video in team videos and remove it.
        self.videos_tab.open_videos_tab(self.team.slug)
        self.videos_tab.search(tv.title)
        self.videos_tab.remove_video(video = tv.title, 
            removal_action='total-destruction')

        #Verify video no longer in teams
        self.videos_tab.search(tv.title)
        self.assertEqual(self.videos_tab.NO_VIDEOS_TEXT, 
                         self.videos_tab.search_no_result())
        self.videos_tab.open_videos_tab(self.team.slug)

        #Verify video no longer on site
        watch_pg = watch_page.WatchPage(self)
        watch_pg.open_watch_page()
        self.logger.info('searching for the test video %s' % tv.title)
        results_pg = watch_pg.basic_search(tv.title)

        self.assertTrue(results_pg.search_has_no_results())


    def test_remove_team_only(self):
        """Remove video from team but NOT site.

        Must be the team owner to get the team vs. site dialog.
        """

        self.videos_tab.log_in(self.team_owner.username, 'password')

        tv = VideoUrlFactory(video__title = 'team only annihilation').video
        TeamVideoFactory.create(
            team=self.team, 
            video = tv,
            added_by=self.admin_user)
        management.call_command('update_index', interactive=False)

        #Search for the video in team videos and remove it.
        self.videos_tab.open_videos_tab(self.team.slug)
        self.videos_tab.search(tv.title)
        self.videos_tab.remove_video(video = tv.title, 
            removal_action='team-removal')
        time.sleep(2)
        #Update the solr index
        management.call_command('update_index', interactive=False)

        #Verify video no longer in teams
        self.assertEqual(tv.get_team_video(), None)

        self.videos_tab.search(tv.title)
        self.assertEqual(self.videos_tab.NO_VIDEOS_TEXT, 
        self.videos_tab.search_no_result())

        #Verify video is present on the site
        watch_pg = watch_page.WatchPage(self)
        watch_pg.open_watch_page()
        results_pg = watch_pg.basic_search(tv.title)
        self.assertTrue(results_pg.search_has_results())


    def test_edit_thumbnail(self):
        """Upload a new thumbnail.

        """
        video_title = 'qs1-not-transback' 
        videos = self.data_utils.create_several_team_videos_with_subs(
            self.team, 
            self.admin_user)
        management.call_command('update_index', interactive=False)


        self.videos_tab.log_in(self.team_owner.username, 'password')
        self.videos_tab.open_videos_tab(self.team.slug)
        self.videos_tab.search(video_title)
        new_thumb = os.path.join(os.getcwd(), 'media', 'images', 'seal.png')
        self.videos_tab.edit_video(video=video_title, thumb=new_thumb)
        site_thumb = os.path.join(os.getcwd(), 
                                     'user-data', 
                                     self.videos_tab.new_thumb_location())
        self.assertTrue(filecmp.cmp(new_thumb, site_thumb))
  
 
    def test_edit_change_team(self):
        """Edit a video, changing it from 1 team to another.

        """
        video_title = 'qs1-not-transback'
        team2 = TeamMemberFactory.create(
            user = self.team_owner).team
        videos = self.data_utils.create_several_team_videos_with_subs(
            self.team, 
            self.admin_user)
        management.call_command('update_index', interactive=False)

        self.videos_tab.log_in(self.team_owner.username, 'password')
        self.videos_tab.open_videos_tab(self.team.slug)
        self.videos_tab.search(video_title)
        self.videos_tab.edit_video(
            video=video_title,
            team = team2.name, 
            )
        
        management.call_command('update_index', interactive=False)
        self.videos_tab.open_videos_tab(team2.slug)
        self.assertTrue(self.videos_tab.video_present(video_title))


    def test_bulk_move_tedx(self):
        """Move videos with primary audio set and 0 subtitles.

        """
  
        team2 = TeamMemberFactory.create(user=self.admin_user,
                                         team__name="TEDx Import",
                                         team__slug="tedxtalks-import").team
        audio_codes = ['en', 'fr', 'de', 'hu', 'en']
        for lc in audio_codes:
            vid_data = {'video__primary_audio_language_code': lc }
            v = self.data_utils.create_video(**vid_data)
            tv = TeamVideoFactory(team=team2, 
                                  added_by=self.admin_user, 
                                  video=v)
            self.logger.info(v.primary_audio_language_code)
            metadata_manager.update_metadata(tv.video.pk)
        management.call_command('update_index', interactive=False)
        management.call_command('index_team_videos', team2.slug)
        self.videos_tab.log_in(self.admin_user.username, 'password')
        self.videos_tab.open_videos_tab(team2.slug)
        self.videos_tab.open_bulk_move()
        self.videos_tab.primary_audio_filter(setting='set')
        self.videos_tab.sub_lang_filter("any", has=False)
        self.videos_tab.update_filters()

        vid = self.videos_tab.first_video_listed()
        self.logger.info(vid)
        self.videos_tab.bulk_select()
        self.videos_tab.bulk_team(self.team.name)
        self.videos_tab.submit_bulk_move()

        management.call_command('update_index', interactive=False)
        self.videos_tab.open_videos_tab(self.team.slug)
        self.assertTrue(self.videos_tab.video_present(vid))


    def test_bulk_move_project(self):
        """Move videos to same team different project.

        """

        team2 = TeamMemberFactory.create(user=self.admin_user).team
        proj1 = TeamProjectFactory.create(team=team2)

        audio_codes = ['en', 'fr', 'de', 'hu', 'en']
        for lc in audio_codes:
            vid_data = {'video__primary_audio_language_code': lc }
            v = self.data_utils.create_video(**vid_data)
            tv = TeamVideoFactory(team=self.team, 
                                  added_by=self.admin_user, 
                                  video=v)
        management.call_command('update_index', interactive=False)
        self.videos_tab.log_in(self.admin_user.username, 'password')
        self.videos_tab.open_videos_tab(self.team.slug)
        self.videos_tab.open_bulk_move()

        vid = self.videos_tab.first_video_listed()
        self.videos_tab.bulk_select()
        self.videos_tab.bulk_team(team2.name)
        self.videos_tab.bulk_project(proj1.name)
        self.videos_tab.submit_bulk_move()

        management.call_command('update_index', interactive=False)
        self.videos_tab.open_videos_tab(team2.slug)

        self.videos_tab.project_filter(proj1.name)
        self.videos_tab.update_filters()
        self.assertTrue(self.videos_tab.video_present(vid))
