/* ========================================
   Emotional Age Test - Scenario Slider
   10 scenarios with continuous slider (0-100)
   Average = maturity score, mapped to emotional age
   ======================================== */

(function() {
    'use strict';

    // --- i18n helpers (try-catch) ---
    function getI18n() {
        try {
            if (typeof i18n !== 'undefined' && i18n) return i18n;
        } catch (e) { /* ignore */ }
        return null;
    }

    function t(key, fallback) {
        try {
            var inst = getI18n();
            if (inst && typeof inst.t === 'function') {
                var val = inst.t(key);
                if (val && val !== key) return val;
            }
        } catch (e) { /* ignore */ }
        return fallback || key;
    }

    function fmt(template, values) {
        var result = template;
        for (var k in values) {
            if (values.hasOwnProperty(k)) {
                result = result.replace(new RegExp('\\{' + k + '\\}', 'g'), values[k]);
            }
        }
        return result;
    }

    function $(id) { return document.getElementById(id); }

    // --- Scenario definitions ---
    // Each scenario: key, emoji, i18n keys for text/left/right labels
    var scenarios = [
        { key: 's1',  emoji: '\uD83D\uDE24' }, // huffing face - friend cancels
        { key: 's2',  emoji: '\uD83D\uDCDD' }, // memo - criticism at work
        { key: 's3',  emoji: '\uD83D\uDCF1' }, // phone - partner no text
        { key: 's4',  emoji: '\uD83D\uDCA5' }, // collision - big mistake
        { key: 's5',  emoji: '\uD83D\uDEB6' }, // person walking - cut in line
        { key: 's6',  emoji: '\uD83D\uDC94' }, // broken heart - ex posts
        { key: 's7',  emoji: '\u2B50'        }, // star - friend achieves
        { key: 's8',  emoji: '\uD83E\uDD14' }, // thinking - misunderstood
        { key: 's9',  emoji: '\uD83C\uDF0A' }, // wave - overwhelmed
        { key: 's10', emoji: '\uD83D\uDE20' }  // angry face - rude stranger
    ];

    var TOTAL_SCENARIOS = scenarios.length;

    // --- Tier definitions ---
    // Maturity score 0-100 mapped to tiers
    var tiers = [
        { key: 'child',  emoji: '\uD83D\uDE22', color: '#ef4444', minScore: 0,  maxScore: 20, minAge: 5,  maxAge: 10 },
        { key: 'teen',   emoji: '\uD83D\uDE16', color: '#f59e0b', minScore: 21, maxScore: 40, minAge: 11, maxAge: 17 },
        { key: 'young',  emoji: '\uD83D\uDE0A', color: '#3b82f6', minScore: 41, maxScore: 60, minAge: 18, maxAge: 30 },
        { key: 'mature', emoji: '\uD83E\uDDD8', color: '#22c55e', minScore: 61, maxScore: 80, minAge: 31, maxAge: 55 },
        { key: 'elder',  emoji: '\uD83E\uDDD3', color: '#a855f7', minScore: 81, maxScore: 100, minAge: 56, maxAge: 80 }
    ];

    // --- State ---
    var currentScenario = 0;
    var sliderValues = [];
    var isTransitioning = false;

    // --- DOM caching ---
    var startScreen = $('startScreen');
    var quizScreen = $('quizScreen');
    var resultScreen = $('resultScreen');
    var startBtn = $('startBtn');
    var progressFill = $('progressFill');
    var progressText = $('progressText');
    var scenarioEmoji = $('scenarioEmoji');
    var scenarioText = $('scenarioText');
    var labelLeft = $('labelLeft');
    var labelRight = $('labelRight');
    var scenarioSlider = $('scenarioSlider');
    var sliderValueIndicator = $('sliderValueIndicator');
    var nextBtn = $('nextBtn');
    var questionCard = $('questionCard');
    var resultCard = $('resultCard');
    var tierBadge = $('tierBadge');
    var ageNumber = $('ageNumber');
    var tierName = $('tierName');
    var tierDesc = $('tierDesc');
    var spectrumMarker = $('spectrumMarker');
    var retakeBtn = $('retakeBtn');
    var shareTwitterBtn = $('shareTwitter');
    var shareCopyBtn = $('shareCopy');
    var themeToggle = $('themeToggle');
    var themeIcon = $('themeIcon');
    var langBtn = $('langBtn');
    var langDropdown = $('langDropdown');
    var currentLangLabel = $('currentLang');

    // --- Language name map ---
    var langNames = {
        ko: '\uD55C\uAD6D\uC5B4', en: 'English', zh: '\u4E2D\u6587',
        hi: '\u0939\u093F\u0928\u094D\u0926\u0940', ru: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439',
        ja: '\u65E5\u672C\u8A9E', es: 'Espa\u00F1ol', pt: 'Portugu\u00EAs',
        id: 'Indonesia', tr: 'T\u00FCrk\u00E7e', de: 'Deutsch', fr: 'Fran\u00E7ais'
    };

    // --- Get tier from maturity score (0-100) ---
    function getTier(score) {
        for (var i = tiers.length - 1; i >= 0; i--) {
            if (score >= tiers[i].minScore) return tiers[i];
        }
        return tiers[0];
    }

    // --- Calculate emotional age from maturity score ---
    function calculateAge(score) {
        var tier = getTier(score);
        var scoreRange = tier.maxScore - tier.minScore;
        var ageRange = tier.maxAge - tier.minAge;
        var progress = scoreRange > 0 ? (score - tier.minScore) / scoreRange : 0;
        return Math.round(tier.minAge + ageRange * progress);
    }

    // --- Screen management ---
    function showScreen(screen) {
        startScreen.style.display = 'none';
        quizScreen.style.display = 'none';
        resultScreen.style.display = 'none';
        startScreen.classList.remove('active');
        quizScreen.classList.remove('active');
        resultScreen.classList.remove('active');
        screen.style.display = '';
        screen.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // --- Theme toggle ---
    function initTheme() {
        var saved = localStorage.getItem('theme');
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
        }
        updateThemeIcon();
    }

    function updateThemeIcon() {
        var current = document.documentElement.getAttribute('data-theme');
        if (themeIcon) {
            themeIcon.textContent = current === 'light' ? '\uD83C\uDF19' : '\u2600\uFE0F';
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            var current = document.documentElement.getAttribute('data-theme');
            var next = current === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            updateThemeIcon();
        });
    }

    // --- Language selector ---
    function initLangSelector() {
        if (!langBtn || !langDropdown) return;

        langBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            langDropdown.classList.toggle('active');
        });

        document.addEventListener('click', function(e) {
            if (!langDropdown.contains(e.target) && e.target !== langBtn) {
                langDropdown.classList.remove('active');
            }
        });

        var langOptions = langDropdown.querySelectorAll('.lang-option');
        langOptions.forEach(function(option) {
            option.addEventListener('click', function() {
                var lang = this.getAttribute('data-lang');
                langDropdown.classList.remove('active');

                var inst = getI18n();
                if (inst && typeof inst.setLanguage === 'function') {
                    inst.setLanguage(lang).then(function() {
                        if (currentLangLabel) {
                            currentLangLabel.textContent = langNames[lang] || lang;
                        }
                        refreshCurrentView();
                    }).catch(function() {});
                }
            });
        });

        // Set initial label
        var inst = getI18n();
        if (inst && currentLangLabel) {
            currentLangLabel.textContent = langNames[inst.currentLang] || inst.currentLang;
        }
    }

    // --- Refresh current view after language change ---
    function refreshCurrentView() {
        if (quizScreen.classList.contains('active')) {
            renderScenario();
        } else if (resultScreen.classList.contains('active')) {
            renderResult();
        }
    }

    // --- Start quiz ---
    function startQuiz() {
        currentScenario = 0;
        sliderValues = [];
        isTransitioning = false;
        showScreen(quizScreen);
        renderScenario();

        if (typeof gtag === 'function') {
            gtag('event', 'quiz_start', { event_category: 'emotional-age' });
        }
    }

    // --- Render scenario ---
    function renderScenario() {
        var s = scenarios[currentScenario];
        var num = currentScenario + 1;

        // Update progress
        var pct = (currentScenario / TOTAL_SCENARIOS) * 100;
        progressFill.style.width = pct + '%';
        progressText.textContent = num + ' / ' + TOTAL_SCENARIOS;

        // Scenario emoji
        scenarioEmoji.textContent = s.emoji;

        // Scenario text via i18n
        scenarioText.textContent = t('scenarios.' + s.key + '.text', 'Scenario ' + num);

        // Slider labels
        labelLeft.textContent = t('scenarios.' + s.key + '.left', 'Reactive');
        labelRight.textContent = t('scenarios.' + s.key + '.right', 'Mature');

        // Reset slider to 50
        if (scenarioSlider) {
            scenarioSlider.value = 50;
            updateSliderIndicator(50);
        }

        // Update next button text (last scenario = finish)
        if (nextBtn) {
            if (currentScenario === TOTAL_SCENARIOS - 1) {
                nextBtn.textContent = t('quiz.finish', 'See My Result');
            } else {
                nextBtn.textContent = t('quiz.next', 'Next');
            }
        }
    }

    // --- Update slider value indicator position ---
    function updateSliderIndicator(value) {
        if (!sliderValueIndicator) return;
        sliderValueIndicator.textContent = value;
        // Position the indicator below the thumb
        var pct = value / 100;
        var sliderWidth = scenarioSlider.offsetWidth;
        // Account for thumb width (approx 48px)
        var thumbHalf = 24;
        var pos = thumbHalf + (sliderWidth - thumbHalf * 2) * pct;
        sliderValueIndicator.style.left = pos + 'px';
        sliderValueIndicator.style.transform = 'translateX(-50%)';
    }

    // --- Slider input handler ---
    if (scenarioSlider) {
        scenarioSlider.addEventListener('input', function() {
            updateSliderIndicator(parseInt(this.value, 10));
        });
    }

    // --- Next button handler ---
    function advanceScenario() {
        if (isTransitioning) return;
        isTransitioning = true;

        // Store current slider value
        var value = scenarioSlider ? parseInt(scenarioSlider.value, 10) : 50;
        sliderValues.push(value);

        if (currentScenario < TOTAL_SCENARIOS - 1) {
            currentScenario++;
            // Slide transition on question card
            if (questionCard) {
                questionCard.style.animation = 'none';
                questionCard.offsetHeight; // force reflow
                questionCard.style.animation = 'cardSlideIn 0.4s ease';
            }
            renderScenario();
            isTransitioning = false;
        } else {
            // Quiz complete
            progressFill.style.width = '100%';
            showScreen(resultScreen);
            renderResult();
            isTransitioning = false;
        }
    }

    // --- Calculate maturity score ---
    function getMaturityScore() {
        if (sliderValues.length === 0) return 50;
        var sum = 0;
        for (var i = 0; i < sliderValues.length; i++) {
            sum += sliderValues[i];
        }
        return Math.round(sum / sliderValues.length);
    }

    // --- Render result ---
    function renderResult() {
        var maturityScore = getMaturityScore();
        var tier = getTier(maturityScore);
        var emotionalAge = calculateAge(maturityScore);

        // Set tier class on result card
        if (resultCard) {
            resultCard.className = 'card result-card tier-' + tier.key;
        }

        // Tier badge emoji
        tierBadge.textContent = tier.emoji;

        // Age number with counting animation
        if (ageNumber) {
            ageNumber.textContent = '0';
            setTimeout(function() {
                animateNumber(ageNumber, 0, emotionalAge, 1200);
            }, 300);
        }

        // Tier name
        tierName.textContent = t('tiers.' + tier.key + '.name', tier.key);
        tierName.style.color = tier.color;

        // Tier description
        tierDesc.textContent = t('tiers.' + tier.key + '.desc', '');

        // Animate spectrum marker
        if (spectrumMarker) {
            spectrumMarker.style.left = '0%';
            setTimeout(function() {
                spectrumMarker.style.left = maturityScore + '%';
            }, 400);
        }

        // Render percentile stat
        renderPercentileStat(emotionalAge);

        // GA4 event
        if (typeof gtag === 'function') {
            gtag('event', 'quiz_complete', {
                event_category: 'emotional-age',
                event_label: tier.key,
                value: emotionalAge
            });
        }
    }

    // --- Render percentile stat ---
    function renderPercentileStat(age) {
        var percentileEl = $('percentile-stat');
        if (!percentileEl) return;

        // Distribution based on normal curve around maturity
        var percent = 0;
        if (age >= 5 && age <= 10) percent = 12;
        else if (age >= 11 && age <= 17) percent = 23;
        else if (age >= 18 && age <= 30) percent = 35;
        else if (age >= 31 && age <= 55) percent = 22;
        else if (age >= 56) percent = 8;

        var template = t('result.percentileStat', 'Only <strong>{percent}%</strong> share your emotional age');
        percentileEl.innerHTML = fmt(template, { percent: percent });
    }

    // --- Animate number counting ---
    function animateNumber(element, from, to, duration) {
        var startTime = null;
        var diff = to - from;

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var elapsed = timestamp - startTime;
            var progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            var eased = 1 - Math.pow(1 - progress, 3);
            var current = Math.round(from + diff * eased);
            element.textContent = current;
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }

        requestAnimationFrame(step);
    }

    // --- Share: Twitter ---
    function shareTwitter() {
        var maturityScore = getMaturityScore();
        var emotionalAge = calculateAge(maturityScore);
        var tier = getTier(maturityScore);
        var tierLabel = t('tiers.' + tier.key + '.name', tier.key);
        var text = fmt(t('share.text', 'My emotional age is {age} years! I\'m \"{tier}\" \uD83D\uDE22'), {
            age: emotionalAge,
            tier: tierLabel
        });
        var url = 'https://dopabrain.com/emotional-age/';
        window.open(
            'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url),
            '_blank',
            'noopener'
        );
        if (typeof gtag === 'function') {
            gtag('event', 'share', { method: 'twitter', content_type: 'quiz_result' });
        }
    }

    // --- Share: Copy URL ---
    function copyUrl() {
        var url = 'https://dopabrain.com/emotional-age/';
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(function() {
                showCopiedFeedback();
            }).catch(function() {
                fallbackCopy(url);
            });
        } else {
            fallbackCopy(url);
        }
        if (typeof gtag === 'function') {
            gtag('event', 'share', { method: 'copy', content_type: 'quiz_result' });
        }
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); showCopiedFeedback(); } catch (e) { /* ignore */ }
        document.body.removeChild(ta);
    }

    function showCopiedFeedback() {
        if (!shareCopyBtn) return;
        var original = shareCopyBtn.textContent;
        shareCopyBtn.textContent = t('share.copied', 'Copied!');
        shareCopyBtn.classList.add('copied');
        setTimeout(function() {
            shareCopyBtn.textContent = t('share.copyUrl', 'Copy Link');
            shareCopyBtn.classList.remove('copied');
        }, 2000);
    }

    // --- Hide loader ---
    function hideLoader() {
        var loader = $('app-loader');
        if (loader) {
            loader.classList.add('hidden');
        }
    }

    // --- Bind events ---
    function bindEvents() {
        if (startBtn) {
            startBtn.addEventListener('click', startQuiz);
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', advanceScenario);
        }

        if (retakeBtn) {
            retakeBtn.addEventListener('click', function() {
                showScreen(startScreen);
                if (ageNumber) ageNumber.textContent = '0';
                if (spectrumMarker) spectrumMarker.style.left = '0%';
            });
        }

        if (shareTwitterBtn) {
            shareTwitterBtn.addEventListener('click', shareTwitter);
        }

        if (shareCopyBtn) {
            shareCopyBtn.addEventListener('click', copyUrl);
        }
    }

    // --- Init ---
    function init() {
        initTheme();
        initLangSelector();
        bindEvents();

        var inst = getI18n();
        if (inst && typeof inst.loadTranslations === 'function') {
            inst.loadTranslations(inst.currentLang).then(function() {
                if (typeof inst.updateUI === 'function') {
                    inst.updateUI();
                }
                // Update lang label
                if (currentLangLabel) {
                    currentLangLabel.textContent = langNames[inst.currentLang] || inst.currentLang;
                }
                hideLoader();
            }).catch(function() {
                hideLoader();
            });
        } else {
            hideLoader();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
