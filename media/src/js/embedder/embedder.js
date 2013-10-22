(function(window, document, undefined) {

    // When the embedder is compiled, dependencies will be loaded directly before this
    // function. Set dependencies to use no-conflict mode to avoid destroying any
    // original objects.
    var __ = _.noConflict();
    var _$ = Zepto;
    var _Backbone = Backbone.noConflict();
    var _Popcorn = Popcorn.noConflict();

    // _amara may exist with a queue of actions that need to be processed after the
    // embedder has finally loaded. Store the queue in toPush for processing in init().
    var toPush = window._amara || [];

    function regexEscape(str) {
        var specials = /[.*+?|()\[\]{}\\$^]/g; // .*+?|()[]{}\$^
        return str.replace(specials, "\\$&");
    }

    var Amara = function(Amara) {

        // For reference in inner functions.
        var that = this;

        // This will store all future instances of Amara-powered videos.
        // I'm trying really hard here to not use the word "widget".
        this.amaraInstances = [];

        // Private methods that are called via the push() method.
        var actions = {

            // The core function for constructing an entire video with Amara subtitles from
            // just a video URL. This includes DOM creation for the video, etc.
            embedVideo: function(options) {

                // Make sure we have a URL to work with.
                // If we do, init a new Amara view.
                if (__.has(options, 'url') && __.has(options, 'div')) {

                    that.amaraInstances.push(
                        new that.AmaraView({

                            // TODO: This needs to support a node OR ID string.
                            el: _$(options.div)[0],
                            model: new VideoModel(options)
                        })
                    );
                }
            }
        };

        // Utilities.
        var utils = {
            parseFloatAndRound: function(val) {
                return (Math.round(parseFloat(val) * 100) / 100).toFixed(2);
            }
        };

        // Video model.
        var VideoModel = _Backbone.Model.extend({

            // The initialization of these vars is unnecessary, but it's nice to know
            // what vars will *eventually* be on the video model.

            // This var will be true once we've retrieved the rest of the model attrs
            // from the Amara API.
            is_complete: false,

            // Set from within the embedder.
            div: '',
            height: '',
            initial_language: null,
            is_on_amara: null,
            subtitles: [], // Backbone collection
            url: '',
            width: '',

            // Set from the Amara API
            all_urls: [],
            created: null,
            description: null,
            duration: null,
            id: null,
            languages: [],
            original_language: null,
            project: null,
            resource_uri: null,
            team: null,
            thumbnail: null,
            title: null,

            // Every time a video model is created, do this.
            initialize: function() {

                var video = this;
                var apiURL = 'http://' + _amaraConf.baseURL + '/api2/partners/videos/?&video_url=';

                this.subtitles = new that.Subtitles();

                // Make a call to the Amara API to get attributes like available languages,
                // internal ID, description, etc.
                _$.ajax({
                    url: apiURL + this.get('url'),
                    dataType: 'jsonp',
                    success: function(resp) {

                        if (resp.objects.length) {

                            // The video exists on Amara.
                            video.set('is_on_amara', true);

                            // There should only be one object.
                            if (resp.objects.length === 1) {

                                // Set all of the API attrs as attrs on the video model.
                                video.set(resp.objects[0]);

                                // Set the initial language to either the one provided by the initial
                                // options, or the original language from the API.
                                video.set('initial_language',
                                    video.get('initial_language') ||
                                    video.get('original_language') ||
                                    'en'
                                );
                            }

                        } else {

                            // The video does not exist on Amara.
                            video.set('is_on_amara', false);

                        }

                        // Mark that the video model has been completely populated.
                        video.set('is_complete', true);
                    }
                });
            }
        });

        // SubtitleSet model.
        var SubtitleSet = _Backbone.Model.extend({

            // Set from the Amara API
            description: null,
            language: null,
            note: null,
            resource_uri: null,
            site_url: null,
            sub_format: null,
            subtitles: [],
            title: null,
            version_no: null,
            video: null,
            video_description: null,
            video_title: null

        });

        // Subtitles collection.
        this.Subtitles = _Backbone.Collection.extend({
            model: SubtitleSet
        });

        // Amara view. This contains all of the events and logic for a single instance of
        // an Amara-powered video.
        this.AmaraView = _Backbone.View.extend({
            initialize: function() {
                this.model.view = this;
                this.template = __.template(this.templateHTML);
                this.render();

                // Default states.
                this.states = {
                    autoScrolling: true,
                    autoScrollPaused: false,
                    contextMenuActive: false
                };
            },
            events: {

                // Global
                'click':                                 'mouseClicked',
                'mousemove':                             'mouseMoved',

                // Toolbar
                'click a.amara-current-language':        'languageButtonClicked',
                'click a.amara-share-button':            'shareButtonClicked',
                'click a.amara-subtitles-button':        'toggleSubtitlesDisplay',
                'click ul.amara-languages-list a':       'changeLanguage',
                'click a.amara-transcript-button':       'toggleTranscriptDisplay',
                'keyup input.amara-transcript-search':   'updateSearch',
                'change input.amara-transcript-search':  'updateSearch',

                'click a.amara-transcript-search-next':  'moveSearchNext',
                'click a.amara-transcript-search-prev':  'moveSearchPrev',

                // Transcript
                'click a.amara-transcript-autoscroll':   'pauseAutoScroll',
                'click a.amara-transcript-line':         'transcriptLineClicked'
                //'contextmenu a.amara-transcript-line':   'showTranscriptContextMenu'
            },
            render: function() {

                // TODO: Split this monster of a render() into several render()s.
                
                var that = this;
                this.subtitleLines = [];
                this.currentSearch = '';
                this.currentSearchIndex = 0;
                this.currentSearchMatches = 0;

                // If jQuery exists on the page, Backbone tries to use it and there's an odd
                // bug if we don't convert it to a local Zepto object.
                this.$el = _$(this.$el.get(0));

                // Create a container that we will use to inject the Popcorn video.
                this.$el.prepend('<div class="amara-popcorn"></div>');

                this.$popContainer = _$('div.amara-popcorn', this.$el);

                // Copy the width and height to the new Popcorn container.
                this.$popContainer.width(this.$el.width());
                this.$popContainer.height(this.$el.height());

                // This is a hack until Popcorn.js supports passing a DOM elem to
                // its smart() method. See: http://bit.ly/L0Lb7t
                var id = 'amara-popcorn-' + Math.floor(Math.random() * 100000000);
                this.$popContainer.attr('id', id);

                // Reset the height on the parent amara-embed div. If we don't do this,
                // our amara-tools div won't be visible.
                this.$el.height('auto');

                // Init the Popcorn video.
                this.pop = this.loadPopcorn();

                this.pop.on('loadedmetadata', function() {

                    // Set the video model's height and width, now that we know it.
                    that.model.set('height', that.pop.position().height);
                    that.model.set('width', that.pop.position().width);

                    // Create the actual core DOM for the Amara container.
                    that.$el.append(that.template({
                        video_url: 'http://' + _amaraConf.baseURL + '/en/videos/create/?initial_url=' + that.model.get('url'),
                        width: that.model.get('width')
                    }));

                    // Just set some cached Zepto selections for later use.
                    that.cacheNodes();

                    // Setup tracking for the scroll event on the transcript body.
                    //
                    // TODO: Find a way to get this into the core Backbone events on the Amara view.
                    that.$transcriptBody.on('scroll', function() {
                        that.transcriptScrolled();
                    });

                    // Wait until we have a complete video model (the API was hit as soon as
                    // the video instance was created), and then retrieve the initial set
                    // of subtitles, so we can begin building out the transcript viewer
                    // and the subtitle display.
                    //
                    // We could just make this a callback on the model's initialize() for
                    // after we get a response, but there may be cases where we want to init
                    // a VideoModel separately from an AmaraView.
                    that.setCurrentLanguageMessage('Loading…');
                    that.waitUntilVideoIsComplete(
                        function() {

                            // Grab the subtitles for the initial language and do yo' thang.
                            if (that.model.get('is_on_amara')) {

                                // Build the language selection dropdown menu.
                                that.buildLanguageSelector();

                                // update the view on amara button
                                that.$viewOnAmaraButton.attr('href', 'http://' + _amaraConf.baseURL + '/en/videos/' + that.model.get('id'));

                                // Make the request to fetch the initial subtitles.
                                //
                                // TODO: This needs to be an option.
                                that.loadSubtitles(that.model.get('initial_language'));
                            } else {
                                // Do some other stuff for videos that aren't yet on Amara.
                                that.setCurrentLanguageMessage('Video not on Amara');
                            }
                        }
                    );
                });

                return this;

            },
            loadPopcorn: function() {
                var url = this.model.get('url');
                // For youtube, we need to alter the URL to enable controls.
                if(url.indexOf('youtube.com') != -1) {
                    if(url.indexOf('?') == -1) {
                        url += '?controls=1';
                    } else {
                        url += '&controls=1';
                    }
                }
                pop = _Popcorn.smart(this.$popContainer.attr('id'), url);
                pop.controls(true);
                return pop;
            },

            // View methods.
            mouseClicked: function(e) {
                this.hideTranscriptContextMenu();
            },
            mouseMoved: function(e) {
                this.setCursorPosition(e);
            },
            
            buildLanguageSelector: function() {
                var langs = this.model.get('languages');
                if (langs.length) {
                    for (var i = 0; i < langs.length; i++) {
                        this.$amaraLanguagesList.append('' +
                            '<li>' +
                                '<a href="#" data-language="' + langs[i].code + '">' +
                                    langs[i].name +
                                '</a>' +
                            '</li>');
                    }
                } else {
                    // We have no languages.
                }
            },
            setCurrentLanguageMessage: function(text) {
                this.$amaraCurrentLang.text(text);
                // Hide the expander triangle
                this.$amaraCurrentLang.css('background-image', 'none');
            },
            buildSubtitles: function(language) {

                // Remove any existing subtitle events.
                this.pop.removePlugin('amarasubtitle');
                
                // TODO: This is a temporary patch for Popcorn bug http://bit.ly/NShGdX
                //
                // (we think)
                this.pop.data.trackEvents.endIndex = 0;
                this.pop.data.trackEvents.startIndex = 0;

                // Get the subtitle sets for this language.
                var subtitleSets = this.model.subtitles.where({'language': language});

                if (subtitleSets.length) {
                    var subtitleSet = subtitleSets[0];

                    // Get the actual subtitles for this language.
                    var subtitles = subtitleSet.get('subtitles');

                    // For each subtitle, init the Popcorn subtitle plugin.
                    for (var i = 0; i < subtitles.length; i++) {
                        this.pop.amarasubtitle({
                            start: subtitles[i].start / 1000.0,
                            end: subtitles[i].end / 1000.0,
                            text: subtitles[i].text
                        });
                    }

                    this.$popSubtitlesContainer = _$('div.amara-popcorn-subtitles', this.$el);

                }
            },
            buildTranscript: function(language) {

                var that = this;

                this.setCurrentLanguageMessage('Loading…');

                // remove plugins added for previous languages
                this.pop.removePlugin('code');

                // TODO: This is a temporary patch for Popcorn bug http://bit.ly/NShGdX
                //
                // (we think)
                this.pop.data.trackEvents.endIndex = 0;
                this.pop.data.trackEvents.startIndex = 0;

                // Get the subtitle sets for this language.
                var subtitleSets = this.model.subtitles.where({'language': language});
                if (subtitleSets.length) {
                    var subtitleSet = subtitleSets[0];

                    // Get the actual subtitles for this language.
                    var subtitles = subtitleSet.get('subtitles');

                    // Remove the loading indicator.
                    this.$transcriptBody.html('');

                    for (var i = 0; i < subtitles.length; i++) {
                        var line = this.addSubtitleLine(subtitles[i]);
                        this.pop.code({
                            start: subtitles[i].start / 1000.0,
                            end: subtitles[i].end / 1000.0,
                            line: line,
                            view: this,
                            onStart: function(options) {
                                options.line.classList.add('current-subtitle');
                                options.view.autoScrollToLine(options.line);
                            },
                            onEnd: function(options) {
                                options.line.classList.remove('current-subtitle');
                            }
                        });
                    }

                    this.$amaraTranscriptLines = $('a.amara-transcript-line', this.$transcriptBody);

                } else {
                    _$('.amara-transcript-line', this.$transcriptBody).text('No subtitles available.');
                }
            },
            addSubtitleLine: function(subtitle) {
                // Construct the transcript line.
                var line = document.createElement('a');
                line.href = '#';
                line.classList.add('amara-transcript-line');
                line.innerHTML = subtitle.text;

                var container = this.$transcriptBody.get(0);
                // If this subtitle has indicated that it's the beginning of a
                // paragraph, prepend two line breaks before the subtitle.
                if (subtitle.start_of_paragraph) {
                    container.appendChild(document.createElement('br'));
                    container.appendChild(document.createElement('br'));
                }
                // Clicking the link should seek to its time.
                var pop = this.pop;
                line.addEventListener('click', function(e) {
                    pop.currentTime(subtitle.start / 1000.0);
                    e.preventDefault();
                    return false;
                }, false);
                // Add the subtitle to the transcript container.
                container.appendChild(line);
                this.subtitleLines.push({
                    line: line,
                    subtitle: subtitle,
                });
                return line;
            },
            cacheNodes: function() {
                this.$amaraTools         = _$('div.amara-tools',      this.$el);
                this.$amaraBar           = _$('div.amara-bar',        this.$amaraTools);
                this.$amaraTranscript    = _$('div.amara-transcript', this.$amaraTools);

                this.$viewOnAmaraButton   = _$('a.amara-logo', this.$amaraBar);
                this.$amaraDisplays      = _$('ul.amara-displays',         this.$amaraTools);
                this.$transcriptButton   = _$('a.amara-transcript-button', this.$amaraDisplays);
                this.$subtitlesButton    = _$('a.amara-subtitles-button',  this.$amaraDisplays);
                this.$transcriptHeaderRight = _$('div.amara-transcript-header-right', this.$amaraTranscript);
                this.$search              = _$('input.amara-transcript-search', this.$transcriptHeaderRight);
                this.$searchNext          = _$('a.amara-transcript-search-next', this.$transcriptHeaderRight);
                this.$searchPrev          = _$('a.amara-transcript-search-prev', this.$transcriptHeaderRight);

                this.$amaraLanguages     = _$('div.amara-languages',       this.$amaraTools);
                this.$amaraCurrentLang   = _$('a.amara-current-language',  this.$amaraLanguages);
                this.$amaraLanguagesList = _$('ul.amara-languages-list',   this.$amaraLanguages);

                this.$transcriptBody     = _$('div.amara-transcript-body',     this.$amaraTranscript);
                this.$autoScrollButton   = _$('a.amara-transcript-autoscroll', this.$amaraTranscript);
                this.$autoScrollOnOff    = _$('span', this.$autoScrollButton);
            },
            changeLanguage: function(e) {

                var that = this;
                var language = _$(e.target).data('language');

                this.loadSubtitles(language);
                this.$amaraLanguagesList.hide();
                return false;
            },
            loadSubtitles: function(language) {
                // If we've already fetched subtitles for this language, don't
                // fetch them again.
                var subtitleSets = this.model.subtitles.where({'language': language});
                var that = this;
                if (subtitleSets.length) {
                    this.setCurrentLanguage(language);
                } else {
                    this.fetchSubtitles(language, function() {
                        that.setCurrentLanguage(language);
                    });
                }
            },
            setCurrentLanguage: function(language) {
                this.buildTranscript(language);
                this.buildSubtitles(language);
                this.scrollTranscriptToCurrentTime();
                var subtitleSets = this.model.subtitles.where({'language': language});
                if (subtitleSets.length) {
                    var languageCode = subtitleSets[0].get('language');
                    var langaugeName = this.getLanguageNameForCode(languageCode);
                    this.$amaraCurrentLang.text(langaugeName);
                    // Show the expander triangle
                    this.$amaraCurrentLang.css('background-image', '');
                } else {
                    this.setCurrentLanguageMessage('');
                }
            },
            fetchSubtitles: function(language, callback) {
                // Make a call to the Amara API and retrieve a set of subtitles for a specific
                // video in a specific language. When we get a response, add the subtitle set
                // to the video model's 'subtitles' collection for later retrieval by language code.
                var that = this;

                var apiURL = ''+
                    'http://' + _amaraConf.baseURL + '/api2/partners/videos/' +
                    this.model.get('id') + '/languages/' + language + '/subtitles/';

                this.$amaraCurrentLang.text('Loading…');

                // Make a call to the Amara API to retrieve subtitles for this language.
                //
                // TODO: If we already have subtitles in this language, don't do anything.
                _$.ajax({
                    url: apiURL,
                    dataType: 'jsonp',
                    success: function(resp) {

                        // Save these subtitles to the video's 'subtitles' collection.

                        // TODO: Placeholder until we have the API return the language code.
                        resp.language = language;

                        // Sometimes the last subtitle may have no end time. Fix that.
                        var lastSub = resp.subtitles[resp.subtitles.length - 1];
                        if (lastSub.end === -1) {
                            lastSub.end = that.pop.duration();
                        }

                        that.model.subtitles.add(
                            new SubtitleSet(resp)
                        );

                        // Call the callback.
                        callback();
                    },
                    error: function() {
                        // We should handle errors better here, but simply
                        // invoking the callback works okay for now.
                        callback();
                    }
                });
            },
            getLanguageNameForCode: function(languageCode) {
                // TODO: This is a temporary utility function to grab a language's name from a language
                // code. We won't need this once we update our API to return the language name
                // with the subtitles.
                // See https://unisubs.sifterapp.com/projects/12298/issues/722972/comments
                var languages = this.model.get('languages');
                var language = __.find(languages, function(l) { return l.code === languageCode; });
                return language.name;
            },
            hideTranscriptContextMenu: function() {
                if (this.states.contextMenuActive) {

                    // Deselect the transcript line and remove the context menu.
                    this.$amaraTranscriptLines.removeClass('selected');
                    this.$amaraContextMenu.remove();

                }
            },
            languageButtonClicked: function() {
                this.$amaraLanguagesList.toggle();
                return false;
            },
            linkToTranscriptLine: function(line) {
                console.log(line.get(0));
                this.hideTranscriptContextMenu();
                return false;
            },
            pauseAutoScroll: function(isNowPaused) {

                var that = this;
                var previouslyPaused = this.states.autoScrollPaused;

                // If 'isNowPaused' is an object, it's because it was sent to us via
                // Backbone's event click handler.
                var fromClick = (typeof isNowPaused === 'object');

                // If the transcript plugin is triggering this scroll change, do not
                // pause the auto-scroll.
                if (this.states.autoScrolling && !fromClick) {
                    this.states.autoScrolling = false;
                    return false;
                }

                // If from clicking the "Auto-scroll" button, just toggle it.
                if (fromClick) {
                    isNowPaused = !this.states.autoScrollPaused;
                }

                // Switch the autoScrollPaused state on the view.
                this.states.autoScrollPaused = isNowPaused;

                // Update the Auto-scroll label in the transcript viewer.
                this.$autoScrollOnOff.text(isNowPaused ? 'OFF' : 'ON');

                // If we're no longer paused, scroll to the currently active subtitle.
                if (!isNowPaused) {
                    this.scrollTranscriptToCurrentTime();
                } else {

                    // If we're moving from a scrolling state to a paused state,
                    // highlight the auto-scroll button to indicate that we've changed
                    // states.
                    if (!previouslyPaused) {
                        this.$autoScrollButton.animate({
                            color: '#FF2C2C'
                        }, {
                            duration: 50,
                            easing: 'ease-in',
                            complete: function() {
                                that.$autoScrollButton.animate({
                                    color: '#9A9B9C'
                                }, 2000, 'ease-out');
                            }
                        });
                    }
                }
                
                return false;
            },
            autoScrollToLine: function(transcriptLine) {
                if (!this.states.autoScrollPaused) {
                    this.scrollToLine(transcriptLine);
                }
            },
            scrollToLine: function(transcriptLine) {
                // Scroll the transcript container to the line, and bring the
                // line to the center of the vertical height of the container.

                var $line = _$(transcriptLine);
                var $container = this.$transcriptBody;

                var lineTop = $line.offset().top - $container.offset().top;
                var lineHeight = $line.height();
                var containerHeight = $container.height();
                var oldScrollTop = $container.prop('scrollTop');
                // We need to tell our transcript tracking to ignore this
                // scroll change, otherwise our scrolling detector would
                // trigger the auto-scroll to stop.
                this.states.autoScrolling = true;
                $container.prop('scrollTop', oldScrollTop + lineTop -
                        (containerHeight / 2) + (lineHeight / 2));
            },
            scrollTranscriptToCurrentTime: function() {
                var currentTime = this.pop.currentTime() * 1000;
                // For each subtitle, init the Popcorn transcript plugin.
                for (var i = 0; i < this.subtitleLines.length; i++) {
                    var subtitleLine = this.subtitleLines[i];
                    if(subtitleLine.subtitle.start >= currentTime) {
                        this.scrollToLine(subtitleLine.line);
                        break;
                    }
                }
            },
            setCursorPosition: function(e) {
                this.cursorX = e.pageX;
                this.cursorY = e.pageY;
            },
            shareButtonClicked: function() {
                return false;
            },
            showTranscriptContextMenu: function(e) {

                var that = this;

                // Don't show the default context menu.
                e.preventDefault();

                // Remove the auto-selection that the browser does for some reason.
                window.getSelection().removeAllRanges();

                // Remove any existing context menus.
                this.hideTranscriptContextMenu();

                // Remove any previously selected line classes.
                this.$amaraTranscriptLines.removeClass('selected');

                // Signal that the line is selected.
                var $line = _$(e.target);
                $line.addClass('selected');

                // Create the context menu DOM.
                //
                // TODO: Use a sensible templating system. Everywhere.
                _$('body').append('' +
                        '<div class="amara-context-menu">' +
                        '    <ul>' +
                        '        <li>' +
                        '            <a class="amara-transcript-link-to-line" href="#">Link to this line</a>' +
                        '        </li>' +
                        '    </ul>' +
                        '</div>');

                this.$amaraContextMenu = _$('div.amara-context-menu');

                // Handle clicks.
                //_$('a', this.$amaraContextMenu).click(function() {
                    //that.linkToTranscriptLine($line);
                    //return false;
                //});

                // Don't let clicks inside the context menu bubble up.
                // Otherwise, the container listener will close the context menu.
                this.$amaraContextMenu.click(function(e) {
                    e.stopPropagation();
                });

                // Position the context menu near the cursor.
                this.$amaraContextMenu.css('top', this.cursorY + 11);
                this.$amaraContextMenu.css('left', this.cursorX + 6);

                // Set the state so we know we have an active context menu.
                this.states.contextMenuActive = true;

                return false;
            },
            toggleSubtitlesDisplay: function() {

                // TODO: This button needs to be disabled unless we have subtitles to toggle.
                this.$popSubtitlesContainer.toggle();
                this.$subtitlesButton.toggleClass('amara-button-enabled');
                return false;
            },
            toggleTranscriptDisplay: function() {

                // TODO: This button needs to be disabled unless we have a transcript to toggle.
                this.$amaraTranscript.toggle();
                this.$transcriptButton.toggleClass('amara-button-enabled');
                return false;
            },
            transcriptLineClicked: function(e) {
                this.hideTranscriptContextMenu();
                return false;
            },
            transcriptScrolled: function() {
                this.hideTranscriptContextMenu();
                this.pauseAutoScroll(true);
            },
            updateSearch: function() {
                var text = this.$search.val().trim();
                if(text != this.currentSearch) {
                    this.removeSearchSpans();
                    if(text) {
                        this.addSearchSpans(text);
                    }
                    this.currentSearch = text;
                    this.currentSearchIndex = 0;
                    this.currentSearchMatches = _$('span.highlight', this.$transcriptBody).length;
                    this.updateSearchCurrentMatch();
                }
                return false;
            },
            addSearchSpans: function(text) {
                var replacementText = '<span class="highlight">$1</span>';
                for(var i = 0; i < this.subtitleLines.length; i++) {
                    var line = this.subtitleLines[i].line;
                    var regex = new RegExp('(' + regexEscape(text) + ')', 'gi');
                    line.innerHTML = line.innerHTML.replace(regex,
                            replacementText);
                }
            },
            removeSearchSpans: function() {
                for(var i = 0; i < this.subtitleLines.length; i++) {
                    var line = this.subtitleLines[i].line;
                    var subtitle = this.subtitleLines[i].subtitle;
                    line.innerHTML = subtitle.text;
                }
            },
            moveSearchNext: function(evt) {
                this.currentSearchIndex = Math.min(this.currentSearchIndex + 1, this.currentSearchMatches - 1);
                this.updateSearchCurrentMatch();
                evt.preventDefault();
                return false;
            },
            moveSearchPrev: function(evt) {
                this.currentSearchIndex = Math.max(this.currentSearchIndex - 1, 0);
                this.updateSearchCurrentMatch();
                evt.preventDefault();
                return false;
            },
            updateSearchCurrentMatch: function() {
                if(this.currentSearchMatches > 0) {
                    this.showSearchArrows();
                } else {
                    this.hideSearchArrows();
                }
                if(this.currentSearchIndex == 0) {
                    this.$searchPrev.addClass('disabled');
                } else {
                    this.$searchPrev.removeClass('disabled');
                }
                if(this.currentSearchIndex == this.currentSearchMatches - 1) {
                    this.$searchNext.addClass('disabled');
                } else {
                    this.$searchNext.removeClass('disabled');
                }
                _$('span.current-highlight', this.$transcriptBody).removeClass('current-highlight');
                var that = this;
                _$('span.highlight', this.$transcriptBody)
                    .eq(this.currentSearchIndex)
                    .addClass('current-highlight')
                    .each(function(index, span) {
                        that.scrollToLine(span.parentElement);

                    });
            },
            showSearchArrows: function() {
                this.$searchNext.show();
                this.$searchPrev.show();
            },
            hideSearchArrows: function() {
                this.$searchNext.hide();
                this.$searchPrev.hide();
            },
            waitUntilVideoIsComplete: function(callback) {

                var that = this;

                // is_complete gets set as soon as the initial API call to build out the video
                // instance has finished.
                if (!this.model.get('is_complete')) {
                    setTimeout(function() { that.waitUntilVideoIsComplete(callback); }, 100);
                } else {
                    callback();
                }
            },

            templateHTML: '' +
                '<div class="amara-tools" style="width: {{ width }}px;">' +
                '    <div class="amara-bar amara-group">' +
                //'        <a href="#" class="amara-share-button amara-button"></a>' +
                '        <a href="{{ video_url }}" target="blank" class="amara-logo amara-button" title="View this video on Amara.org in a new window">Amara</a>' +
                '        <ul class="amara-displays amara-group">' +
                '            <li><a href="#" class="amara-transcript-button amara-button" title="Toggle transcript viewer"></a></li>' +
                '            <li><a href="#" class="amara-subtitles-button amara-button" title="Toggle subtitles"></a></li>' +
                '        </ul>' +
                '        <div class="amara-languages">' +
                '            <a href="#" class="amara-current-language">Loading&hellip;</a>' +
                '            <ul class="amara-languages-list"></ul>' +
                '        </div>' +
                '    </div>' +
                '    <div class="amara-transcript">' +
                '        <div class="amara-transcript-header amara-group">' +
                '            <div class="amara-transcript-header-left">' +
                '                <a class="amara-transcript-autoscroll" href="#">Auto-scroll <span>ON</span></a>' +
                '            </div>' +
                '            <div class="amara-transcript-header-right">' +
            '                    <input class="amara-transcript-search" placeholder="Search transcript" />' +
            '                    <a href="#" class="amara-transcript-search-next"></a>' +
            '                    <a href="#" class="amara-transcript-search-prev"></a>' +
                '            </div>' +
                '        </div>' +
                '        <div class="amara-transcript-body">' +
                '            <a href="#" class="amara-transcript-line">' +
                '                <span class="amara-transcript-line">' +
                '                    Loading transcript&hellip;' +
                '                </span>' +
                '            </a>' +
                '        </div>' +
                '    </div>' +
                '</div>'
        });

        // push() handles all action calls before and after the embedder is loaded.
        // Aside from init(), this is the only function that may be called from the
        // parent document.
        //
        // Must send push() an object with only two items:
        //     * Action  (string)
        //     * Options (object)
        //
        // Note: we don't use traditional function arguments because before the
        // embedder is loaded, _amara is just an array with a normal push() method.
        this.push = function(args) {
            
            // No arguments? Don't do anything.
            if (!arguments.length) { return; }

            // Must send push() an object with only two items.
            if (__.size(arguments[0]) === 2) {

                var action = args[0];
                var options = args[1];

                // If a method exists for this action, call it with the options.
                if (actions[action]) {
                    actions[action](options);
                }
            }

        };

        // init() gets called as soon as the embedder has finished loading.
        // Simply processes the existing _amara queue if we have one.
        this.init = function() {

            // Load the Amara CSS.
            var tag = document.getElementsByTagName('script')[0];
            var style = document.createElement('link');
            style.rel = 'stylesheet';
            style.type = 'text/css';

            style.href = _amaraConf.staticURL + 'release/public/embedder.css';
            tag.parentNode.insertBefore(style, tag);

            // Change the template delimiter for Underscore templates.
            __.templateSettings = { interpolate : /\{\{(.+?)\}\}/g };

            // If we have a queue from before the embedder loaded, process the actions.
            if (toPush) {
                for (var i = 0; i < toPush.length; i++) {
                    that.push(toPush[i]);
                }
                toPush = [];
            }

            // Check to see if we have any amara-embed's to initilize.
            var amaraEmbeds = _$('div.amara-embed');

            if (amaraEmbeds.length) {
                amaraEmbeds.each(function() {

                    var $div = _$(this);

                    // Call embedVideo with this div and URL.
                    that.push(['embedVideo', {
                        'div': this,
                        'initial_language': $div.data('initial-language'),
                        'url': $div.data('url')
                    }]);
                });
            }

        };

    };

    window._amara = new Amara();
    window._amara.init();

}(window, document));
