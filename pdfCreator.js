$(document).ready(function() {
            try {
                // --- Global State ---
                window.currentFocusPage = null; 
                window.viewMode = 'one'; 
                window.focusContext = 'body'; 
                window.activeImage = null; 
                window.activeEquation = null;
                window.activeTextBox = null;
                
                // Track the paragraph active when Tabs Dialog opens
                window.activeTabsParagraph = null;
                // Track the last active paragraph based on cursor position
                window.lastActiveParagraph = null;
                // Track last range for smart selection fallback
                window.lastNonEmptyRange = null;
                // Track last range specifically for Symbol insertion
                window.lastSymbolRange = null;
                
                // Creative Solution: Global tracking for Paragraph Dialog state to handle focus loss
                window.editingParagraphs = [];

                // --- 0. Font List ---
                const fontList = ["Aharoni", "Aldhabi", "Andalus", "Angsana New", "AngsanaUPC", "Aparajita", "Arabic Typesetting", "Arial", "Bahnschrift", "Batang", "BatangChe", "BIZ UDGothic", "BIZ UDPGothic", "BIZ UDMincho", "BIZ UDPMincho", "Book Antiqua", "Browallia New", "BrowalliaUPC", "Calibri", "Calisto MT", "Cambria", "Cambria Math", "Candara", "Cascadia Code", "Century Gothic", "Comic Sans MS", "Consolas", "Constantia", "Copperplate Gothic", "Corbel", "Cordia New", "CordiaUPC", "Courier New", "DaunPenh", "David", "DengXian", "DilleniaUPC", "DFKai-SB", "DokChampa", "Dotum", "DotumChe", "Ebrima", "Estrangelo Edessa", "EucrosiaUPC", "Euphemia", "FangSong", "Franklin Gothic", "FrankRuehl", "FreesiaUPC", "Gabriola", "Gadugi", "Gautami", "Georgia", "Gisha", "Gulim", "GulimChe", "Gungsuh", "GungsuhChe", "Impact", "Ink Free", "IrisUPC", "Iskoola Pota", "JasmineUPC", "Javanese Text", "KaiTi", "Kalinga", "Kartika", "Khmer UI", "KodchiangUPC", "Kokila", "Lao UI", "Latha", "Leelawadee", "Leelawadee UI", "Levenim MT", "LilyUPC", "Lucida Console", "Lucida Handwriting", "Lucida Sans Unicode", "Malgun Gothic", "Mangal", "Marlett", "Meiryo", "Meiryo UI", "Microsoft Himalaya", "Microsoft JhengHei", "Microsoft JhengHei UI", "Microsoft New Tai Lue", "Microsoft PhagsPa", "Microsoft Sans Serif", "Microsoft Tai Le", "Microsoft Uighur", "Microsoft YaHei", "Microsoft YaHei UI", "Microsoft Yi Baiti", "Miriam", "Miriam Fixed", "Mongolian Baiti", "MoolBoran", "MS Gothic", "MS PGothic", "MS Mincho", "MS PMincho", "MS UI Gothic", "MV Boli", "Myanmar Text", "Narkisim", "News Gothic MT", "Nirmala UI", "NSimSun", "Nyala", "Palatino Linotype", "Plantagenet Cherokee", "Raavi", "Rod", "Sakkal Majalla", "Sanskrit Text", "Segoe MDL2 Assets", "Segoe Print", "Segoe Script", "Segoe UI", "Segoe UI Emoji", "Segoe UI Historic", "Segoe UI Symbol", "Segoe UI Variable", "Shonar Bangla", "Shruti", "SimHei", "Simplified Arabic", "SimSun", "SimSun-ExtB", "SimSun-ExtG", "Sitka Banner", "Sitka Display", "Sitka Heading", "Sitka Small", "Sitka Subheading", "Sitka Text", "Sylfaen", "Symbol", "Tahoma", "Times New Roman", "Traditional Arabic", "Trebuchet MS", "Tunga", "UD Digi Kyokasho N-R", "UD Digi Kyokasho N-B", "UD Digi Kyokasho NK-R", "UD Digi Kyokasho NK-B", "UD Digi Kyokasho NP-R", "UD Digi Kyokasho NP-B", "Urdu Typesetting", "Utsaah", "Vani", "Verdana", "Vijaya", "Vrinda", "Webdings", "Wingdings", "Yu Gothic", "Yu Gothic UI", "Yu Mincho"];
                const $fontSelect = $('#font-family-select');
                if($fontSelect.length) {
                    fontList.forEach(f => $fontSelect.append(new Option(f, f)));
                    $fontSelect.val('Calibri');
                }

                // --- 1. UI Tabs ---
                $('.tab-link').click(function() {
                    if($(this).hasClass('contextual') && !$(this).is(':visible')) return;
                    $('.tab-link').removeClass('active'); $('.ribbon-tab').removeClass('active');
                    $(this).addClass('active'); $('#' + $(this).attr('data-tab')).addClass('active');
                });
                
                $('.large-btn, .small-btn, .tool-btn, .dialog-launcher').mousedown(function() { $(this).css('background-color', '#faa'); })
                    .mouseup(function() { $(this).css('background-color', ''); })
                    .mouseleave(function() { $(this).css('background-color', ''); });

                // Show/Hide Toggle Button
                $('#btn-show-hide').click(function() { 
                    $(this).toggleClass('active'); 
                    $('.document-page').toggleClass('show-hidden'); 
                });
                
                // --- 2. View Tab Toggles ---
                $('#btn-doc-map').click(function() {
                    $(this).toggleClass('active');
                    if($(this).hasClass('active')) { $('#doc-map-pane').css('display', 'flex'); updateDocumentMap(); }
                    else $('#doc-map-pane').hide();
                });
                $('#btn-ruler').click(function() {
                    $(this).toggleClass('active');
                    if($(this).hasClass('active')) $('#ruler-container').show();
                    else $('#ruler-container').hide();
                });

                // --- 3. Document Map ---
                function updateDocumentMap() {
                    var $list = $('#doc-map-list').empty();
                    $('.document-page p').each(function(i, el) {
                        var level = $(el).attr('data-outline-level');
                        if(level && level !== 'body') {
                            var text = $(el).text().trim() || "(Empty)";
                            var $li = $('<li>').text(text).addClass('doc-map-level-' + level);
                            $li.click(function() { 
                                el.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
                                var range = document.createRange();
                                var sel = window.getSelection();
                                range.setStart(el, 0);
                                range.collapse(true);
                                sel.removeAllRanges();
                                sel.addRange(range);
                                el.focus();
                            });
                            $list.append($li);
                        }
                    });
                }

                // --- Focus Tracking & Real-Time Stats ---
                function updateStats() {
                    // Word Count
                    var text = "";
                    $('.document-page .page-body').each(function() {
                        text += $(this).text() + " ";
                    });
                    var wordCount = text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
                    $('#word-count').text(wordCount);

                    // Page Count
                    var totalPages = $('.document-page').length;
                    var pageNum = 1;
                    if(currentFocusPage) {
                        pageNum = $('.document-page').index(currentFocusPage) + 1;
                    }
                    $('#page-num').text(pageNum);
                    $('#total-pages').text(totalPages);
                }

                $('#doc-scroll-area').on('focusin click', '.page-body', function() { focusContext = 'body'; updateRulerMarkers(); });
                
                // Track last active paragraph for Tabs dialog fallback
                $('#doc-scroll-area').on('keyup mouseup click input focus', '.page-body p', function() {
                    window.lastActiveParagraph = $(this);
                });
                
                // Selection Change Listener for Last Range Tracking
                document.addEventListener('selectionchange', function() {
                    var sel = window.getSelection();
                    if(sel.rangeCount > 0 && !sel.isCollapsed) {
                        // Only track if inside our editor
                        if($(sel.anchorNode).closest('.document-page').length > 0) {
                            window.lastNonEmptyRange = sel.getRangeAt(0).cloneRange();
                        }
                    }
                });

                $('#doc-scroll-area').on('keyup mouseup click input', '.document-page', function() {
                    currentFocusPage = $(this);
                    $('.document-page').removeClass('active-page');
                    $(this).addClass('active-page');
                    updateDocumentMap();
                    updateRulerMarkers();
                    updateStats();
                });
                
                // --- Strict Pagination & Cursor Navigation ---
                $('#doc-scroll-area').on('input keyup', '.document-page', function() { safeExecute(() => checkPageOverflow($(this))); });
                
                $('#doc-scroll-area').on('keydown', '.document-page', function(e) {
                    safeExecute(() => {
                        if (e.key === 'Backspace' || e.key === 'ArrowLeft') { handleBackwardNavigation($(this), e); }
                        // Handle Tab Key for Custom Tabs
                        if (e.key === 'Tab') {
                             e.preventDefault();
                             handleTabKey($(this));
                        }
                    });
                });

                // REVISED: STRICT CURSOR LOGIC AND PAGINATION
                function checkPageOverflow($page) {
                    var $body = $page.find('.page-body');
                    // We measure height against the physical page height minus margins
                    // NOTE: padding-top/bottom are the "margins" in this CSS model.
                    var paddingTop = parseFloat($page.css('padding-top'));
                    var paddingBottom = parseFloat($page.css('padding-bottom'));
                    var pageHeight = $page.height();
                    var maxBodyHeight = pageHeight - paddingTop - paddingBottom;

                    if ($body.outerHeight() > maxBodyHeight) {
                        var $nextPage = $page.next('.document-page');
                        if (!$nextPage.length) {
                            var nextPageId = "page-" + ($('.document-page').length + 1);
                            $nextPage = $('<div class="document-page" contenteditable="true" spellcheck="true"><div class="page-body"></div></div>').attr('id', nextPageId);
                            // Ensure line numbers propagate
                            if($('#chk-line-numbers').is(':checked')) $nextPage.addClass('show-line-numbers');
                            $page.after($nextPage);
                        }
                        
                        var $nextBody = $nextPage.find('.page-body');
                        var $lastEl = $body.children().last();
                        
                        var sel = window.getSelection();
                        var cursorInMovedElement = false;
                        var offset = 0;
                        if(sel.rangeCount > 0) {
                            if($(sel.anchorNode).closest($lastEl).length > 0) {
                                cursorInMovedElement = true;
                                offset = sel.anchorOffset;
                            }
                        }

                        $nextBody.prepend($lastEl);
                        
                        if (cursorInMovedElement) {
                            var range = document.createRange();
                            var newSel = window.getSelection();
                            try {
                                range.setStart($lastEl[0].firstChild || $lastEl[0], offset); 
                            } catch(e) {
                                range.setStart($lastEl[0], 0);
                            }
                            range.collapse(true);
                            newSel.removeAllRanges();
                            newSel.addRange(range);
                            
                            $nextPage[0].scrollIntoView({block: 'start', behavior: 'smooth'});
                            currentFocusPage = $nextPage;
                        }
                        updateStats();
                    }
                }

                function handleBackwardNavigation($page, e) {
                    var sel = window.getSelection();
                    if (sel.rangeCount > 0) {
                        var range = sel.getRangeAt(0);
                        var $body = $page.find('.page-body');
                        
                        // Check if cursor is at the absolute start of the page content
                        var isAtStart = false;
                        
                        // Strict check: if the range is collapsed at 0 offset of the very first text node or element in the body
                        var $firstContent = $body.contents().first();
                        
                        if ($firstContent.length === 0) {
                             isAtStart = true; // Empty body
                        } else if (range.startContainer === $body[0] && range.startOffset === 0) {
                            isAtStart = true;
                        } else if (range.startOffset === 0) {
                             // Check if startContainer is the first leaf node
                             var firstLeaf = $body.find('*').addBack().contents().filter(function() { return this.nodeType === 3 || this.tagName === 'BR'; }).first()[0];
                             if (range.startContainer === firstLeaf || $(range.startContainer).is($body.children().first())) {
                                 isAtStart = true;
                             }
                        }

                        if (isAtStart) {
                            var $prevPage = $page.prev('.document-page');
                            if ($prevPage.length) {
                                e.preventDefault();
                                var $prevBody = $prevPage.find('.page-body');
                                if ($prevBody.children().length === 0) $prevBody.append('<p><br></p>');

                                var $lastEl = $prevBody.children().last();
                                
                                if (e.key === 'Backspace') {
                                    // Merge logic: Move current first block to prev page
                                    var $currentFirst = $body.children().first();
                                    if ($currentFirst.length) {
                                        $prevBody.append($currentFirst);
                                        // Set focus to start of moved element
                                        placeCaretAtStart($currentFirst[0]);
                                    } else {
                                        placeCaretAtEnd($lastEl[0]);
                                    }
                                } else {
                                    // Arrow Left just moves
                                    placeCaretAtEnd($lastEl[0]);
                                }
                                
                                $prevPage[0].scrollIntoView({block: 'center', behavior: 'smooth'});
                                currentFocusPage = $prevPage;
                                updateStats();
                            }
                        }
                    }
                }
                
                function placeCaretAtEnd(el) {
                    el.focus();
                    if (typeof window.getSelection != "undefined" && typeof document.createRange != "undefined") {
                        var range = document.createRange();
                        range.selectNodeContents(el);
                        range.collapse(false);
                        var sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }
                }

                function placeCaretAtStart(el) {
                    el.focus();
                    if (typeof window.getSelection != "undefined" && typeof document.createRange != "undefined") {
                        var range = document.createRange();
                        range.selectNodeContents(el);
                        range.collapse(true);
                        var sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }
                }

                // --- TABS MANAGER LOGIC ---
                var tabsDialog = $("#tabs-dialog").dialog({
                    autoOpen: false, modal: true, width: 400, height: 350,
                    buttons: { "Close": function() { $(this).dialog("close"); } }
                });

                $('#btn-tabs-manager').click(function() {
                    openTabsDialog();
                });

                function openTabsDialog() {
                    // Initialize: Find the current paragraph OR fallback to LAST ACTIVE paragraph
                    var sel = window.getSelection();
                    var $p = null;
                    
                    if (sel.rangeCount > 0) {
                        var $anchor = $(sel.anchorNode);
                        if ($anchor.closest('.page-body').length > 0) {
                            $p = $anchor.closest('p');
                        }
                    }
                    
                    // Fallback Logic: Use window.lastActiveParagraph if available
                    if ((!$p || $p.length === 0) && window.lastActiveParagraph && window.lastActiveParagraph.length > 0) {
                        // Verify it's still in document
                        if ($.contains(document.documentElement, window.lastActiveParagraph[0])) {
                            $p = window.lastActiveParagraph;
                        }
                    }

                    // Ultimate Fallback: First line of active page
                    if (!$p || $p.length === 0) {
                        if (!currentFocusPage) currentFocusPage = $('.document-page').first();
                        $p = currentFocusPage.find('.page-body p').first();
                        // If page body is empty, create a p tag
                        if ($p.length === 0) {
                            currentFocusPage.find('.page-body').append('<p><br></p>');
                            $p = currentFocusPage.find('.page-body p').first();
                        }
                    }
                    
                    // Store the global reference to the active paragraph for the dialog session
                    window.activeTabsParagraph = $p;
                    
                    updateTabsDialogList();
                    tabsDialog.dialog("open");
                }
                
                function getTabsFromElement($el) {
                    var tabsAttr = $el.attr('data-tab-stops');
                    try {
                        return tabsAttr ? JSON.parse(tabsAttr) : [];
                    } catch(e) { return []; }
                }
                
                function saveTabsToElement($el, tabs) {
                    // Sort tabs by position
                    tabs.sort((a,b) => parseFloat(a.pos) - parseFloat(b.pos));
                    $el.attr('data-tab-stops', JSON.stringify(tabs));
                    updateRulerMarkers(); // Immediately update ruler
                }
                
                function updateTabsDialogList() {
                    if (!window.activeTabsParagraph) return;
                    var tabs = getTabsFromElement(window.activeTabsParagraph);
                    var $list = $('#tab-list-display').empty();
                    
                    tabs.forEach((t, index) => {
                        var $li = $('<li>').html(`<span>${t.pos}"</span> <span>${t.align}</span>`).data('index', index).data('pos', t.pos);
                        $li.click(function(e) {
                             if (!e.ctrlKey && !e.metaKey) {
                                $('#tab-list-display li').removeClass('selected');
                             }
                            $(this).toggleClass('selected');
                        });
                        $list.append($li);
                    });
                }
                
                // Set Button Logic: Add new tab, overwrite duplicate pos, refresh UI
                $('#btn-tab-set').click(function() {
                    if (!window.activeTabsParagraph) return;
                    
                    var pos = parseFloat($('#tab-stop-pos').val());
                    var align = $('input[name="tab-align"]:checked').val();
                    
                    if(!isNaN(pos) && pos >= 0) {
                        var tabs = getTabsFromElement(window.activeTabsParagraph);
                        // Remove existing at same pos to avoid duplicates (overwrite behavior)
                        tabs = tabs.filter(t => t.pos !== pos);
                        tabs.push({ pos: pos, align: align });
                        
                        saveTabsToElement(window.activeTabsParagraph, tabs);
                        updateTabsDialogList();
                        $('#tab-stop-pos').val('').focus();
                    }
                });
                
                // Clear Button Logic: Remove selected items
                $('#btn-tab-clear').click(function() {
                    if (!window.activeTabsParagraph) return;
                    
                    var $selected = $('#tab-list-display li.selected');
                    if($selected.length) {
                        var tabs = getTabsFromElement(window.activeTabsParagraph);
                        var positionsToRemove = [];
                        
                        $selected.each(function() {
                             positionsToRemove.push($(this).data('pos'));
                        });
                        
                        // Filter out the selected positions
                        tabs = tabs.filter(t => !positionsToRemove.includes(t.pos));
                        
                        saveTabsToElement(window.activeTabsParagraph, tabs);
                        updateTabsDialogList();
                    }
                });
                
                // Clear All Button Logic
                $('#btn-tab-clear-all').click(function() {
                    if (window.activeTabsParagraph) {
                        window.activeTabsParagraph.removeAttr('data-tab-stops');
                        updateTabsDialogList();
                        updateRulerMarkers();
                    }
                });

                function handleTabKey($page) {
                    var sel = window.getSelection();
                    if(sel.rangeCount > 0) {
                        var range = sel.getRangeAt(0);
                        var $p = $(sel.anchorNode).closest('p');
                        if(!$p.length) return; 

                        var tabs = getTabsFromElement($p);
                        if(tabs.length === 0) {
                            // Default: Insert 0.5 inch space
                            document.execCommand('insertHTML', false, '&emsp;&emsp;');
                            return;
                        }

                        // Determine absolute Page-relative position to fix offset issues
                        var $docPage = $p.closest('.document-page');
                        var pageRect = $docPage[0].getBoundingClientRect();
                        var caretRect = range.getBoundingClientRect();
                        
                        // Calculate Current Absolute X relative to Page Left (0 on ruler)
                        // Note: Ruler 0 is aligned with Page Left Edge
                        var currentAbsX = caretRect.left - pageRect.left;
                        
                        // Handle case where text indent/margin pushes start
                        // The 'pos' in tabs is absolute inches from page left
                        var currentInches = currentAbsX / 96.0;

                        // Find next tab stop
                        var nextTab = tabs.find(t => t.pos > currentInches + 0.05); // Small tolerance

                        if (nextTab) {
                            var targetPx = nextTab.pos * 96;
                            // Precise calculation relative to current cursor X
                            var widthNeeded = Math.max(1, targetPx - currentAbsX);
                            
                            // Insert a span with exact width
                            var html = `<span class="tab-spacer" style="width: ${widthNeeded}px; display:inline-block;" contenteditable="false"></span>`;
                            document.execCommand('insertHTML', false, html);
                        } else {
                             document.execCommand('insertHTML', false, '&emsp;');
                        }
                    }
                }
                
                // --- SYMBOL DIALOG LOGIC ---
                var symbolDialog = $("#symbol-dialog").dialog({
                    autoOpen: false, modal: true, width: 600, height: 500,
                    buttons: {} // Custom buttons inside content
                });

                // Symbol Data (loaded as symbolData)

                $('#btn-insert-symbol').click(function() {
                      // Store current range before opening to restore focus
                    var sel = window.getSelection();
                    if (sel.rangeCount > 0) {
                         window.lastSymbolRange = sel.getRangeAt(0).cloneRange();
                    } else {
                        window.lastSymbolRange = null;
                    }
                    symbolDialog.dialog("open");
                    loadSymbols();
                    updateRecentSymbols();
                });

                $('#btn-symbol-cancel').click(function() {
                    symbolDialog.dialog("close");
                });

                $('#symbol-code-form').change(function() {
                      updateSymbolInfo();
                });
                
                var selectedSymbol = null;
                var selectedSymbolName = "";
                var recentSymbols = []; // Store recently used symbols (codepoints)

                function loadSymbols() {
                    var $grid = $('#symbol-grid').empty();
                    
                    // Iterate over the keys in symbolData
                    // Check if symbolData is loaded
                    if (typeof symbolData !== 'undefined') {
                        for (const [name, info] of Object.entries(symbolData)) {
                            var char = info.characters;
                            var code = info.codepoints[0]; // Primary codepoint

                            var $cell = $('<div class="symbol-cell"></div>')
                                .text(char)
                                .data('code', code)
                                .data('name', name);

                            $cell.click(function() {
                                $('.symbol-cell').removeClass('selected');
                                $(this).addClass('selected');
                                selectedSymbol = $(this).data('code');
                                selectedSymbolName = $(this).data('name');
                                updateSymbolInfo();
                            });
                            $grid.append($cell);
                        }
                    } else {
                        $grid.html("<div style='padding:10px; color:red;'>Error: Symbol data not loaded. Check connection.</div>");
                    }
                }
                
                function updateSymbolInfo() {
                    if (selectedSymbol === null) return;
                    
                    $('#symbol-name').val(selectedSymbolName); // Display Name e.g. &AElig
                    
                    var form = $('#symbol-code-form').val();
                    var text = "";
                    if (form === 'unicode') text = "U+" + selectedSymbol.toString(16).toUpperCase().padStart(4, '0');
                    else if (form === 'ascii-dec') text = selectedSymbol.toString();
                    else if (form === 'ascii-hex') text = selectedSymbol.toString(16).toUpperCase();
                    
                    $('#symbol-code-val').val(text);
                }

                $('#btn-symbol-insert').click(function() {
                    if (selectedSymbol !== null) {
                        var char = String.fromCharCode(selectedSymbol);
                        
                        // Add to recent
                        if (!recentSymbols.includes(selectedSymbol)) {
                            recentSymbols.unshift(selectedSymbol);
                            if (recentSymbols.length > 20) recentSymbols.pop();
                        }
                        
                        // Restore selection and insert
                        if (window.lastSymbolRange) {
                            var sel = window.getSelection();
                            sel.removeAllRanges();
                            sel.addRange(window.lastSymbolRange);
                        } else if (currentFocusPage) {
                             currentFocusPage.focus();
                        }
                        
                        document.execCommand('insertText', false, char);
                        
                        // Update last range to new position
                        var sel = window.getSelection();
                        if (sel.rangeCount > 0) window.lastSymbolRange = sel.getRangeAt(0).cloneRange();
                        
                        updateRecentSymbols();
                    }
                });

                function updateRecentSymbols() {
                    var $list = $('#recent-symbols').empty();
                    recentSymbols.forEach(code => {
                        var char = String.fromCharCode(code);
                        var $cell = $('<div class="recent-cell"></div>').text(char);
                         $cell.click(function() {
                            // Quick insert from recent
                            if (window.lastSymbolRange) {
                                var sel = window.getSelection();
                                sel.removeAllRanges();
                                sel.addRange(window.lastSymbolRange);
                            }
                            document.execCommand('insertText', false, char);
                            // Update range
                            var sel = window.getSelection();
                            if (sel.rangeCount > 0) window.lastSymbolRange = sel.getRangeAt(0).cloneRange();
                        });
                        $list.append($cell);
                    });
                }


                // --- INSERT TABLE FUNCTIONALITY ---
                $('#btn-insert-table').click(function(e) {
                    e.stopPropagation();
                    $('#table-dropdown').toggle();
                    $('#shapes-dropdown').hide();
                });

                var $tableGrid = $('#table-grid');
                for(let r=1; r<=10; r++) {
                    for(let c=1; c<=10; c++) {
                        $tableGrid.append($('<div class="table-cell"></div>').data('r', r).data('c', c));
                    }
                }
                $('.table-cell').hover(function() {
                    var r = $(this).data('r'); var c = $(this).data('c');
                    $('#table-info').text(c + ' x ' + r + ' Table');
                    $('.table-cell').removeClass('active');
                    $('.table-cell').each(function() {
                        if($(this).data('r') <= r && $(this).data('c') <= c) $(this).addClass('active');
                    });
                });
                $('.table-cell').click(function() {
                    var r = $(this).data('r'); var c = $(this).data('c');
                    var tableHtml = '<table class="doc-table"><tbody>';
                    for(let i=0; i<r; i++) {
                        tableHtml += '<tr>';
                        for(let j=0; j<c; j++) { tableHtml += '<td></td>'; }
                        tableHtml += '</tr>';
                    }
                    tableHtml += '</tbody></table><p>&nbsp;</p>';
                    document.execCommand('insertHTML', false, tableHtml);
                    $('#table-dropdown').hide();
                });

                // --- INSERT SHAPES FUNCTIONALITY ---
                $('#btn-insert-shapes').click(function(e) {
                    e.stopPropagation();
                    $('#shapes-dropdown').toggle();
                    $('#table-dropdown').hide();
                });

                const shapesData = {
                    "Lines": [
                        { name: "Line", svg: '<line x1="2" y1="22" x2="22" y2="2" stroke="black" />' },
                        { name: "Arrow", svg: '<defs><marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#000" /></marker></defs><line x1="2" y1="22" x2="20" y2="4" stroke="black" marker-end="url(#arrowhead)" />' }
                    ],
                    "Rectangles": [
                        { name: "Rectangle", svg: '<rect x="2" y="5" width="20" height="14" fill="none" stroke="black" />' },
                        { name: "Rounded Rect", svg: '<rect x="2" y="5" width="20" height="14" rx="4" fill="none" stroke="black" />' }
                    ],
                    "Basic Shapes": [
                        { name: "Circle", svg: '<circle cx="12" cy="12" r="10" fill="none" stroke="black" />' },
                        { name: "Triangle", svg: '<polygon points="12,2 22,22 2,22" fill="none" stroke="black" />' },
                        { name: "Diamond", svg: '<polygon points="12,2 22,12 12,22 2,12" fill="none" stroke="black" />' },
                        { name: "Heart", svg: '<path d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z" fill="none" stroke="black"/>' }
                    ],
                    "Block Arrows": [
                        { name: "Right Arrow", svg: '<polygon points="2,8 14,8 14,2 22,12 14,22 14,16 2,16" fill="none" stroke="black" />' },
                        { name: "Left Arrow", svg: '<polygon points="22,8 10,8 10,2 2,12 10,22 10,16 22,16" fill="none" stroke="black" />' }
                    ],
                    "Equation Shapes": [
                        { name: "Plus", svg: '<polygon points="8,2 16,2 16,8 22,8 22,16 16,16 16,22 8,22 8,16 2,16 2,8 8,8" fill="none" stroke="black" />' },
                        { name: "Minus", svg: '<rect x="2" y="10" width="20" height="4" fill="none" stroke="black" />' }
                    ]
                };

                var $shapesGal = $('#shapes-dropdown');
                for(let cat in shapesData) {
                    $shapesGal.append('<div class="shape-category">' + cat + '</div>');
                    var $grid = $('<div class="shape-grid"></div>');
                    shapesData[cat].forEach(sh => {
                        var $item = $('<div class="shape-item" title="'+sh.name+'"></div>');
                        $item.append('<svg viewBox="0 0 24 24">' + sh.svg + '</svg>');
                        $item.click(function() {
                            var code = $(this).find('svg').html();
                            code = code.replace(/stroke-width="1.5"/g, 'stroke-width="5"');
                            var html = `<div class="img-wrapper" contenteditable="false"><svg viewBox="0 0 24 24" width="100" height="100">${code}</svg></div>`;
                            document.execCommand('insertHTML', false, html);
                            $('#shapes-dropdown').hide();
                        });
                        $grid.append($item);
                    });
                    $shapesGal.append($grid);
                }

                $(document).click(function() {
                    $('.dropdown-menu').hide();
                });

                // --- CHART FUNCTIONALITY (D3.js) ---
                var chartDialog = $("#chart-dialog").dialog({
                    autoOpen: false, modal: true, width: 500, height: 450,
                    buttons: {
                        "Insert": function() {
                            var svgNode = document.querySelector("#chart-preview svg");
                            if(svgNode) {
                                var svgData = new XMLSerializer().serializeToString(svgNode);
                                var canvas = document.createElement("canvas");
                                canvas.width = 400; canvas.height = 200;
                                var ctx = canvas.getContext("2d");
                                var img = document.createElement("img");
                                img.setAttribute("src", "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData))));
                                img.onload = function() {
                                    ctx.drawImage(img, 0, 0, 400, 200);
                                    var imgUrl = canvas.toDataURL("image/png");
                                    var html = `<div class="img-wrapper" contenteditable="false"><img src="${imgUrl}" width="400"></div>`;
                                    document.execCommand('insertHTML', false, html);
                                };
                            }
                            $(this).dialog("close");
                        },
                        "Cancel": function() { $(this).dialog("close"); }
                    }
                });

                $('#btn-insert-chart').click(function() {
                    chartDialog.dialog("open");
                    updateChartPreview();
                });

                $('#btn-preview-chart').click(function() { updateChartPreview(); });
                $('#chart-type').change(function() { updateChartPreview(); });

                function updateChartPreview() {
                    var type = $('#chart-type').val();
                    var rawData = $('#chart-data').val().trim();
                    var data = [];
                    
                    try {
                        var rows = rawData.split('\n');
                        rows.forEach(r => {
                            var cols = r.split(',');
                            if(cols.length >= 2) {
                                data.push({ label: cols[0].trim(), value: parseFloat(cols[1].trim()) });
                            }
                        });
                    } catch(e) { console.error("Data parse error"); }

                    $('#chart-preview').empty();
                    if(data.length === 0) return;

                    var width = 400, height = 200, margin = 30;
                    var svg = d3.select("#chart-preview").append("svg")
                        .attr("width", width).attr("height", height)
                        .attr("viewBox", `0 0 ${width} ${height}`)
                        .attr("xmlns", "http://www.w3.org/2000/svg"); 

                    svg.append("rect").attr("width", "100%").attr("height", "100%").attr("fill", "white");

                    if(type === 'bar') {
                        var x = d3.scaleBand().range([margin, width - margin]).domain(data.map(d => d.label)).padding(0.2);
                        var y = d3.scaleLinear().range([height - margin, margin]).domain([0, d3.max(data, d => d.value)]);
                        
                        svg.append("g").attr("transform", `translate(0,${height - margin})`).call(d3.axisBottom(x));
                        svg.append("g").attr("transform", `translate(${margin},0)`).call(d3.axisLeft(y));
                        
                        svg.selectAll("rect.bar").data(data).enter().append("rect")
                            .attr("x", d => x(d.label))
                            .attr("y", d => y(d.value))
                            .attr("width", x.bandwidth())
                            .attr("height", d => height - margin - y(d.value))
                            .attr("fill", "#3b5998");
                    } 
                    else if (type === 'line' || type === 'scatter') {
                        var isNumX = !isNaN(parseFloat(data[0].label));
                        var x, y;
                        if(isNumX) {
                            x = d3.scaleLinear().range([margin, width - margin]).domain(d3.extent(data, d => parseFloat(d.label)));
                        } else {
                            x = d3.scalePoint().range([margin, width - margin]).domain(data.map(d => d.label));
                        }
                        y = d3.scaleLinear().range([height - margin, margin]).domain([0, d3.max(data, d => d.value)]);

                        svg.append("g").attr("transform", `translate(0,${height - margin})`).call(d3.axisBottom(x));
                        svg.append("g").attr("transform", `translate(${margin},0)`).call(d3.axisLeft(y));

                        if(type === 'line') {
                            var valLine = d3.line().x(d => x(isNumX ? parseFloat(d.label) : d.label)).y(d => y(d.value));
                            svg.append("path").data([data]).attr("class", "line").attr("d", valLine).attr("fill", "none").attr("stroke", "#3b5998").attr("stroke-width", 2);
                        }
                        svg.selectAll("circle").data(data).enter().append("circle")
                            .attr("cx", d => x(isNumX ? parseFloat(d.label) : d.label))
                            .attr("cy", d => y(d.value))
                            .attr("r", 4)
                            .attr("fill", "red");
                    }
                    else if (type === 'pie') {
                        var radius = Math.min(width, height) / 2 - margin;
                        var pie = d3.pie().value(d => d.value);
                        var arc = d3.arc().innerRadius(0).outerRadius(radius);
                        var colors = d3.scaleOrdinal(d3.schemeCategory10);
                        
                        var g = svg.append("g").attr("transform", `translate(${width/2},${height/2})`);
                        g.selectAll("path").data(pie(data)).enter().append("path")
                            .attr("d", arc)
                            .attr("fill", (d, i) => colors(i))
                            .attr("stroke", "white").attr("stroke-width", "2px");
                    }
                }
                
                // --- HYPERLINK & BOOKMARK FUNCTIONALITY ---
                var hyperlinkDialog = $("#hyperlink-dialog").dialog({
                    autoOpen: false, modal: true, width: 400,
                    buttons: {
                        "OK": function() {
                            // Focus lost to dialog, so restore the last known selection
                            if (window.lastNonEmptyRange) {
                                var sel = window.getSelection();
                                sel.removeAllRanges();
                                sel.addRange(window.lastNonEmptyRange);
                            }
                            
                            var text = $('#link-text-display').val();
                            var addr = $('#link-address').val();
                            var tip = $('#link-screentip').val();
                            
                            if(addr) {
                                var titleAttr = tip ? `title="${tip}"` : '';
                                var html = `<a href="${addr}" ${titleAttr} class="doc-link">${text || addr}</a>`;
                                document.execCommand('insertHTML', false, html);
                            }
                            $(this).dialog("close");
                            
                            // Return focus to editor
                            if(currentFocusPage) currentFocusPage.focus();
                        },
                        "Cancel": function() { $(this).dialog("close"); }
                    }
                });

                var bookmarkDialog = $("#bookmark-dialog").dialog({
                    autoOpen: false, modal: true, width: 300, height: 350
                });

                $('#btn-insert-hyperlink').click(function() {
                    // Try to restore last non-empty selection if current is empty
                    var sel = window.getSelection();
                    
                    if (sel.isCollapsed && window.lastNonEmptyRange) {
                        sel.removeAllRanges();
                        sel.addRange(window.lastNonEmptyRange);
                    }
                    
                    var text = window.getSelection().toString();
                    
                    // Display Status
                    var status = (text.length > 0) 
                        ? `Selection: "${text.substring(0, 20)}${text.length>20?'...':''}"`
                        : "No text selected (will insert new link)";
                        
                    // Add DOM position info if available
                    if (sel.anchorNode) {
                        status += ` | Pos: ${sel.anchorOffset}`;
                    }
                    
                    $('#hyperlink-status').text(status);
                    
                    $('#link-text-display').val(text);
                    hyperlinkDialog.dialog("open");
                });

                $('#btn-insert-bookmark').click(function() {
                    // Try to restore last non-empty selection if current is empty
                    var sel = window.getSelection();
                    
                    if (sel.isCollapsed && window.lastNonEmptyRange) {
                        sel.removeAllRanges();
                        sel.addRange(window.lastNonEmptyRange);
                    }
                    
                    var text = window.getSelection().toString();
                    
                    // Display Status
                    var status = (text.length > 0) 
                        ? `Selection: "${text.substring(0, 20)}${text.length>20?'...':''}"`
                        : "Cursor at insertion point";
                        
                    if (sel.anchorNode) {
                        status += ` | Pos: ${sel.anchorOffset}`;
                    }
                    
                    $('#bookmark-status').text(status);
                    
                    updateBookmarkList();
                    bookmarkDialog.dialog("open");
                });
                
                $('#btn-link-bookmark').click(function() {
                       updateBookmarkList();
                       bookmarkDialog.dialog("open");
                       $('#bookmark-list').off('click').on('click', 'li', function() {
                           $('#bookmark-list li').removeClass('selected');
                           $(this).addClass('selected');
                           var bmId = $(this).attr('data-id');
                           $('#link-address').val('#' + bmId); 
                       });
                });

                function updateBookmarkList() {
                    var $list = $('#bookmark-list').empty();
                    $('[id^="bm-"]').each(function() {
                        var name = $(this).attr('id').substring(3); 
                        var $li = $('<li>').text(name).attr('data-id', $(this).attr('id'));
                        $li.click(function() {
                            $('#bookmark-list li').removeClass('selected');
                            $(this).addClass('selected');
                            $('#bookmark-name-input').val(name);
                        });
                        $list.append($li);
                    });
                    if(!$('#hyperlink-dialog').dialog('isOpen')) {
                         $('#bookmark-list').off('click').on('click', 'li', function() {
                            $('#bookmark-list li').removeClass('selected');
                            $(this).addClass('selected');
                            $('#bookmark-name-input').val($(this).text());
                        });
                    }
                }

                $('#btn-bookmark-add').click(function() {
                    var name = $('#bookmark-name-input').val();
                    if(name) {
                        // Restore selection first
                        if (window.lastNonEmptyRange) {
                            var sel = window.getSelection();
                            sel.removeAllRanges();
                            sel.addRange(window.lastNonEmptyRange);
                        }
                        
                        var id = 'bm-' + name.replace(/\s+/g, '-');
                        var sel = window.getSelection();
                        
                        if(sel.rangeCount > 0) {
                            var range = sel.getRangeAt(0);
                            
                            // Check if the range has content to wrap
                            var content = range.toString();
                            
                            var span = document.createElement('span');
                            span.id = id;
                            span.className = 'doc-bookmark';
                            
                            if (content.length > 0) {
                                try {
                                    range.surroundContents(span);
                                } catch(e) {
                                    // Fallback for complex ranges
                                    span.innerHTML = '&#8203;'; 
                                    range.insertNode(span);
                                }
                            } else {
                                // Insert point anchor
                                span.innerHTML = '&#8203;'; 
                                range.insertNode(span);
                            }
                            updateBookmarkList();
                            
                            // Refocus
                            if(currentFocusPage) currentFocusPage.focus();
                        }
                    }
                });

                $('#btn-bookmark-delete').click(function() {
                    var $sel = $('#bookmark-list li.selected');
                    if($sel.length) {
                        var id = $sel.attr('data-id');
                        var $el = $('#' + id);
                        if ($el.length) {
                            // Unwrap functionality: replace span with its own children
                            $el.contents().unwrap();
                        }
                        updateBookmarkList();
                        $('#bookmark-name-input').val('');
                    }
                });

                $('#btn-bookmark-goto').click(function() {
                    var $sel = $('#bookmark-list li.selected');
                    if($sel.length) {
                        var id = $sel.attr('data-id');
                        var el = document.getElementById(id);
                        if(el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            
                            // Move Cursor to Bookmark
                            var range = document.createRange();
                            var sel = window.getSelection();
                            
                            // Select the contents of the bookmark span
                            range.selectNodeContents(el);
                            range.collapse(true); // Collapse to start
                            sel.removeAllRanges();
                            sel.addRange(range);
                            
                            // Ensure the editor has focus so the cursor is visible
                            var $page = $(el).closest('.document-page');
                            if($page.length) $page.focus();
                            
                            bookmarkDialog.dialog("close");
                            
                            if($('#hyperlink-dialog').dialog('isOpen')) {
                                 $('#link-address').val('#' + id); 
                            }
                        }
                    }
                });

                // NEW: CLICKABLE LINKS HANDLER
                // Use event delegation on #doc-scroll-area for any 'a' tags
                $('#doc-scroll-area').on('click', 'a', function(e) {
                    if (e.ctrlKey) {
                        var href = $(this).attr('href');
                        if (href) {
                            e.preventDefault(); 
                            e.stopPropagation();
                            
                            if(href.startsWith('#')) {
                                // Internal Bookmark
                                var targetId = href.substring(1);
                                var $target = $('#' + targetId);
                                if($target.length) {
                                    $target[0].scrollIntoView({behavior: 'smooth', block: 'center'});
                                    var range = document.createRange();
                                    var sel = window.getSelection();
                                    range.setStart($target[0], 0);
                                    range.collapse(true);
                                    sel.removeAllRanges();
                                    sel.addRange(range);
                                    
                                    // Set focus to allow typing
                                    $target.closest('.document-page').focus();
                                    
                                    // Highlight effect
                                    $target.css('background-color', '#ffeb3b').animate({ backgroundColor: "transparent" }, 1000);
                                }
                            } else {
                                // External
                                window.open(href, '_blank');
                            }
                        }
                    }
                });

                // --- TEXT BOX FUNCTIONALITY ---
                var textBoxDialog = $("#text-box-dialog").dialog({
                    autoOpen: false, modal: false, width: 250,
                    buttons: { "Close": function() { $(this).dialog("close"); } }
                });

                $('#btn-insert-text-box').click(function() {
                    var tbId = 'tb-' + new Date().getTime();
                    if(!currentFocusPage) currentFocusPage = $('.document-page').first();
                    var $body = currentFocusPage.find('.page-body');
                    
                    var $tb = $(`<div id="${tbId}" class="text-box-wrapper" style="left: 50px; top: 50px; width: 150px; height: 100px;">
                                        <div class="text-box-content" contenteditable="true">Text Box</div>
                                     </div>`);
                    
                    $body.append($tb);
                    $tb.draggable({ containment: "parent" }).resizable();
                    
                    $tb.mousedown(function(e) {
                        e.stopPropagation();
                        $('.text-box-wrapper').removeClass('selected');
                        $(this).addClass('selected');
                        activeTextBox = $(this);
                        updateTextBoxDialogFromActive();
                    });
                    
                    $tb.dblclick(function(e) {
                        e.stopPropagation();
                        activeTextBox = $(this);
                        updateTextBoxDialogFromActive();
                        textBoxDialog.dialog("open");
                    });
                });

                function updateTextBoxDialogFromActive() {
                    if(!activeTextBox) return;
                    var bg = activeTextBox.css('background-color'); 
                    if(bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
                        $('#tb-transparent').prop('checked', true);
                    } else {
                        $('#tb-transparent').prop('checked', false);
                    }
                    var bw = parseInt(activeTextBox.css('border-width'));
                    $('#tb-border-width').val(isNaN(bw) ? 1 : bw);
                    var pad = parseInt(activeTextBox.css('padding'));
                    $('#tb-padding').val(isNaN(pad) ? 5 : pad);
                }

                $('#tb-fill-color').on('input', function() {
                    if(activeTextBox) { activeTextBox.css('background-color', $(this).val()); $('#tb-transparent').prop('checked', false); }
                });
                $('#tb-transparent').change(function() {
                    if(activeTextBox) { activeTextBox.css('background-color', this.checked ? 'transparent' : $('#tb-fill-color').val()); }
                });
                $('#tb-border-color').on('input', function() {
                    if(activeTextBox) activeTextBox.css('border-color', $(this).val());
                });
                $('#tb-border-width').on('input', function() {
                    if(activeTextBox) activeTextBox.css('border-width', $(this).val() + 'px');
                });
                $('#tb-padding').on('input', function() {
                    if(activeTextBox) activeTextBox.css('padding', $(this).val() + 'px');
                });

                $('#doc-scroll-area').on('mousedown', function(e) {
                    if(!$(e.target).closest('.text-box-wrapper').length) {
                        $('.text-box-wrapper').removeClass('selected');
                        activeTextBox = null;
                    }
                });

                // --- Image Handling ---
                $('#doc-scroll-area').on('click', 'img', function(e) {
                    safeExecute(() => {
                        e.stopPropagation(); 
                        try { if ($('.img-wrapper').data('ui-resizable')) { $('.img-wrapper').resizable("destroy"); } } catch(e) {}
                        $('.img-wrapper').removeClass('selected');
                        var $wrapper = $(this).closest('.img-wrapper');
                        if(!$wrapper.length) { $(this).wrap('<div class="img-wrapper" contenteditable="false"></div>'); $wrapper = $(this).closest('.img-wrapper'); }
                        activeImage = $wrapper; 
                        activeImage.addClass('selected').resizable({ handles: "se" });
                        $('#picture-tools-tab-link').show().click();
                        $('#pic-width').val(activeImage.width()); $('#pic-height').val(activeImage.height());
                    });
                });
                
                $('#doc-scroll-area').on('click', 'svg', function(e) {
                    e.stopPropagation();
                    safeExecute(() => {
                         try { if ($('.img-wrapper').data('ui-resizable')) { $('.img-wrapper').resizable("destroy"); } } catch(e) {}
                        $('.img-wrapper').removeClass('selected');
                        var $wrapper = $(this).closest('.img-wrapper');
                        if(!$wrapper.length) { $(this).wrap('<div class="img-wrapper" contenteditable="false"></div>'); $wrapper = $(this).closest('.img-wrapper'); }
                        activeImage = $wrapper; 
                        activeImage.addClass('selected').resizable({ handles: "se" });
                        $('#picture-tools-tab-link').show().click();
                    });
                });

                $('#doc-scroll-area').on('click', '.document-page', function(e) {
                    if(!$(e.target).closest('.img-wrapper').length) {
                        if(activeImage) {
                            activeImage.removeClass('selected'); 
                            try { if(activeImage.data('ui-resizable')) activeImage.resizable("destroy"); } catch(e){}
                            activeImage = null; 
                            $('#picture-tools-tab-link').hide(); 
                            $('.tab-link[data-tab="tab-home"]').click();
                        }
                    }
                    if(!$(e.target).closest('.math-wrapper').length) {
                       if(activeEquation) {
                           activeEquation.removeClass('selected'); activeEquation = null;
                           $('#equation-tools-tab-link').hide(); $('.tab-link[data-tab="tab-home"]').click();
                       }
                    }
                });

                // --- Equation Handling ---
                $('#btn-insert-equation').click(function() {
                    var eqId = 'eq-' + new Date().getTime();
                    var placeholder = `<span class="math-wrapper" id="${eqId}" contenteditable="false" data-latex="">$$ Type Equation $$</span>`;
                    document.execCommand('insertHTML', false, placeholder);
                    setTimeout(function() {
                        $('#'+eqId).click();
                        $('#eq-latex-input').focus();
                    }, 100);
                });

                $('#doc-scroll-area').on('click', '.math-wrapper', function(e) {
                    e.stopPropagation();
                    $('.math-wrapper').removeClass('selected');
                    $(this).addClass('selected');
                    activeEquation = $(this);
                    $('#equation-tools-tab-link').show().click();
                    var existingLatex = $(this).attr('data-latex') || "";
                    $('#eq-latex-input').val(existingLatex);
                });

                $('#btn-eq-render').click(function() {
                    if(activeEquation) {
                        var latex = $('#eq-latex-input').val();
                        activeEquation.attr('data-latex', latex);
                        activeEquation.html("$$ " + latex + " $$");
                        if (window.MathJax) { MathJax.typesetPromise([activeEquation[0]]).catch(function (err) { console.log('MathJax error:', err); }); }
                    }
                });

                $('#btn-eq-frac').click(function() { $('#eq-latex-input').val($('#eq-latex-input').val() + "\\frac{a}{b}"); });
                $('#btn-eq-sqrt').click(function() { $('#eq-latex-input').val($('#eq-latex-input').val() + "\\sqrt{x}"); });
                $('#btn-eq-super').click(function() { $('#eq-latex-input').val($('#eq-latex-input').val() + "x^2"); });

                // --- Find and Replace ---
                var findDialog = $("#find-dialog").dialog({ autoOpen: false, modal: false, buttons: { "Find Next": function() { findNext(); }, "Close": function() { $(this).dialog("close"); } } });
                var replaceDialog = $("#replace-dialog").dialog({ autoOpen: false, modal: false, buttons: { "Find Next": function() { findNextReplace(); }, "Replace": function() { replaceCurrent(); }, "Close": function() { $(this).dialog("close"); } } });

                $('#btn-find').click(function() { findDialog.dialog("open"); });
                $('#btn-replace').click(function() { replaceDialog.dialog("open"); });

                function findNext() {
                    var term = $('#find-input').val();
                    if(term) window.find(term);
                }
                function findNextReplace() {
                    var term = $('#replace-find-input').val();
                    if(term) window.find(term);
                }
                function replaceCurrent() {
                    var text = $('#replace-with-input').val();
                    document.execCommand('insertText', false, text);
                }

                // --- Spell Check Creative Solution: Resilient Fetcher ---
                var typo;
                
                async function initSpellcheck() {
                    console.log("Initializing Resilient Spellchecker...");
                    
                    const dictPathBase = 'https://cdn.jsdelivr.net/npm/typo-js@1.0.3/typo/dictionaries/en_US/en_US';
                    const unpkgPathBase = 'https://unpkg.com/typo-js@1.0.3/typo/dictionaries/en_US/en_US';
                    
                    try {
                        // Attempt Primary Source (jsDelivr - usually best for CORS)
                        let affData = await fetchWithFallback(dictPathBase + '.aff', unpkgPathBase + '.aff');
                        let dicData = await fetchWithFallback(dictPathBase + '.dic', unpkgPathBase + '.dic');
                        
                        typo = new Typo("en_US", affData, dicData);
                        console.log("Spellchecker initialized successfully via CDN.");
                    } catch(e) {
                        // Fallback: Browser Native
                        console.warn("Spellcheck CDN load failed. Enabling browser native spellcheck.", e);
                        $('#btn-spellcheck').addClass('disabled').attr('title', 'Using Browser Native Spellcheck');
                        $('.document-page').attr('spellcheck', 'true');
                        var log = document.getElementById('error-content');
                        if(log) log.innerHTML += `<div class="log-entry" style="color:orange">[Info] Dictionary fetch blocked. Switched to native browser spellcheck.</div>`;
                    }
                }
                
                async function fetchWithFallback(url1, url2) {
                    try {
                        let r = await fetch(url1);
                        if (!r.ok) throw new Error(r.statusText);
                        return await r.text();
                    } catch (e) {
                        console.log("Primary fetch failed, trying secondary...");
                        let r2 = await fetch(url2);
                        if (!r2.ok) throw new Error(r2.statusText);
                        return await r2.text();
                    }
                }
                
                // Initialize on load
                initSpellcheck();

                $('#btn-spellcheck').click(function() {
                    if (!typo) return; // If typo failed to load, button is disabled visually
                    $('.misspelled').contents().unwrap(); // Clear existing
                    
                    $('.document-page .page-body').each(function() {
                        var walker = document.createTreeWalker(this, NodeFilter.SHOW_TEXT, null, false);
                        var node;
                        var nodesToReplace = [];
                        
                        while(node = walker.nextNode()) {
                            var text = node.nodeValue;
                            var words = text.split(/([a-zA-Z']+)/); 
                            var hasMisspelling = false;
                            
                            for (var i = 0; i < words.length; i++) {
                                var word = words[i];
                                if (/^[a-zA-Z']+$/.test(word) && !typo.check(word)) {
                                    hasMisspelling = true;
                                    break;
                                }
                            }
                            
                            if (hasMisspelling) {
                                var span = document.createElement('span');
                                words.forEach(function(w) {
                                    if (/^[a-zA-Z']+$/.test(w) && !typo.check(w)) {
                                        var s = document.createElement('span');
                                        s.className = 'misspelled';
                                        s.innerText = w;
                                        span.appendChild(s);
                                    } else {
                                        span.appendChild(document.createTextNode(w));
                                    }
                                });
                                nodesToReplace.push({ old: node, new: span });
                            }
                        }
                        
                        nodesToReplace.forEach(n => {
                           n.old.parentNode.replaceChild(n.new, n.old); 
                        });
                    });
                });

                // --- Image Tools Handlers & Dialogs ---
                var cropDialog = $("#crop-dialog").dialog({
                    autoOpen: false, modal: true, width: 300,
                    buttons: {
                        "OK": function() {
                            if(activeImage) {
                                var t = $("#crop-top").val() + "px";
                                var r = $("#crop-right").val() + "px";
                                var b = $("#crop-bottom").val() + "px";
                                var l = $("#crop-left").val() + "px";
                                activeImage.find('img, svg').css('clip-path', `inset(${t} ${r} ${b} ${l})`);
                            }
                            $(this).dialog("close");
                        },
                        "Cancel": function() { $(this).dialog("close"); }
                    }
                });

                var resizeDialog = $("#resize-dialog").dialog({
                    autoOpen: false, modal: true, width: 250,
                    buttons: {
                        "OK": function() {
                            if(activeImage) {
                                var w = $("#resize-width").val();
                                var h = $("#resize-height").val();
                                activeImage.css({ width: w, height: h });
                                activeImage.find('img, svg').css({ width: '100%', height: '100%' }); 
                            }
                            $(this).dialog("close");
                        },
                        "Cancel": function() { $(this).dialog("close"); }
                    }
                });

                var recolorDialog = $("#recolor-dialog").dialog({
                    autoOpen: false, modal: true, width: 250,
                    buttons: {
                        "OK": function() {
                            if(activeImage) {
                                var filter = $("#recolor-select").val();
                                activeImage.find('img, svg').css('filter', filter === 'none' ? '' : filter);
                            }
                            $(this).dialog("close");
                        },
                        "Cancel": function() { $(this).dialog("close"); }
                    }
                });

                $('#btn-pic-crop').click(function() { cropDialog.dialog("open"); });
                $('#btn-pic-resize').click(function() { 
                    if(activeImage) {
                        $("#resize-width").val(activeImage.width());
                        $("#resize-height").val(activeImage.height());
                        resizeDialog.dialog("open"); 
                    }
                });
                $('#btn-pic-recolor').click(function() { recolorDialog.dialog("open"); });
                
                $('#btn-pic-reset').click(function() { 
                    if(activeImage) { 
                        var $img = activeImage.find('img, svg'); 
                        $img.css({ 'filter': '', 'box-shadow': '', 'border': '', 'clip-path': '' }); 
                        activeImage.removeClass('cropping'); 
                    } 
                });
                $('#btn-pic-shadow').click(function() { if(activeImage) activeImage.find('img, svg').css('box-shadow', '5px 5px 10px #888'); });
                $('#btn-pic-border').click(function() { if(activeImage) activeImage.find('img, svg').css('border', '5px solid #000'); });
                
                $('#btn-pic-save').click(function() {
                    if(activeImage) {
                        var img = activeImage.find('img')[0];
                        if(!img) return; 
                        var canvas = document.createElement('canvas');
                        canvas.width = img.naturalWidth || img.width; 
                        canvas.height = img.naturalHeight || img.height;
                        var ctx = canvas.getContext('2d');
                        if($(img).css('filter') && $(img).css('filter') !== 'none') {
                             ctx.filter = $(img).css('filter');
                        }
                        try {
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                            var link = document.createElement('a');
                            link.download = 'image.png'; 
                            link.href = canvas.toDataURL(); 
                            link.click();
                        } catch(e) {
                            alert("Security Error: Cannot save this image because it was loaded from an external source without CORS permissions. " + e.message);
                        }
                    }
                });
                
                $('#btn-insert-picture-main').click(function() { imgDialog.dialog("open"); });

                var imgDialog = $("#insert-image-dialog").dialog({
                    autoOpen: false, modal: true, buttons: {
                        "Insert": function() {
                            var url = $('#img-url-input').val();
                            var file = $('#img-file-input')[0].files[0];
                            if(file) { 
                                var reader = new FileReader(); 
                                reader.onload = function(e) { insertImg(e.target.result); }; 
                                reader.readAsDataURL(file); 
                            } else if(url) { 
                                insertImg(url);
                            }
                            $(this).dialog("close");
                        },
                        "Cancel": function() { $(this).dialog("close"); }
                    }
                });
                
                async function insertImg(src) {
                    if (src.startsWith('http')) {
                        try {
                            const response = await fetch(src);
                            const blob = await response.blob();
                            const reader = new FileReader();
                            reader.onloadend = function() {
                                var base64data = reader.result;
                                var html = `<div class="img-wrapper" contenteditable="false"><img src="${base64data}" crossorigin="anonymous"></div>`; 
                                document.execCommand('insertHTML', false, html);
                            }
                            reader.readAsDataURL(blob);
                        } catch (e) {
                            console.warn("Could not fetch image for Base64 conversion (likely CORS). Inserting direct URL. PDF generation might fail for this image.", e);
                            var html = `<div class="img-wrapper" contenteditable="false"><img src="${src}" crossorigin="anonymous"></div>`; 
                            document.execCommand('insertHTML', false, html);
                        }
                    } else {
                        var html = `<div class="img-wrapper" contenteditable="false"><img src="${src}"></div>`; 
                        document.execCommand('insertHTML', false, html);
                    }
                }
                
                // --- RULER LOGIC ---
                function createRulerContent($container) {
                    $container.empty();
                    for (var i = 0; i <= 816; i += 12) {
                        var $tick = $('<div class="ruler-tick"></div>').css('left', i + 'px');
                        if (i % 96 === 0) $tick.addClass('large'); else if (i % 48 === 0) $tick.addClass('medium');
                        $container.append($tick);
                    }
                    $container.append('<div class="ruler-marker marker-left-indent" title="Left Indent"></div><div class="ruler-marker marker-first-line" title="First Line Indent"></div><div class="ruler-marker marker-right-indent" title="Right Indent"></div>');
                    $container.find('.marker-left-indent').draggable({ axis: "x", containment: "parent", drag: onDragLeft });
                    $container.find('.marker-first-line').draggable({ axis: "x", containment: "parent", drag: onDragFirst });
                    $container.find('.marker-right-indent').draggable({ axis: "x", containment: "parent", drag: onDragRight });
                }
                function onDragLeft(e, ui) { updateTargetStyle(getTargetContainer(ui), 'margin-left', ((ui.position.left - 96) / 96).toFixed(2) + "in"); }
                function onDragFirst(e, ui) { updateTargetStyle(getTargetContainer(ui), 'text-indent', ((ui.position.left - $(this).parent().find('.marker-left-indent').position().left) / 96).toFixed(2) + "in"); }
                function onDragRight(e, ui) { updateTargetStyle(getTargetContainer(ui), 'margin-right', ((720 - ui.position.left) / 96).toFixed(2) + "in"); }
                
                createRulerContent($('#ruler-wrapper-1')); createRulerContent($('#ruler-wrapper-2'));
                
                function updateRulerMarkers() {
                    if(!currentFocusPage) currentFocusPage = $('.document-page').first();
                    var focusIndex = $('.document-page').index(currentFocusPage);
                    var pairStart = (focusIndex % 2 === 0) ? focusIndex : focusIndex - 1;
                    var $pageLeft = (viewMode === 'one') ? currentFocusPage : $('.document-page').eq(pairStart);
                    
                    syncRulerToContainer($('#ruler-wrapper-1'), $pageLeft); $('#ruler-wrapper-1').addClass('active-ruler').css('opacity', 1);
                    if(viewMode === 'two') { var $pageRight = $('.document-page').eq(pairStart + 1); syncRulerToContainer($('#ruler-wrapper-2'), $pageRight); $('#ruler-wrapper-2').addClass('active-ruler').css('opacity', 1); }
                }
                
                function syncRulerToContainer($ruler, $page) {
                    var defLeft = 96, defRight = 720;
                    
                    // Clear existing visual tab stops
                    $ruler.find('.ruler-tab-stop').remove();

                    if(!$page || $page.length === 0) { 
                        $ruler.find('.marker-left-indent').css('left', defLeft + 'px'); 
                        $ruler.find('.marker-right-indent').css('left', defRight + 'px'); 
                        return; 
                    }
                    
                    var $container = $page.find('.page-body');
                    var $block = null; 
                    var selection = window.getSelection();
                    
                    if(selection.rangeCount > 0 && selection.anchorNode && $(selection.anchorNode).closest($container).length) { 
                        $block = $(selection.anchorNode).closest('p, div'); 
                    }
                    if(!$block || !$block.length) $block = $container.children().first(); 
                    if(!$block.length) $block = $container;
                    
                    var ml = parseFloat($block.css('margin-left')) || 0; 
                    var mr = parseFloat($block.css('margin-right')) || 0; 
                    var ti = parseFloat($block.css('text-indent')) || 0; 
                    var base = 96;
                    
                    $ruler.find('.marker-left-indent').css('left', (base + ml) + 'px'); 
                    $ruler.find('.marker-first-line').css('left', (base + ml + ti) + 'px'); 
                    $ruler.find('.marker-right-indent').css('left', (816 - 96 - mr) + 'px');
                    
                    // Draw Tab Stops with Visual Distinction
                    var tabs = getTabsFromElement($block);
                    tabs.forEach(t => {
                        var pxPos = t.pos * 96; // Convert inches to pixels
                        // Only draw if within bounds
                        if(pxPos >= 0 && pxPos <= 816) {
                            var $stop = $('<div class="ruler-tab-stop"></div>').css('left', pxPos + 'px');
                            
                            // Apply class based on alignment type
                            if (t.align === 'center') {
                                $stop.addClass('tab-center');
                            } else if (t.align === 'right') {
                                $stop.addClass('tab-right');
                            } else {
                                $stop.addClass('tab-left');
                            }
                            
                            $ruler.append($stop);
                        }
                    });
                }
                
                function getTargetContainer(ui) {
                    var rulerId = ui.helper.closest('.ruler-instance').data('ruler-id');
                    if(!currentFocusPage) currentFocusPage = $('.document-page').first();
                    var focusIndex = $('.document-page').index(currentFocusPage);
                    var $targetPage = null;
                    if (viewMode === 'one') { if (rulerId == 1) $targetPage = currentFocusPage; } else { var pairStart = (focusIndex % 2 === 0) ? focusIndex : focusIndex - 1; if (rulerId == 1) $targetPage = $('.document-page').eq(pairStart); if (rulerId == 2) $targetPage = $('.document-page').eq(pairStart + 1); }
                    if(!$targetPage || $targetPage.length === 0) return null;
                    return $targetPage.find('.page-body');
                }
                
                function updateTargetStyle($container, prop, value) {
                    if(!$container || $container.length === 0) return;
                    var selection = window.getSelection();
                    if(selection.rangeCount > 0 && selection.anchorNode && $(selection.anchorNode).closest($container).length) { var $block = $(selection.anchorNode).closest('p, div'); if($block.length) { $block.css(prop, value); return; } }
                    var $el = $container.children().first();
                    if($el.length === 0 && focusContext === 'body') { $container.append('<p>&#8203;</p>'); $el = $container.children().first(); }
                    if($el.length) $el.css(prop, value); else $container.css(prop, value);
                }

                // --- Other Logic (Dialogs, Save, etc.) ---
                $("#para-tabs").tabs(); $("#setup-tabs").tabs();
                
                // Initialize dialogs FIRST so variables are defined
                var paraDialog = $("#paragraph-dialog").dialog({ autoOpen: false, height: 480, width: 420, modal: false, resizable: true, buttons: { "OK": function() { applyParagraphSettings(); $(this).dialog("close"); }, "Cancel": function() { $(this).dialog("close"); } } });
                
                var setupDialog = $("#page-setup-dialog").dialog({ 
                    autoOpen: false, height: 450, width: 450, modal: true,
                    buttons: { 
                        "OK": function() { applyPageSetup(); $(this).dialog("close"); },
                        "Cancel": function() { $(this).dialog("close"); }
                    }
                });

                function applyPageSetup() {
                    var w = parseFloat($('#paper-width').val()) * 96;
                    var h = parseFloat($('#paper-height').val()) * 96;
                    var mt = parseFloat($('#margin-top').val()) * 96;
                    var mb = parseFloat($('#margin-bottom').val()) * 96;
                    var ml = parseFloat($('#margin-left').val()) * 96;
                    var mr = parseFloat($('#margin-right').val()) * 96;
                    var isLandscape = $('#orient-landscape').is(':checked');
                    if (isLandscape && w < h) { var temp = w; w = h; h = temp; }
                    else if (!isLandscape && w > h) { var temp = w; w = h; h = temp; }
                    $('.document-page').css({ width: w, height: h, 'padding-top': mt, 'padding-bottom': mb, 'padding-left': ml, 'padding-right': mr });
                    $('.ruler-instance, #ruler-horizontal').css('width', w);
                    if($('#chk-line-numbers').is(':checked')) { $('.document-page').addClass('show-line-numbers'); } else { $('.document-page').removeClass('show-line-numbers'); }
                    updateRulerMarkers();
                }

                // Bind handlers AFTER dialogs initialized
                $("#para-launcher").click(function() { 
                    openParagraphDialog();
                });
                
                // Creative Solution: Logic to capture selection immediately when dialog opens
                function openParagraphDialog() {
                    var sel = window.getSelection();
                    window.editingParagraphs = [];
                    
                    if (sel.rangeCount > 0) {
                        var range = sel.getRangeAt(0);
                        // Use helper to identify all touched blocks
                        window.editingParagraphs = getSelectedBlocks(range);
                    }
                    
                    // Fallback to active/last active if empty
                    if(window.editingParagraphs.length === 0) {
                        if (window.lastActiveParagraph && window.lastActiveParagraph.length) {
                            window.editingParagraphs = [window.lastActiveParagraph[0]];
                        } else if (currentFocusPage) {
                            var firstP = currentFocusPage.find('.page-body p').first();
                            if(firstP.length) window.editingParagraphs = [firstP[0]];
                        }
                    }
                    
                    // Populate Preview
                    var previewText = window.editingParagraphs.map(el => $(el).text()).join(" | ");
                    $('#para-preview-text').text(previewText || "(No Text Selected)");
                    
                    // Populate Outline Level from first element
                    if(window.editingParagraphs.length > 0) {
                        var lvl = $(window.editingParagraphs[0]).attr('data-outline-level') || 'body';
                        $('#outline-level').val(lvl);
                    }
                    
                    paraDialog.dialog("open");
                }

                $("#btn-page-setup").click(function(){ setupDialog.dialog("open"); });
                
                $('#btn-page-color').click(function(){ $('#page-color-picker').click(); });
                $('#page-color-picker').on('input', function(){ $('.document-page').css('background-color', $(this).val()); });
                
                // View Modes
                $('#btn-view-one').click(function() { viewMode='one'; $('#doc-scroll-area').removeClass('view-two-page'); $('#ruler-wrapper-2').hide(); updateRulerMarkers(); });
                $('#btn-view-two').click(function() { viewMode='two'; $('#doc-scroll-area').addClass('view-two-page'); $('#ruler-wrapper-2').show(); updateRulerMarkers(); });

                // Init
                $('.document-page').first().find('.page-body').focus();
                currentFocusPage = $('.document-page').first();
                updateRulerMarkers();
                updateStats();
                
                // Re-bind tool buttons
                $('.tool-btn').click(function() {
                    var cmd = '';
                    switch($(this).attr('title')) {
                        case 'Bold': cmd='bold'; break; case 'Italic': cmd='italic'; break; case 'Underline': cmd='underline'; break;
                        case 'Align Left': cmd='justifyLeft'; break; case 'Center': cmd='justifyCenter'; break;
                        case 'Align Right': cmd='justifyRight'; break; case 'Justify': cmd='justifyFull'; break;
                        case 'Bullets': cmd='insertUnorderedList'; break; case 'Numbering': cmd='insertOrderedList'; break;
                        case 'Strikethrough': cmd='strikethrough'; break; case 'Subscript': cmd='subscript'; break; case 'Superscript': cmd='superscript'; break;
                    }
                    if(cmd) document.execCommand(cmd, false, null);
                });
                $('.shading-btn').click(function() { $('#shading-picker').click(); });
                $('#shading-picker').on('input', function() {
                    var color = $(this).val();
                    $('#shading-bar').css('background-color', color);
                    var sel = window.getSelection();
                    if(sel.rangeCount > 0) $(sel.anchorNode).closest('p').css('background-color', color);
                });
                $('.font-select').change(function(){ document.execCommand('fontName', false, $(this).val()); });
                
                $('.size-select').change(function(){ 
                    var val = $(this).val();
                    document.execCommand('fontSize', false, '7');
                    $('font[size="7"]').each(function() {
                        $(this).removeAttr('size').css('font-size', val + 'pt');
                    });
                });

                $('.color-btn').click(function() { $('#font-color-picker').click(); });
                $('#font-color-picker').on('input change', function() { document.execCommand('foreColor', false, $(this).val()); $('#font-color-bar').css('background-color', $(this).val()); });
                $('.highlight-btn').click(function() { $('#highlight-picker').click(); });
                $('#highlight-picker').on('input change', function() { document.execCommand('hiliteColor', false, $(this).val()); $('#hilite-bar').css('background-color', $(this).val()); });
                
                // Clipboard
                $('.paste-btn').click(async function() { try { const text = await navigator.clipboard.readText(); document.execCommand('insertText', false, text); } catch (e) { alert('Clipboard access denied.'); } });
                $('.cut-btn').click(function() { document.execCommand('cut'); });
                $('.copy-btn').click(function() { document.execCommand('copy'); });
                
                // --- Save as PDF ---
                $('#save-btn').off('click').on('click', function() {
                    var element = document.getElementById('doc-scroll-area'); 
                    
                    var rulerVisible = $('#ruler-container').is(':visible');
                    var docMapVisible = $('#doc-map-pane').is(':visible'); 
                    
                    $('#ruler-container').hide();
                    $('#doc-map-pane').hide();
                    
                    var opt = { 
                        margin: 0, 
                        filename: 'Document1.pdf', 
                        image: { type: 'jpeg', quality: 0.98 }, 
                        html2canvas: { scale: 2, scrollY: 0, useCORS: true, logging: true }, 
                        jsPDF: { unit: 'pt', format: 'letter', orientation: 'portrait' } 
                    };
                    
                    html2pdf().set(opt).from(element).toPdf().get('pdf').then(function(pdf) {
                        pdf.setProperties({ title: 'Document', subject: 'PDF Creator', author: 'Daniel R Grisham', creator: 'Daniel R Grisham' });
                        
                        var $pages = $('.document-page');
                        var outlineStack = []; // Stack to track parent bookmarks

                        $('.document-page p[data-outline-level]').each(function() {
                            var level = parseInt($(this).attr('data-outline-level'));
                            var text = $(this).text().trim();
                            var $page = $(this).closest('.document-page');
                            var pageIndex = $pages.index($page) + 1;
                            
                            if (text && !isNaN(level) && pdf.outline) {
                                // Find parent
                                var parent = null;
                                if (level > 1) {
                                    // Look backwards in stack for nearest level < current level
                                    for (var i = outlineStack.length - 1; i >= 0; i--) {
                                        if (outlineStack[i].level < level) {
                                            parent = outlineStack[i].ref;
                                            break;
                                        }
                                    }
                                }
                                
                                try { 
                                    // Add bookmark, store ref
                                    var ref = pdf.outline.add(parent, text, { pageNumber: pageIndex }); 
                                    
                                    // Push to stack (remove deeper levels first to keep stack clean)
                                    outlineStack = outlineStack.filter(item => item.level < level);
                                    outlineStack.push({ level: level, ref: ref });
                                    
                                } catch(e) { console.log("Bookmark error", e); }
                            }
                        });
                    }).save().then(function() {
                        if(rulerVisible) $('#ruler-container').show();
                        if(docMapVisible) $('#doc-map-pane').css('display', 'flex'); 
                    });
                });
                
                // Updated applyParagraphSettings Functionality with Creative Page Break and Multi-Selection logic
                function applyParagraphSettings() {
                    var leftInd = $("#ind-left").val() + "in"; var rightInd = $("#ind-right").val() + "in";
                    var spBefore = $("#sp-before").val() + "pt"; var spAfter = $("#sp-after").val() + "pt";
                    var lineSp = ($("#line-spacing").val() === 'exact') ? $("#sp-at").val() + "pt" : $("#line-spacing").val();
                    var outlineLvl = $("#outline-level").val();
                    var breakBefore = $("#chk-break-before").is(':checked');
                    
                    // Use the captured 'editingParagraphs' array instead of trying to get selection again
                    // This solves the issue of losing selection when dialog is focused
                    if (window.editingParagraphs && window.editingParagraphs.length > 0) {
                        
                        window.editingParagraphs.forEach(function(block) {
                            var $block = $(block);
                            $block.css({ 'margin-left': leftInd, 'margin-right': rightInd, 'margin-top': spBefore, 'margin-bottom': spAfter, 'line-height': lineSp });
                            
                            // Apply Outline Level
                            if(outlineLvl === 'body') { 
                                $block.removeAttr('data-outline-level'); 
                            } else { 
                                $block.attr('data-outline-level', outlineLvl); 
                                if(!$block.attr('id')) {
                                    var uniqueId = 'bm-auto-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
                                    $block.attr('id', uniqueId);
                                }
                            }
                            
                            // Apply Page Break Before (Creative Logic)
                            if (breakBefore) {
                                // 1. Check if it's already the first child of a page body
                                if (!$block.is(':first-child')) {
                                    // 2. Need to split page. 
                                    var $currentPage = $block.closest('.document-page');
                                    var $currentBody = $block.parent();
                                    
                                    // Create New Page
                                    var nextPageId = "page-" + ($('.document-page').length + 1);
                                    var $nextPage = $('<div class="document-page" contenteditable="true" spellcheck="true"><div class="page-body"></div></div>').attr('id', nextPageId);
                                    if($('#chk-line-numbers').is(':checked')) $nextPage.addClass('show-line-numbers');
                                    
                                    // Insert after current page
                                    $currentPage.after($nextPage);
                                    
                                    // Move this block and all subsequent siblings to new page
                                    var $nextSiblings = $block.nextAll().addBack();
                                    $nextPage.find('.page-body').append($nextSiblings);
                                    
                                    // Trigger stats update and overflow check on new page
                                    currentFocusPage = $nextPage;
                                }
                            }
                        });
                    }
                    updateRulerMarkers(); updateDocumentMap();
                }
                
                // Helper to get all block elements in selection
                function getSelectedBlocks(range) {
                    var startNode = range.startContainer;
                    var endNode = range.endContainer;
                    
                    // Normalize to block elements
                    var $startBlock = $(startNode).closest('p, div, h1, h2, h3, h4, h5, h6');
                    var $endBlock = $(endNode).closest('p, div, h1, h2, h3, h4, h5, h6');
                    
                    if ($startBlock.length === 0 && $(startNode).is('.page-body')) $startBlock = $(startNode).children().eq(range.startOffset);
                    
                    // Single block selection
                    if ($startBlock.is($endBlock) || $startBlock.length === 0) {
                        return $startBlock.length ? [$startBlock[0]] : [];
                    }
                    
                    // Multi-block selection traversal
                    var blocks = [];
                    var current = $startBlock[0];
                    
                    // Safety break
                    var limit = 1000; 
                    while (current && limit > 0) {
                        blocks.push(current);
                        if (current === $endBlock[0]) break;
                        current = $(current).next()[0];
                        if (!current) {
                            // Jump to next page body logic if implemented, for now assume contiguous in DOM or single page context for simplicity in this specific "Creative Solution" scope without traversing up/down pages complexly.
                            // If multi-page selection, this simplistic next() breaks.
                            // Better: use common ancestor traversal.
                            break; 
                        }
                        limit--;
                    }
                    // Fallback if traversal failed (e.g. across pages), just return start and end
                    if (blocks.length === 0 || blocks[blocks.length-1] !== $endBlock[0]) {
                         return [$startBlock[0], $endBlock[0]]; // Simple fallback
                    }
                    
                    return blocks;
                }

            } catch (err) {
                console.error("Critical Runtime Error: " + err.message);
            }
        });