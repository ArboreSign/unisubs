# -*- coding: utf-8 -*-
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

# Django settings for unisubs project.
import os, sys
from datetime import datetime

PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
DEFAULT_PROTOCOL  = 'http'

def rel(*x):
    return os.path.join(PROJECT_ROOT, *x)

# Rebuild the language dicts to support more languages.
from django.conf import global_settings
from unilangs import get_language_code_mapping

# We use a custom format for our language labels:
# Translated Language Name (Native Name)
#
# For example: if you are an English user you'll see something like:
# French (Français)
language_choices = [(code,
                     u'%s' % lc.name())
                    for code, lc in get_language_code_mapping('unisubs').items()]

global_settings.LANGUAGES = ALL_LANGUAGES = language_choices

# Languages representing metadata
METADATA_LANGUAGES = (
    ('meta-tw', 'Metadata: Twitter'),
    ('meta-geo', 'Metadata: Geo'),
    ('meta-wiki', 'Metadata: Wikipedia'),
)


DEBUG = True
TEMPLATE_DEBUG = DEBUG

PISTON_EMAIL_ERRORS = True
PISTON_DISPLAY_ERRORS = False

ADMINS = (
    # ('Your Name', 'your_email@domain.com'),
)

ALARM_EMAIL = None
MANAGERS = ADMINS

P3P_COMPACT = 'CP="CURa ADMa DEVa OUR IND DSP CAO COR"'

DEFAULT_FROM_EMAIL = '"Amara" <feedback@universalsubtitles.org>'
WIDGET_LOG_EMAIL = 'widget-logs@universalsubtitles.org'

BILLING_CUTOFF = datetime(2013, 3, 1, 0, 0, 0)

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3', # Add 'postgresql_psycopg2', 'postgresql', 'mysql', 'sqlite3' or 'oracle'.
        'NAME': rel('unisubs.sqlite3'), # Or path to database file if using sqlite3.
        'USER': '',                      # Not used with sqlite3.
        'PASSWORD': '',                  # Not used with sqlite3.
        'HOST': '',                      # Set to empty string for localhost. Not used with sqlite3.
        'PORT': '',                      # Set to empty string for default. Not used with sqlite3.
    }
}

CSS_USE_COMPILED = True

COMPRESS_YUI_BINARY = "java -jar ./css-compression/yuicompressor-2.4.6.jar"
COMPRESS_OUTPUT_DIRNAME = "static-cache"


USER_LANGUAGES_COOKIE_NAME = 'unisub-languages-cookie'

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# If running in a Windows environment this must be set to the same as your
# system time zone.
TIME_ZONE = 'America/Chicago'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# Absolute path to the directory that holds media.
# Example: "/home/media/media.lawrence.com/"
STATIC_ROOT = rel('media')+'/'
MEDIA_ROOT  = rel('user-data')+'/'

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader'
)


MIDDLEWARE_CLASSES = (
    'middleware.ResponseTimeMiddleware',
    'middleware.StripGoogleAnalyticsCookieMiddleware',
    'utils.ajaxmiddleware.AjaxErrorMiddleware',
    'localeurl.middleware.LocaleURLMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'openid_consumer.middleware.OpenIDMiddleware',
    'middleware.P3PHeaderMiddleware',
    'middleware.UserUUIDMiddleware',
    'middleware.SaveUserIp',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
)

ROOT_URLCONF = 'unisubs.urls'

TEMPLATE_DIRS = (
    # Put strings here, like "/home/html/django_templates" or "C:/www/django/templates".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
   rel('templates'),
)

TEMPLATE_CONTEXT_PROCESSORS = (
    'django.contrib.auth.context_processors.auth',
    'django.core.context_processors.debug',
    'django.core.context_processors.request',
    'utils.context_processors.current_site',
    'utils.context_processors.current_commit',
    'utils.context_processors.custom',
    'utils.context_processors.user_languages',
    'utils.context_processors.run_locally',
    'django.contrib.messages.context_processors.messages',
    'django.core.context_processors.i18n',
    'staticmedia.context_processors.staticmedia',
)

INSTALLED_APPS = (
    # this needs to be first, yay for app model loading mess
    'auth',
    # django stock apps
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.markup',
    'django.contrib.sessions',
    'django.contrib.sitemaps',
    'django.contrib.sites',
    'django.contrib.webdesign',
    # third party apps
    'django_extensions',
    'djcelery',
    'haystack',
    'rosetta',
    'raven.contrib.django',
    'south',
    'tastypie',
    # third party apps forked on our repo
    'localeurl',
    'openid_consumer',
    'socialauth',
    # our apps
    'accountlinker',
    'amaradotorg',
    'amaracelery',
    'comments',
    'externalsites',
    'messages',
    'profiles',
    'search',
    'startup',
    'staticmedia',
    'statistic',
    'teams',
    'testhelpers',
    'thirdpartyaccounts',
    'unisubs', #dirty hack to fix http://code.djangoproject.com/ticket/5494 ,
    'unisubs_compressor',
    'uslogging',
    'utils',
    'videos',
    'widget',
    'subtitles',
)

STARTUP_MODULES = [
    'externalsites.signalhandlers',
]

# Celery settings

# import djcelery
# djcelery.setup_loader()

# For running worker use: python manage.py celeryd -E --concurrency=10 -n worker1.localhost
# Run event cather for monitoring workers: python manage.py celerycam --frequency=5.0
# This allow know are workers online or not: python manage.py celerybeat

CELERY_IGNORE_RESULT = True
CELERY_DISABLE_RATE_LIMITS = True
CELERY_SEND_EVENTS = False
CELERY_SEND_TASK_ERROR_EMAILS = True
CELERY_RESULT_BACKEND = 'redis'

BROKER_BACKEND = 'kombu_backends.amazonsqs.Transport'
BROKER_USER = AWS_ACCESS_KEY_ID = ""
BROKER_PASSWORD = AWS_SECRET_ACCESS_KEY = ""
BROKER_HOST = "localhost"
BROKER_POOL_LIMIT = 10

#################

import re
LOCALE_INDEPENDENT_PATHS = (
    re.compile('^/media/'),
    re.compile('^/widget/'),
    re.compile('^/api/'),
    re.compile('^/api2/'),
    re.compile('^/jstest/'),
    re.compile('^/sitemap.*.xml'),
    re.compile('^/externalsites/youtube-callback'),
    re.compile('^/crossdomain.xml'),
)

#Haystack configuration
HAYSTACK_SITECONF = 'search_site'
HAYSTACK_SEARCH_ENGINE = 'solr'
HAYSTACK_SOLR_URL = 'http://127.0.0.1:8983/solr'
HAYSTACK_SEARCH_RESULTS_PER_PAGE = 20
SOLR_ROOT = rel('..', 'buildout', 'parts', 'solr', 'example')

# socialauth-related
OPENID_REDIRECT_NEXT = '/socialauth/openid/done/'

OPENID_SREG = {"required": "nickname, email", "optional":"postcode, country", "policy_url": ""}
OPENID_AX = [{"type_uri": "http://axschema.org/contact/email", "count": 1, "required": True, "alias": "email"},
             {"type_uri": "fullname", "count": 1 , "required": False, "alias": "fullname"}]

FACEBOOK_API_KEY = ''
FACEBOOK_SECRET_KEY = ''

VIMEO_API_KEY = None
VIMEO_API_SECRET = None

AUTHENTICATION_BACKENDS = (
   'auth.backends.CustomUserBackend',
   'thirdpartyaccounts.auth_backends.TwitterAuthBackend',
   'thirdpartyaccounts.auth_backends.FacebookAuthBackend',
   'auth.backends.OpenIdBackend',
   'django.contrib.auth.backends.ModelBackend',
)

SKIP_SOUTH_TESTS = True
SOUTH_TESTS_MIGRATE = False

LOGIN_URL = '/auth/login/'
LOGIN_REDIRECT_URL = '/'

AUTH_PROFILE_MODULE = 'profiles.Profile'
ACCOUNT_ACTIVATION_DAYS = 9999 # we are using registration only to verify emails
SESSION_COOKIE_AGE = 2419200 # 4 weeks

SESSION_ENGINE = 'django.contrib.sessions.backends.cached_db'
SESSION_COOKIE_HTTPONLY = False

RECENT_ACTIVITIES_ONPAGE = 10
ACTIVITIES_ONPAGE = 20
REVISIONS_ONPAGE = 20

FEEDBACK_EMAIL = 'socmedia@pculture.org'
FEEDBACK_EMAILS = [FEEDBACK_EMAIL]
FEEDBACK_ERROR_EMAIL = 'universalsubtitles-errors@pculture.org'
FEEDBACK_SUBJECT = 'Amara Feedback'
FEEDBACK_RESPONSE_SUBJECT = 'Thanks for trying Amara'
FEEDBACK_RESPONSE_EMAIL = 'universalsubtitles@pculture.org'
FEEDBACK_RESPONSE_TEMPLATE = 'feedback_response.html'

#teams
TEAMS_ON_PAGE = 12

PROJECT_VERSION = '0.5'

EDIT_END_THRESHOLD = 120

ANONYMOUS_USER_ID = 10000

#Use on production
GOOGLE_ANALYTICS_NUMBER = 'UA-163840-22'
MIXPANEL_TOKEN = '44205f56e929f08b602ccc9b4605edc3'

try:
    from commit import LAST_COMMIT_GUID
except ImportError:
    sys.stderr.write("deploy/create_commit_file must be ran before boostrapping django")
    LAST_COMMIT_GUID = "dev/dev"

AWS_ACCESS_KEY_ID = ''
AWS_SECRET_ACCESS_KEY = ''
DEFAULT_BUCKET = ''
AWS_USER_DATA_BUCKET_NAME  = ''
STATIC_MEDIA_USES_S3 = USE_AMAZON_S3 = False
STATIC_MEDIA_COMPRESSED = True

AVATAR_MAX_SIZE = 500*1024
THUMBNAILS_SIZE = (
    (100, 100),
    (50, 50),
    (120, 90),
    (240, 240)
)

EMAIL_BCC_LIST = []

CACHE_BACKEND = 'locmem://'

#for unisubs.example.com
RECAPTCHA_PUBLIC = '6LdoScUSAAAAANmmrD7ALuV6Gqncu0iJk7ks7jZ0'
RECAPTCHA_SECRET = ' 6LdoScUSAAAAALvQj3aI1dRL9mHgh85Ks2xZH1qc'

ROSETTA_EXCLUDED_APPLICATIONS = (
    'openid_consumer',
    'rosetta'
)


INTEGRATION_PATH = os.path.join(PROJECT_ROOT, 'unisubs-integration')
USE_INTEGRATION = os.path.exists(INTEGRATION_PATH)
if USE_INTEGRATION:
    sys.path.append(INTEGRATION_PATH)

if USE_INTEGRATION:
    for dirname in os.listdir(INTEGRATION_PATH):
        if os.path.isfile(os.path.join(INTEGRATION_PATH, dirname, '__init__.py')):
            INSTALLED_APPS += (dirname,)

    try:
        from integration_settings import *
    except ImportError:
        pass
# paths from MEDIA URL
# this needs to run after the integration player has loaded
MEDIA_BUNDLES = {
    "base.css": {
        "files": (
            "css/jquery.jgrowl.css",
            "css/jquery.alerts.css",
            "css/960.css",
            "css/reset.css",
            "css/html.css",
            "css/about_faq.css",
            "css/breadcrumb.css",
            "css/buttons.css",
            "css/chosen.css",
            "css/classes.css",
            "css/forms.css",
            "css/index.css",
            "css/layout.css",
            "css/profile_pages.css",
            "css/revision_history.css",
            "css/teams.css",
            "css/transcripts.css",
            "css/background.css",
            "css/activity_stream.css",
            "css/settings.css",
            "css/feedback.css",
            "css/messages.css",
            "css/global.css",
            "css/top_user_panel.css",
            "css/services.css",
            "css/solutions.css",
            "css/watch.css",
            "css/v1.scss",
            "css/bootstrap.css",
        ),
    },
    "home.css": {
        "files": (
            "css/new_index.css",
        ),
    },
    "hands_home.css": {
        "files": (
            "css/hands-header-footer.css",
            "css/hands-static.css",
            "css/hands-main.css",
         )
    },
    "hands_home.js": {
        "files": (
            "js/hands-plugins.js",
            "js/hands-modernizr-2.6.2.min.js",
         )
    },
    "site.js": {
        "files": (
            "js/jquery-1.4.3.js",
            "js/jquery-ui-1.8.16.custom.min.js",
            "js/jgrowl/jquery.jgrowl.js",
            "js/jalerts/jquery.alerts.js",
            "js/jquery.form.js",
            "js/jquery.metadata.js",
            "js/jquery.mod.js",
            "js/jquery.rpc.js",
            "js/jquery.input_replacement.min.js",
            "js/messages.js",
            "js/escape.js",
            "js/libs/chosen.jquery.min.js",
            "js/libs/chosen.ajax.jquery.js",
            "js/libs/jquery.cookie.js",
            "js/unisubs.site.js",
        ),
    },
    "teams.js": {
        "files": (
            "js/libs/ICanHaz.js",
            "js/libs/classy.js",
            "js/libs/underscore.js",
            "js/libs/chosen.jquery.min.js",
            "js/libs/chosen.ajax.jquery.js",
            "js/jquery.mod.js",
            "js/teams/create-task.js",
         ),
    },
    'editor.js':  {
        'files': (
            'src/js/third-party/jquery-1.10.1.js',
            'js/jquery.form.js',
            'src/js/third-party/jquery.autosize.js',
            'src/js/third-party/angular.1.2.0.js',
            'src/js/third-party/angular-cookies.js',
            'src/js/third-party/underscore.1.4.4.js',
            'src/js/third-party/popcorn.js',
            'src/js/third-party/Blob.js',
            'src/js/third-party/FileSaver.js',
            'src/js/third-party/popcorn.brightcove.js',
            'src/js/third-party/modal-helper.js',
            'src/js/third-party/json2.min.js',
            'src/js/dfxp/dfxp.js',
            'src/js/uri.js',
            'src/js/popcorn/popcorn.flash-fallback.js',
            #'src/js/popcorn/popcorn.netflix.js',
            'src/js/subtitle-editor/app.js',
            'src/js/subtitle-editor/dom.js',
            'src/js/subtitle-editor/help.js',
            'src/js/subtitle-editor/lock.js',
            'src/js/subtitle-editor/modal.js',
            'src/js/subtitle-editor/blob.js',
            'src/js/subtitle-editor/session.js',
            'src/js/subtitle-editor/workflow.js',
            'src/js/subtitle-editor/subtitles/controllers.js',
            'src/js/subtitle-editor/subtitles/directives.js',
            'src/js/subtitle-editor/subtitles/filters.js',
            'src/js/subtitle-editor/subtitles/models.js',
            'src/js/subtitle-editor/subtitles/services.js',
            'src/js/subtitle-editor/timeline/controllers.js',
            'src/js/subtitle-editor/timeline/directives.js',
            'src/js/subtitle-editor/video/controllers.js',
            'src/js/subtitle-editor/video/directives.js',
            'src/js/subtitle-editor/video/services.js',
        ),
    },
    'editor.css':  {
        'files': (
            'src/css/third-party/reset.css',
            'src/css/subtitle-editor/subtitle-editor.scss',
        ),
    },
    "embedder.js":{
        "files": (
            "src/js/third-party/json2.min.js",
            'src/js/third-party/underscore.min.js',
            'src/js/third-party/jquery-1.8.3.min.js',
            'src/js/third-party/backbone.min.js',
            'src/js/third-party/popcorn.js',
            'src/js/third-party/popcorn.brightcove.js',
            'src/js/popcorn/popcorn.flash-fallback.js',
            'src/js/third-party/jquery.mCustomScrollbar.concat.min.js',
            'src/js/popcorn/popcorn.amaratranscript.js',
            'src/js/popcorn/popcorn.amarasubtitle.js',
            'src/js/embedder/embedder.js'
        ),
        'add_amara_conf': True,
    },
    "embedder.css": {
        "files": (
            "src/css/embedder/jquery.mCustomScrollbar.css",
            "src/css/embedder/embedder.scss",
        ),
    },
    'ie8.css': {
        'files': (
            'css/ie8.css',
        ),
    },
    'ajax-paginator.js': {
        'files': (
            'js/jquery.address-1.4.fixed.js',
            'js/escape.js',
            'js/jquery.ajax-paginator.js',
        ),
    },
    'prepopulate.js': {
        'files': (
            'js/urlify.js',
            'js/prepopulate.min.js',
        ),
    },
    # used by the old editor
    'unisubs-api.js': {
        'files': (
            'legacy-js/unisubs-api.js',
        ),
    },
    # used by the old embedder -- hopefully going away soon
    'unisubs-offsite-compiled.js': {
        'files': (
            'legacy-js/unisubs-offsite-compiled.js',
        ),
    },
    # used by both the old embedder and old editor
    "widget.css": {
        "files": (
            "css/unisubs-widget.css",
        ),
    },
}

# Where we should tell OAuth providers to redirect the user to.  We want to
# use https for production to prevent attackers from seeing the access token.
# For development, we care less about that so we typically use http
OAUTH_CALLBACK_PROTOCOL = 'https'

EMAIL_BACKEND = "utils.safemail.InternalOnlyBackend"
EMAIL_FILE_PATH = '/tmp/unisubs-messages'
# on staging and dev only the emails listed bellow will receive actual mail
EMAIL_NOTIFICATION_RECEIVERS = ("arthur@stimuli.com.br", "steve@stevelosh.com", "@pculture.org")
# If True will not try to load media (e.g. javascript files) from third parties.
# If you're developing and have no net access, enable this setting on your
# settings_local.py
RUN_LOCALLY = False

LOGGING = {
    'version': 1,
    'disable_existing_loggers': True,
    'root': {
        'level': 'WARNING',
        'handlers': ['console', 'sentry'],
    },
    'formatters': {
        'verbose': {
            'format': '%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s'
        },
    },
    'handlers': {
        'null': {
            'level':'DEBUG',
            'class':'django.utils.log.NullHandler',
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose'
        },
        'sentry': {
            'level': 'INFO',
            'class': 'raven.contrib.django.handlers.SentryHandler',
        },
    },
    'loggers': {
        'django.db.backends': {
            'level': 'ERROR',
            'handlers': ['console'],
            'propagate': False,
        },
        'raven': {
            'level': 'DEBUG',
            'handlers': ['console'],
            'propagate': False,
        },
        'sentry.errors': {
            'level': 'DEBUG',
            'handlers': ['console'],
            'propagate': False,
        },
        'bleach': {
            'level': 'ERROR',
            'handlers': ['null'],
            'propagate': False,
        },
        'api': {
            'level': 'INFO',
            'handlers': ['sentry', 'console'],
            'propagate': False
        },
        'youtube': {
            'level': 'INFO',
            'handlers': ['sentry', 'console'],
            'propagate': False
        },
        'timing': {
            'level': 'DEBUG',
            'handlers': ['console'],
            'propagate': False
        },
    },
}

from periodic_tasks_settings import CELERYBEAT_SCHEDULE

try:
    import debug_toolbar

    EVERYONE_CAN_DEBUG = False
    INSTALLED_APPS += ('debug_toolbar',)
    MIDDLEWARE_CLASSES += ('debug_toolbar.middleware.DebugToolbarMiddleware',)

    DEBUG_TOOLBAR_PANELS = (
        'debug_toolbar.panels.timer.TimerDebugPanel',
        # 'apps.testhelpers.debug_toolbar_extra.ProfilingPanel',
        # 'apps.testhelpers.debug_toolbar_extra.HaystackDebugPanel',
        'debug_toolbar.panels.request_vars.RequestVarsDebugPanel',
        'debug_toolbar.panels.template.TemplateDebugPanel',
        'debug_toolbar.panels.sql.SQLDebugPanel',
    )

    def custom_show_toolbar(request):
        from django.conf import settings
        can_debug = settings.EVERYONE_CAN_DEBUG or request.user.is_staff

        if can_debug:
            if '__debug__/m/' in request.path or 'debug_toolbar' in request.GET:
                return True

        return False

    DEBUG_TOOLBAR_CONFIG = {
        'INTERCEPT_REDIRECTS': False,
        'SHOW_TOOLBAR_CALLBACK': custom_show_toolbar,
        'EXTRA_SIGNALS': [],
        'HIDE_DJANGO_SQL': False,
        'TAG': 'div',
    }
except ImportError:
    pass
