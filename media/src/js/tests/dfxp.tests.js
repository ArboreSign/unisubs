describe('DFXP', function() {

    var parser = new AmaraDFXPParser();
    var $ = AmarajQuery;

    describe('#init()', function() {
        it('should initialize a set of mock subtitles', function() {

            // Initialize the parser with a sample XML string.
            parser.init(sampleXmlString);

            // Our sample set of subtitles should contain 1,919 subtitles.
            expect(parser.getSubtitles().length).toBe(1919);

        });
        it('should convert DFXP-style formatting to Markdown', function() {
            // The very last subtitle has DFXP-style formatting that should've
            // been converted to Markdown.

            var lastSubtitle = parser.getLastSubtitle();
            var content = parser.content(lastSubtitle);

            expect(content).toBe('♪ [Touching **Evil** closing theme music] ♪');

        });
        it('should store two separate instances of XML', function() {
            // The original XML and the working XML should not be the same
            // object.

            expect(parser.$originalXml === parser.$xml).toBe(false);

        });
        it('should convert time expressions to milliseconds', function() {
            // If the parser is working correctly, it would have converted
            // '00:00::01.15' to '1150'.

            var firstSubtitle = parser.getFirstSubtitle();
            var startTime = parser.startTime(firstSubtitle);

            expect(startTime).toBe(1150);
        });
        it('should not have introduce differences between the original and working XML', function() {
            expect(parser.changesMade()).toBe(false);
        });
    });
    describe('#utils', function() {
        describe('.leftPad()', function() {
            it('should left-pad a number to the given width with the given char', function() {
                expect(parser.utils.leftPad(1, 2, 0)).toBe('01');
            });
        });
        describe('.millisecondsToTimeExpression()', function() {
            it('should convert milliseconds to a time expression', function() {

                // This utility function uses other utility functions, so it
                // must be scoped properly.
                expect(parser.utils.millisecondsToTimeExpression.call(parser, 1150))
                    .toBe('00:00:01,150');

            });
        });
        describe('.rightPad()', function() {
            it('should right-pad a number to the given width with the given char', function() {
                expect(parser.utils.rightPad(1, 2, 0)).toBe('10');
            });
        });
        describe('.timeExpressionToMilliseconds()', function() {
            it('should convert a time expression to milliseconds', function() {

                // This utility function uses other utility functions, so it
                // must be scoped properly.
                expect(parser.utils.timeExpressionToMilliseconds.call(parser, '00:00:01,150'))
                    .toBe(1150);

            });
        });
        describe('.xmlToString()', function() {
            it('should convert an XML document to a string', function() {

                var xml = $.parseXML('<rss><channel></channel></rss>');
                expect(parser.utils.xmlToString(xml)).toBe('<rss><channel/></rss>');

            });
        });
    });

    describe('#addSubtitle()', function() {
        it('should add a subtitle to the end of the list', function() {

            // Add a new subtitle.
            parser.addSubtitle(null, null, 'A new subtitle at the end.');

            // Get the last subtitle in the list.
            var lastSubtitle = parser.getLastSubtitle();

            expect(parser.content(lastSubtitle)).toBe('A new subtitle at the end.');

            // Expect that changes have now been made to the working copy;
            expect(parser.changesMade()).toBe(true);

        });
        it('should add a subtitle with a begin and end pre-set', function() {

            // Add a new subtitle with a begin and end pre-set.
            parser.addSubtitle(null, {'begin': 1150, 'end': 1160}, 'New subtitle with timing.');

            // Get the last subtitle in the list.
            var lastSubtitle = parser.getLastSubtitle();

            expect(parser.startTime(lastSubtitle)).toBe(1150);
            expect(parser.endTime(lastSubtitle)).toBe(1160);
            expect(parser.content(lastSubtitle)).toBe('New subtitle with timing.');

        });
        it('should add a subtitle after a given subtitle', function() {

            // Add a new subtitle after the first subtitle, with content and
            // begin/end attrs pre-set.
            var newSubtitle = parser.addSubtitle(0,
                {'begin': 1160, 'end': 1170},
                'New subtitle with timing, after the first subtitle.');

            // Get the second subtitle in the list.
            var secondSubtitle = parser.getSubtitle(1).get(0);

            expect(secondSubtitle).toBe(newSubtitle);
            expect(parser.startTime(secondSubtitle)).toBe(1160);
            expect(parser.endTime(secondSubtitle)).toBe(1170);
            expect(parser.content(secondSubtitle)).toBe('New subtitle with timing, after the first subtitle.');

        });
        it('should add a subtitle with blank content if we pass null', function() {

            // Add a new subtitle with 'null' content.
            var newSubtitle = parser.addSubtitle(null, null, null);

            // Get the last subtitle in the list.
            var lastSubtitle = parser.getLastSubtitle();

            expect(parser.content(lastSubtitle)).toBe('');

        });
    });
    describe('#changesMade()', function() {
        it('should indicate that changes have been made', function() {
            // We've made changes previously, so changesMade() should reflect that,
            // now.

            expect(parser.changesMade()).toBe(true);

        });
    });
    describe('#clearAllContent()', function() {
        it('should clear text content from every subtitle', function() {

            // Wipe 'em out.
            parser.clearAllContent();

            // Get all of the subtitles.
            var $subtitles = parser.getSubtitles();

            // Every subtitle's text() value should be an empty string.
            for (var i = 0; i < $subtitles.length; i++) {
                expect($subtitles.eq(i).text()).toBe('');
            }

        });
        it('should not affect subtitle attributes', function() {

            var firstSubtitle = parser.getFirstSubtitle();
            expect(parser.startTime(firstSubtitle)).toNotBe(-1);

        });
    });
    describe('#clearAllTimes()', function() {
        it('should clear timing data from every subtitle', function() {

            // Wipe 'em out.
            parser.clearAllTimes();

            // Get all of the subtitles.
            var $subtitles = parser.getSubtitles();

            // Every subtitle's timing data should be empty.
            for (var i = 0; i < $subtitles.length; i++) {
                var $subtitle = $subtitles.eq(i);
                var startTime = $subtitle.attr('begin');
                var endTime = $subtitle.attr('end');

                // Verify that they've been emptied.
                expect(startTime).toBe('');
                expect(endTime).toBe('');
            }

        });
    });
    describe('#clone()', function() {
        it('should clone this parser and preserve subtitle text', function() {

            // Add a new subtitle with text, since we blew it all away
            // in a previous test.
            parser.addSubtitle(null, null, 'Some text.');

            // Get the last subtitle of the old parser.
            var lastSubtitleOfOldParser = parser.getLastSubtitle();

            // Expect the content to be what we just set it as.
            expect(parser.content(lastSubtitleOfOldParser)).toBe('Some text.');

            // Clone the parser.
            var newParser = parser.clone(true);

            // Get the last subtitle of the cloned parser.
            var lastSubtitleOfNewParser = newParser.getLastSubtitle();

            // Expect the last subtitle of the cloned parser to have the same
            // content as the last subtitle of the old parser.
            expect(newParser.content(lastSubtitleOfNewParser)).toBe('Some text.');

        });
        it('should clone this parser and discard subtitle text', function() {

            // Get the last subtitle of the old parser.
            var lastSubtitleOfOldParser = parser.getLastSubtitle();

            // Expect the content to be what we just set it as.
            expect(parser.content(lastSubtitleOfOldParser)).toBe('Some text.');

            // Clone the parser, this time discarding text.
            var newParser = parser.clone();

            // Get the last subtitle of the cloned parser.
            var lastSubtitleOfNewParser = newParser.getLastSubtitle();

            // Expect the last subtitle of the cloned parser to have the same
            // content as the last subtitle of the old parser.
            expect(newParser.content(lastSubtitleOfNewParser)).toBe('');

        });
    });
    describe('#content()', function() {
        it('should set text content of a subtitle', function() {

            // Get the last subtitle in the list.
            var lastSubtitle = parser.getLastSubtitle();

            parser.content(lastSubtitle, 'Some new text.');

            expect(parser.content(lastSubtitle)).toBe('Some new text.');
        });
        it('should retrieve text content of a subtitle', function() {

            // Get the last subtitle. In the previous test, we changed the
            // content of the last subtitle.
            var lastSubtitle = parser.getLastSubtitle();

            expect(parser.content(lastSubtitle)).toBe('Some new text.');
        });
    });
    describe('#contentRendered()', function() {
        it('should return the rendered HTML content of the subtitle', function() {

            // First, create a subtitle with Markdown formatting.
            var newSubtitle = parser.addSubtitle(null, null, 'Hey **guys!**');

            // The rendered content of this new subtitle should be converted to
            // HTML.
            expect(parser.contentRendered(newSubtitle)).toBe('Hey <b>guys!</b>');

        });
    });
    describe('#convertTimes()', function() {
        it('should convert times from milliseconds to time expressions', function() {

            // Get the first subtitle.
            var firstSubtitle = parser.getFirstSubtitle();

            // Set the first subtitle's time to 1150.
            parser.startTime(firstSubtitle, 1150);

            // Verify that the new start time is correct.
            expect(parser.startTime(firstSubtitle)).toBe(1150);

            // Convert all subtitles to time expressions.
            parser.convertTimes('timeExpression', parser.getSubtitles());

            // New start time should be '00:00:01,150'.
            expect($(parser.getFirstSubtitle()).attr('begin')).toBe('00:00:01,150');

        });
        it('should convert times from time expressions to milliseconds', function() {

            // Get the first subtitle.
            var firstSubtitle = parser.getFirstSubtitle();

            // Convert times back to milliseconds.
            parser.convertTimes('milliseconds', parser.getSubtitles());

            // Verify that the new start time is correct.
            expect(parser.startTime(firstSubtitle)).toBe(1150);

        });
    });
    describe('#dfxpToMarkdown()', function() {
        it('should convert DFXP-style formatting to Markdown syntax', function() {

            // Create a new node with blank text (we have to set it later).
            var newSubtitle = parser.addSubtitle(null, null, '');
            var $newSubtitle = $(newSubtitle);

            // Replace the node's text with a DFXP-style formatted node.
            $newSubtitle.append($('<span fontweight="bold">I be bold.</span>'));

            // Verify that we have DFXP-style formatting to convert.
            expect(parser.content(newSubtitle)).toBe('<span fontweight="bold">I be bold.</span>');

            // Replace the subtitle's content in-place with Markdown.
            parser.dfxpToMarkdown(newSubtitle);

            // Verify.
            expect(parser.content(newSubtitle)).toBe('**I be bold.**');
        });
    });
    describe('#endTime()', function() {
        it('should get the current end time for a subtitle', function() {

            // Create a new subtitle with a specific end time.
            var newSubtitle = parser.addSubtitle(null, {'end': 1234}, '');

            // Verify.
            expect(parser.endTime(newSubtitle)).toBe(1234);
        });
        it('should set the end time for a subtitle', function() {

            // Create a new subtitle with no end time.
            var newSubtitle = parser.addSubtitle(null, null, '');

            // The end time should be null.
            expect(parser.endTime(newSubtitle)).toBe(-1);

            // Set the end time.
            parser.endTime(newSubtitle, 2345);

            // Verify the new end time.
            expect(parser.endTime(newSubtitle)).toBe(2345);
        });
    });
    describe('#getFirstSubtitle()', function() {
        it('should retrieve the first subtitle in the list', function() {

            // Get the first subtitle by using zero-index on the subtitle list.
            var firstSubtitle = parser.getSubtitles().get(0);

            // Get the first subtitle by using getFirstSubtitle().
            var firstSubtitleFromParser = parser.getFirstSubtitle();

            // Verify.
            expect(firstSubtitleFromParser).toBe(firstSubtitle);
        });
    });
    describe('#getLastSubtitle()', function() {
        it('should retrieve the last subtitle in the list', function() {

            // Get the last subtitle by using zero-index on the subtitle list.
            var lastSubtitle = parser.getSubtitles().get(parser.subtitlesCount() - 1);

            // Get the last subtitle by using getLastSubtitle().
            var lastSubtitleFromParser = parser.getLastSubtitle();

            // Verify.
            expect(lastSubtitleFromParser).toBe(lastSubtitle);
        });
    });
    describe('#getNextSubtitle()', function() {
        it('should retrieve the next subtitle in the list', function() {

            // Get the second subtitle by using zero-index on the subtitle list.
            var nextSubtitle = parser.getSubtitles().get(1);

            // Get the next subtitle by using getNextSubtitle() and passing it
            // the first subtitle.
            var nextSubtitleFromParser = parser.getNextSubtitle(parser.getFirstSubtitle());

            // Verify.
            expect(nextSubtitleFromParser).toBe(nextSubtitle);
        });
    });
    describe('#getNonBlankSubtitles()', function() {
        it('should return all subtitles that have content', function() {

            // Get all non-blank subtitles.
            var $nonBlankSubtitles = parser.getNonBlankSubtitles();

            for (var i = 0; i < $nonBlankSubtitles.length; i++) {

                var $nonBlankSubtitle = $nonBlankSubtitles.eq(i);

                // Verify that this subtitle is not blank.
                expect($nonBlankSubtitle.text()).toNotBe('');
            }
        });
    });
    describe('#getPreviousSubtitle()', function() {
        it('should retrieve the previous subtitle in the list', function() {

            // Get the first subtitle.
            var firstSubtitle = parser.getFirstSubtitle();

            // Get the second subtitle.
            var secondSubtitle = parser.getNextSubtitle(firstSubtitle);

            // Get the previous subtitle for the first subtitle.
            var previousSubtitle = parser.getPreviousSubtitle(secondSubtitle);

            // Verify.
            expect(previousSubtitle).toBe(firstSubtitle);
        });
    });
    describe('#getSubtitleIndex()', function() {
        it('should retrieve the index of the given subtitle', function() {
            
            // The first subtitle's index should be '0'.
            expect(parser.getSubtitleIndex(parser.getFirstSubtitle())).toBe(0);

        });
    });
    describe('#getSubtitle()', function() {
        it('should retrieve the subtitle based on the index given', function() {

            var firstSubtitle = parser.getSubtitle(0);
            var $subtitles = parser.getSubtitles();

            // It should be the first subtitle in the node list.
            expect($subtitles.get(0)).toBe(firstSubtitle.get(0));

        });
        it('should retrieve the subtitle based on a given node', function() {
            // This helps us streamline the process by which we retrieve
            // subtitles. If you pass along a node, we'll simply return the
            // jQuery selection of that node.

            var $subtitles = parser.getSubtitles();
            var firstSubtitleNode = $subtitles.eq(0).get(0);
            var retrievedSubtitleNode = parser.getSubtitle(firstSubtitleNode).get(0);

            // The retrieved subtitle's node should be the same as the first
            // subtitle's node.
            expect(retrievedSubtitleNode).toBe(firstSubtitleNode);
        });
    });
    describe('#getSubtitles()', function() {
        it('should retrieve the current set of subtitles', function() {

            // Just make sure that the subtitles count matches up.
            expect(parser.getSubtitles().length).toBe(parser.subtitlesCount());

        });
    });
    describe('#isShownAt()', function() {
        it('should determine whether the given subtitle should be displayed at the given time', function() {

            // Create a new subtitle with a given start and end time.
            var newSubtitle = parser.addSubtitle(null, {'begin': 1499, 'end': 1501}, null);

            expect(parser.isShownAt(newSubtitle, 1500)).toBe(true);

        });
    });
    describe('#markdownToDFXP()', function() {
        it('should convert Markdown syntax to DFXP-style formatting', function() {

            // Create a new node with Markdown syntax.
            var newSubtitle = parser.addSubtitle(null, null, '**I be bold.**');
            var $newSubtitle = $(newSubtitle);

            // Convert the Markdown to DFXP.
            var dfxpText = parser.markdownToDFXP($newSubtitle.text());

            // Empty out the subtitle's text.
            $newSubtitle.text('');

            // Replace the node's text with the DFXP node.
            $newSubtitle.append($(dfxpText));

            // Verify that the text was replaced properly.
            expect(parser.content(newSubtitle)).toBe('<span fontweight="bold">I be bold.</span>');
        });
    });
    describe('#needsAnySynced()', function() {
        it('should confirm all subtitles are synced', function() {

            // Get all of the subtitles.
            var $subtitles = parser.getSubtitles();

            // Set the begin and end attrs for all subtitles.
            $subtitles.attr({'begin': 100, 'end': 150});

            // No subtitles should need syncing.
            expect(parser.needsAnySynced()).toBe(false);

        });
        it('should tell us when subtitles need syncing', function() {

            // Add a new subtitle without timing information.
            parser.addSubtitle(null, null, null);

            // We now need syncing.
            expect(parser.needsAnySynced()).toBe(true);
        });
    });
    describe('#needsAnyTranscribed()', function() {
        it('should confirm no subtitles need transcription', function() {

            // Get all of the subtitles.
            var $subtitles = parser.getSubtitles();

            // Set the begin and end attrs for all subtitles.
            $subtitles.text('Mock content');

            // No subtitles should need transcription.
            expect(parser.needsAnyTranscribed()).toBe(false);

        });
        it('should tell us when subtitles need transcription', function() {

            // Create a new subtitle with no content.
            parser.addSubtitle(null, null, null);

            // We need transcription, now.
            expect(parser.needsAnyTranscribed()).toBe(true);
        });
    });
    describe('#needsSyncing()', function() {
        it('should tell us a subtitle needs syncing without a begin time', function() {

            // Create a new subtitle with start time set.
            var newSubtitle = parser.addSubtitle(null, {'end': 1500});

            expect(parser.needsSyncing(newSubtitle)).toBe(true);

        });
        it('should tell us a subtitle needs syncing without an end time', function() {

            // Create a new subtitle with start time set.
            //
            // We have to put this subtitle at the beginning, because subtitles at
            // the end are allowed to not have an end time.
            var newSubtitle = parser.addSubtitle(1, {'begin': 1500});

            expect(parser.needsSyncing(newSubtitle)).toBe(true);

        });
        it('should tell us a subtitle does not need syncing with timing set', function() {

            // Create a new subtitle with start and end times set.
            var newSubtitle = parser.addSubtitle(1, {'begin': 1500, 'end': 1700});

            expect(parser.needsSyncing(newSubtitle)).toBe(false);

        });
        it('should tell us an end subtitle does not need syncing without an end time', function() {

            // Create a new subtitle with start time set.
            var newSubtitle = parser.addSubtitle(null, {'begin': 1500});

            // Subtitles at the end of the subtitle list are not required to have an end
            // time.
            expect(parser.needsSyncing(newSubtitle)).toBe(false);

        });
    });

    describe('#startTime()', function() {
        it('should get the current start time for a subtitle', function() {

            // Create a new subtitle with a specific start time.
            var newSubtitle = parser.addSubtitle(null, {'begin': 1234}, '');

            // Verify.
            expect(parser.startTime(newSubtitle)).toBe(1234);
        });
        it('should set the start time for a subtitle', function() {

            // Create a new subtitle with no start time.
            var newSubtitle = parser.addSubtitle(null, null, '');

            // The start time should be null.
            expect(parser.startTime(newSubtitle)).toBe(-1);

            // Set the start time.
            parser.startTime(newSubtitle, 2345);

            // Verify the new start time.
            expect(parser.startTime(newSubtitle)).toBe(2345);
        });
    });
});
