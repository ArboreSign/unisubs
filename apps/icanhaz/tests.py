#from django.utils import unittest
import json
from django.test import TestCase
from django.core.urlresolvers import reverse

from teams.models import Team, TeamMember, TeamVideo
from teams.search_indexes import TeamVideoLanguagesIndex
from auth.models import CustomUser as User
from videos.models import Video
from videos.search_indexes import VideoIndex
from apps.icanhaz.models import VideoVisibilityPolicy

# FIXME move the reset solr to a common test util packages
from apps.teams.tests.teamstestsutils import reset_solr



class BasicDataTest(TestCase):
    fixtures = [  "staging_users.json", "staging_videos.json", "staging_teams.json"]

    def setUp(self):
        self.superuser , created = User.objects.get_or_create(username='superuser1', is_superuser=True)

        self.user1 = User.objects.all()[0]
        self.user2 = User.objects.all()[1]
        self.superuser2, x = User.objects.get_or_create(username='superuser2', is_superuser=True)
        self.regular_user = User.objects.filter(is_active=True,is_superuser=False).exclude(pk__in=[x.pk for x in [self.user1, self.user2]])[0]

        self.team1 = Team(name='test11', slug='test11')
        self.team1.save()
        self.team1_member = TeamMember(team=self.team1, user=self.user1)
        self.team1_member.save()
        self.team2 = Team(name='test22', slug='test22')
        self.team2.save()
        self.team2_member = TeamMember(team=self.team2, user=self.user2)
        self.team2_member.save()
        self.video = Video.objects.all()[0]

        for user in User.objects.all():
            user.set_password(user.username)
            user.save()

class BusinessLogic(BasicDataTest):

    def test_has_owner(self):
        self.assertFalse(VideoVisibilityPolicy.objects.video_has_owner(self.video))
        VideoVisibilityPolicy.objects.create_for_video(
            self.video,
            VideoVisibilityPolicy.SITE_VISIBILITY_PUBLIC,
            self.superuser,

            )
        self.assertTrue(VideoVisibilityPolicy.objects.video_has_owner(self.video))

    def test_belongs_to_team(self):
        policy = VideoVisibilityPolicy.objects.create_for_video(
            self.video,
            VideoVisibilityPolicy.SITE_VISIBILITY_PUBLIC,
            self.superuser
        )

        #policy = VideoVisibilityPolicy.objects.create_for_video(self.video, self.superuser, )
        self.assertFalse(policy.belongs_to_team)
        policy.delete()

        policy = VideoVisibilityPolicy.objects.create_for_video(
            self.video,
            VideoVisibilityPolicy.SITE_VISIBILITY_PUBLIC,
            self.team1)
        self.assertTrue(policy.belongs_to_team)

    def test_create_one_only_per_video(self):
        VideoVisibilityPolicy.objects.create_for_video(
            self.video,
            VideoVisibilityPolicy.SITE_VISIBILITY_PUBLIC,
            owner = self.superuser
        )
        with self.assertRaises(Exception):
            VideoVisibilityPolicy.objects.create_for_video(
                self.video,
                VideoVisibilityPolicy.SITE_VISIBILITY_PUBLIC,
                self.team1,
            )
        with self.assertRaises(Exception):
            VideoVisibilityPolicy.objects.create_for_video(
                self.video,
                VideoVisibilityPolicy.SITE_VISIBILITY_PUBLIC,
                self.superuser,
                )

    def test_user_can_see_user(self):
        # video with no policy should be visible to all
        self.assertTrue(VideoVisibilityPolicy.objects.user_can_see( self.regular_user, self.video))
        policy = VideoVisibilityPolicy.objects.create_for_video(
            self.video,
            VideoVisibilityPolicy.SITE_VISIBILITY_PRIVATE_OWNER,
            self.superuser,
        )
        # super users should always be able to see them
        self.assertTrue(VideoVisibilityPolicy.objects.user_can_see(self.superuser2, self.video ))
        # regular users not
        self.assertFalse(VideoVisibilityPolicy.objects.user_can_see(self.regular_user, self.video))
        policy.delete()
        policy = VideoVisibilityPolicy.objects.create_for_video(
            self.video,
            VideoVisibilityPolicy.SITE_VISIBILITY_PRIVATE_OWNER,
            self.team1,
        )
        self.assertFalse(VideoVisibilityPolicy.objects.user_can_see( self.team2_member.user, self.video))
        self.assertTrue(VideoVisibilityPolicy.objects.user_can_see( self.team1_member.user, self.video))


    def test_secret_key_for_video(self):
        self.assertTrue(VideoVisibilityPolicy.objects.user_can_see( self.regular_user, self.video))
        policy = VideoVisibilityPolicy.objects.create_for_video(
            self.video,
            VideoVisibilityPolicy.SITE_VISIBILITY_PRIVATE_WITH_KEY,
            self.superuser,
        )
        # super users should always be able to see them
        self.assertTrue(VideoVisibilityPolicy.objects.user_can_see(self.superuser2, self.video ))
        # regular users not
        self.assertFalse(VideoVisibilityPolicy.objects.user_can_see(self.regular_user, self.video))
        self.assertFalse(VideoVisibilityPolicy.objects.user_can_see(self.regular_user, self.video), "bad=lkey")
        self.assertTrue(VideoVisibilityPolicy.objects.user_can_see(self.regular_user, self.video, policy.site_secret_key))


    def test_can_create_for_video(self):
        self.assertTrue(
            VideoVisibilityPolicy.objects.can_create_for_video(self.video, self.regular_user))
        # check with a user policy
        policy = VideoVisibilityPolicy.objects.create_for_video(
            self.video,
            VideoVisibilityPolicy.SITE_VISIBILITY_PUBLIC,
            self.regular_user,
        )
        video = refresh(self.video)
        self.assertFalse(
            VideoVisibilityPolicy.objects.can_create_for_video(video, self.team1_member.user))
        self.assertFalse(
            VideoVisibilityPolicy.objects.can_create_for_video(video, self.team1))
        policy.delete()
        video = refresh(self.video)
        # check with a team policy
        policy = VideoVisibilityPolicy.objects.create_for_video(
            video,
            VideoVisibilityPolicy.SITE_VISIBILITY_PUBLIC,
            self.team1,
        )
        video = refresh(self.video)
        self.assertFalse(
            VideoVisibilityPolicy.objects.can_create_for_video(video, self.regular_user))
        self.assertFalse(
            VideoVisibilityPolicy.objects.can_create_for_video(video, self.team2))

    def test_updates_video_model(self):
        self.assertTrue(self.video.is_public)
        VideoVisibilityPolicy.objects.create_for_video(
            self.video,
            VideoVisibilityPolicy.SITE_VISIBILITY_PRIVATE_OWNER,
            self.regular_user,
        )
        video = refresh(self.video)
        self.assertFalse(video.is_public)

    def test_updates_video_model_delete(self):
        self.assertTrue(self.video.is_public)
        policy = VideoVisibilityPolicy.objects.create_for_video(
            self.video,
            VideoVisibilityPolicy.SITE_VISIBILITY_PRIVATE_OWNER,
            self.regular_user,
        )
        video = refresh(self.video)
        self.assertFalse(video.is_public)
        policy.delete()
        video = refresh(self.video)
        self.assertTrue(video.is_public)



class WidgetBusinessLogicTest(BasicDataTest):
    def test_no_policy_widget_ok(self):
        pass

    def test_public_policy_ok(self):
        pass

    def test_embed_forbid(self):
        # for owner
        # for super user
        pass

    def test_with_hidden_secret(self):
        pass

    def test_from_referral(self):
        # not implemented yet
        pass

class ViewTest(BasicDataTest):
    def test_private_video_closes_public_url(self):
        video_url = reverse("videos:history",
                            kwargs={'video_id':self.video.video_id})

        response = self.client.get(video_url, follow=True)
        self.assertEqual(response.status_code, 200)
        # moderate the video th
        VideoVisibilityPolicy.objects.create_for_video(
            self.video,
            VideoVisibilityPolicy.SITE_VISIBILITY_PRIVATE_WITH_KEY,
            self.superuser,
        )
        response = self.client.get(video_url)
        self.assertEqual(response.status_code, 403)

    def test_private_video_with_secret_url_for_owner(self):
        video_url = reverse("videos:history",
                            kwargs={'video_id':self.video.video_id})
        response = self.client.get(video_url, follow=True)
        self.assertEqual(response.status_code, 200)
        # moderate the video th
        VideoVisibilityPolicy.objects.create_for_video(
            self.video,
            VideoVisibilityPolicy.SITE_VISIBILITY_PRIVATE_WITH_KEY,
            self.regular_user)
        response = self.client.get(video_url)
        self.assertEqual(response.status_code, 403)
        self.assertTrue(self.client.login(
                username=self.regular_user.username,
                password=self.regular_user.username ))
        # login in as owner should give us access
        response = self.client.get(video_url, follow=True)
        self.assertEqual(response.status_code, 200)

        video_url_secret = reverse("videos:history",
                            kwargs={'video_id':self.video.policy.site_secret_key})

        # owner should also see the secret url
        response = self.client.get(video_url_secret, follow=True)
        self.assertEqual(response.status_code, 200)

        # other users should see the secret url as well
        self.client.logout()
        response = self.client.get(video_url_secret, follow=True)
        self.assertEqual(response.status_code, 200)

    def test_private_video_with_secret_url_for_teams(self):
        video_url = reverse("videos:history",
                            kwargs={'video_id':self.video.video_id})
        response = self.client.get(video_url, follow=True)
        self.assertEqual(response.status_code, 200)

        # moderate the video for team
        VideoVisibilityPolicy.objects.create_for_video(
            self.video,
            VideoVisibilityPolicy.SITE_VISIBILITY_PRIVATE_WITH_KEY,
            self.team1,
        )
        response = self.client.get(video_url)
        self.assertEqual(response.status_code, 403)
        self.client.login(username=self.team1_member.user.username, password=self.team1_member.user.username )
        #
        response = self.client.get(video_url, follow=True)
        self.assertEqual(response.status_code, 200)

        video_url_secret = reverse("videos:history",
                            kwargs={'video_id':self.video.policy.site_secret_key})

        # owner should also see the secret url
        response = self.client.get(video_url_secret, follow=True)
        self.assertEqual(response.status_code, 200)

        # other users should see the secret url as well
        self.client.logout()
        response = self.client.get(video_url_secret, follow=True)
        self.assertEqual(response.status_code, 200)

    def test_private_video_without_secret_url_for_teams(self):
        video_url = reverse("videos:history",
                            kwargs={'video_id':self.video.video_id})
        response = self.client.get(video_url, follow=True)
        self.assertEqual(response.status_code, 200)

        # moderate the video for team
        VideoVisibilityPolicy.objects.create_for_video(
            self.video,
            VideoVisibilityPolicy.SITE_VISIBILITY_PRIVATE_OWNER,
            self.team1,
        )
        response = self.client.get(video_url)
        self.assertEqual(response.status_code, 403)
        self.client.login(username=self.team1_member.user.username,
                          password=self.team1_member.user.username)

        response = self.client.get(video_url, follow=True)
        self.assertEqual(response.status_code, 200)

        video_url_secret = reverse("videos:history",
                            kwargs={'video_id':self.video.policy.site_secret_key})

        # owner should also see the secret url
        response = self.client.get(video_url_secret, follow=True)
        self.assertEqual(response.status_code, 200)

        # other users should not see the secret url
        self.client.logout()
        response = self.client.get(video_url_secret)
        self.assertEqual(response.status_code, 403)

    def test_widget_sharing_not_available_when_widget_hidden(self):
        video_url = reverse("videos:history",
                            kwargs={'video_id':self.video.video_id})
        response = self.client.get(video_url, follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.context['shows_widget_sharing'])

        video_url = reverse("videos:video",
                            kwargs={'video_id':self.video.video_id})
        response = self.client.get(video_url)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.context['shows_widget_sharing'])

        # moderate the video for team
        VideoVisibilityPolicy.objects.create_for_video(
            self.video,
            VideoVisibilityPolicy.SITE_VISIBILITY_PUBLIC,
            self.team1,
            VideoVisibilityPolicy.WIDGET_VISIBILITY_HIDDEN
        )

        video_url = reverse("videos:history",
                            kwargs={'video_id':self.video.video_id})
        response = self.client.get(video_url, follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.context['shows_widget_sharing'])

        video_url = reverse("videos:video",
                            kwargs={'video_id':self.video.video_id})
        response = self.client.get(video_url)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.context['shows_widget_sharing'], True)

class WidgetTest(BasicDataTest):

    def test_videos_without_policy(self):
        logic = VideoVisibilityPolicy.objects
        self.assertTrue(logic.can_show_widget(self.video))

    def test_public_widget(self):
        logic = VideoVisibilityPolicy.objects
        policy = VideoVisibilityPolicy.objects.create_for_video(
            self.video,
            VideoVisibilityPolicy.WIDGET_VISIBILITY_PUBLIC,
            self.team1,
            VideoVisibilityPolicy.WIDGET_VISIBILITY_PUBLIC,
        )
        self.assertTrue(logic.can_show_widget(self.video, None))
        self.assertTrue(logic.can_show_widget(self.video, "google.com"))
        policy.delete()

    def test_private_widget_hidden(self):
        logic = VideoVisibilityPolicy.objects
        VideoVisibilityPolicy.objects.create_for_video(
            self.video,
            VideoVisibilityPolicy.SITE_VISIBILITY_PUBLIC,
            self.team1,
            VideoVisibilityPolicy.WIDGET_VISIBILITY_HIDDEN,
        )
        self.assertFalse(logic.can_show_widget(self.video, None))
        self.assertFalse(logic.can_show_widget(self.video, None))
        self.assertFalse(logic.can_show_widget(self.video, "google.com"))


    def test_on_private_on_referral(self):
        logic = VideoVisibilityPolicy.objects
        policy = VideoVisibilityPolicy.objects.create_for_video(
            self.video,
            VideoVisibilityPolicy.WIDGET_VISIBILITY_WHITELISTED,
            self.team1,
            VideoVisibilityPolicy.WIDGET_VISIBILITY_HIDDEN,
        )
        policy.embed_allowed_domains = "pculture.org,eff.org"
        self.assertFalse(logic.can_show_widget(self.video, None))
        self.assertFalse(logic.can_show_widget(self.video, "microsoft.com"))
        self.assertFalse(logic.can_show_widget(self.video, "pculture.org"))


class WidgetRPCTest(BasicDataTest):

    def test_visibility(self):
        video_url = self.video.get_video_url()
        widget_url = reverse('widget:rpc',args=['show_widget'])
        data = {
            'is_remote': u'false',
            'video_url': u'"%s"' % video_url
        }
        response = self.client.post(widget_url,  data)
        self.assertTrue(response.status_code < 300)
        data  =  json.loads(response.content)
        self.assertTrue(video_url in data["video_urls"])

    def test_no_widget_for_hidden(self):
        policy = VideoVisibilityPolicy.objects.create_for_video(
            self.video,
            VideoVisibilityPolicy.SITE_VISIBILITY_PUBLIC,
            self.team1,
            VideoVisibilityPolicy.WIDGET_VISIBILITY_HIDDEN,
        )
        policy.save()
        video_url = self.video.get_video_url()
        widget_url = reverse('widget:rpc',args=['show_widget'])
        data = {
            'is_remote': u'false',
            'video_url': u'"%s"' % video_url
        }
        response = self.client.post(widget_url,  data)
        self.assertTrue(response.status_code < 300)
        data  =  json.loads(response.content)
        self.assertIn("error_msg", data.keys())

    def test_no_widget_visible_for_user(self):
        policy = VideoVisibilityPolicy.objects.create_for_video(
            self.video,
            VideoVisibilityPolicy.SITE_VISIBILITY_PUBLIC,
            self.regular_user,
            VideoVisibilityPolicy.WIDGET_VISIBILITY_HIDDEN,
        )
        policy.save()
        video_url = self.video.get_video_url()
        widget_url = reverse('widget:rpc',args=['show_widget'])
        sent_data = {
            'is_remote': u'false',
            'video_url': u'"%s"' % video_url
        }
        response = self.client.post(widget_url,  sent_data)
        self.assertTrue(response.status_code < 300)
        data  =  json.loads(response.content)
        self.assertIn("error_msg", data.keys())
        # log in as the video ownwer
        self.client.login(username=self.regular_user.username,
                    password=self.regular_user.username)

        response = self.client.post(widget_url,  sent_data)
        self.assertTrue(response.status_code < 300)
        data  =  json.loads(response.content)
        self.assertTrue(data)
        self.assertTrue(len(data.keys()) > 0)

    def test_no_widget_visible_for_team_member(self):
        policy = VideoVisibilityPolicy.objects.create_for_video(
            self.video,
            VideoVisibilityPolicy.SITE_VISIBILITY_PUBLIC,
            self.team1,
            VideoVisibilityPolicy.WIDGET_VISIBILITY_HIDDEN,
        )
        policy.save()
        video_url = self.video.get_video_url()
        widget_url = reverse('widget:rpc',args=['show_widget'])
        sent_data = {
            'is_remote': u'false',
            'video_url': u'"%s"' % video_url
        }
        response = self.client.post(widget_url,  sent_data)
        self.assertTrue(response.status_code < 300)
        data  =  json.loads(response.content)

        self.assertIn("error_msg", data.keys())
        # log in as the video ownwer

        self.client.login(
            username=self.team1_member.user.username,
            password=self.team1_member.user.username )

        response = self.client.post(widget_url,  sent_data)
        self.assertTrue(response.status_code < 300)
        data  =  json.loads(response.content)
        self.assertTrue(data)
        self.assertTrue(len(data.keys()) > 0)


class TestListingVisibilities(BasicDataTest):

    def setUp(self):
        super(TestListingVisibilities, self).setUp()
        self.tv, created = TeamVideo.objects.get_or_create(
            team=self.team1,
            video=self.video,
            added_by=self.team1_member.user)

    def _in_solr(self, video):
        return video.video_id in [x.video_id for x in VideoIndex.public()]

    def _tv_in_solr(self, tv, user):
        if tv.team.is_member(user):
            results = TeamVideoLanguagesIndex.results_for_members(tv.team)
        else:
            results = TeamVideoLanguagesIndex.results()
        return tv.video.video_id in [x.video_id for x in results]

    def test_hidden_video_no_solr(self):
        reset_solr()
        self.assertTrue(self._in_solr( self.video))

        policy = VideoVisibilityPolicy.objects.create_for_video(
            self.video,
            VideoVisibilityPolicy.SITE_VISIBILITY_PRIVATE_OWNER,
            self.team1,
            VideoVisibilityPolicy.WIDGET_VISIBILITY_HIDDEN,
        )
        policy.save()
        self.video = refresh(self.video)
        reset_solr()
        self.assertFalse(self._in_solr( self.video))


    def test_visibility_for_teams_members(self):
        tv, created = TeamVideo.objects.get_or_create(video=self.video, team=self.team1)
        tv.added_by = self.team1_member.user
        reset_solr()
        self.assertTrue(self._tv_in_solr(tv, self.regular_user))

        policy = VideoVisibilityPolicy.objects.create_for_video(
            self.video,
            VideoVisibilityPolicy.SITE_VISIBILITY_PRIVATE_OWNER,
            self.team1,
            VideoVisibilityPolicy.WIDGET_VISIBILITY_HIDDEN,
        )
        policy.save()
        self.video = refresh(self.video)
        reset_solr()
        self.assertFalse(self._tv_in_solr(tv, self.regular_user))
        self.assertTrue(self._tv_in_solr(tv, self.team1_member.user))
        self.assertFalse(self._tv_in_solr(tv, self.team2_member.user))

    def test_visibility_when_owned_by_user(self):
        tv, created = TeamVideo.objects.get_or_create(video=self.video, team=self.team1)
        tv.added_by = self.team1_member.user
        reset_solr()
        self.assertTrue(self._tv_in_solr(tv, self.regular_user))

        policy = VideoVisibilityPolicy.objects.create_for_video(
            self.video,
            VideoVisibilityPolicy.SITE_VISIBILITY_PRIVATE_OWNER,
            self.regular_user,
            VideoVisibilityPolicy.WIDGET_VISIBILITY_HIDDEN,
        )
        policy.save()
        self.video = refresh(self.video)
        self.assertFalse(self._tv_in_solr(tv, self.team1_member.user))
        self.assertFalse(self._tv_in_solr(tv, self.team2_member.user))
        self.assertFalse(self._tv_in_solr(tv, self.regular_user))

def refresh(obj):
    return obj.__class__.objects.get(pk=obj.pk)
