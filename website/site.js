// OS display config
    var OS_CONFIG = {
      windows: { name: 'Windows', icon: '🪟' },
      macos:   { name: 'macOS',   icon: '🍎' },
      linux:   { name: 'Linux',   icon: '🐧' }
    };

    // GitHub repository URL (edit here if the repo path changes)
    var REPO_URL = 'https://github.com/az0512124155azz-sys/ai-screen-control';
    // Where the ready-made installers live (created by the build workflow)
    var RELEASES_URL = REPO_URL + '/releases/latest';

    var currentOS = null;
    var DL_CACHE = '';
    var DL_FILENAME = '';

    var lastFocused = null;

    function openDownloadModal(os) {
      currentOS = os;
      lastFocused = document.activeElement;
      renderChoiceStep();
      var modal = document.getElementById('downloadModal');
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      // Move focus into the dialog for keyboard/screen-reader users
      var closeBtn = modal.querySelector('.modal-close');
      if (closeBtn) closeBtn.focus();
    }

    function closeModal() {
      document.getElementById('downloadModal').classList.remove('active');
      document.body.style.overflow = '';
      // Return focus to the element that opened the dialog
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    // Step 1: Ask installer file vs manual
    function renderChoiceStep() {
      var cfg = OS_CONFIG[currentOS];
      document.getElementById('modalTitle').textContent = cfg.icon + '  Install on ' + cfg.name;
      document.getElementById('modalBody').innerHTML =
        '<p style="text-align:center; color:var(--text-light); margin-bottom:28px; font-size:15px;">' +
        'How would you like to install AI Screen Control?</p>' +
        '<div class="choice-grid">' +
          '<div class="choice-card" role="button" tabindex="0" aria-label="Download the installer file" ' +
            'onclick="chooseMethod(\'installer\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();chooseMethod(\'installer\');}">' +
            '<div class="choice-icon" aria-hidden="true">📦</div>' +
            '<h4>Download Installer</h4>' +
            '<p>Get the ready-made installer file, run it, and the app installs itself. No terminal.</p>' +
            '<span class="choice-tag">Easiest • Recommended</span>' +
          '</div>' +
          '<div class="choice-card" role="button" tabindex="0" aria-label="Build from source" ' +
            'onclick="chooseMethod(\'manual\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();chooseMethod(\'manual\');}">' +
            '<div class="choice-icon" aria-hidden="true">🛠️</div>' +
            '<h4>Build from Source</h4>' +
            '<p>Compile it yourself with full control. For developers.</p>' +
            '<span class="choice-tag">Advanced</span>' +
          '</div>' +
        '</div>';
    }

    // Step 2: user picked a method -> show on-screen guide
    // (copy buttons for commands, clickable links that open in the browser).
    function chooseMethod(method) {
      var cfg = OS_CONFIG[currentOS];
      var title = (method === 'installer' ? '📦 Quick Setup' : '🛠️ Manual Install') + ' — ' + cfg.name;
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalBody').innerHTML =
        '<button class="modal-back" onclick="renderChoiceStep()">← Back to methods</button>' +
        renderInstructions(currentOS, method) +
        '<div class="modal-note" role="note">' +
          '🎥 <strong>YouTube video analysis requires a Gemini API key</strong> — only Gemini can read full video content. ' +
          'You can also connect several AI providers and use them in parallel.' +
        '</div>';
      // Reset scroll to top of the dialog body
      document.getElementById('modalBody').scrollTop = 0;
    }

    // Build the file that gets downloaded.
    // NOTE: we download plain-text .txt guides (NOT .bat/.sh scripts) because
    // Windows/macOS block executable scripts downloaded from the internet
    // ("Mark of the Web"). A .txt guide always opens, and the user copy-pastes
    // the commands — safe and never blocked.
    function buildDownloadFile(os, method) {
      var osName = OS_CONFIG[os].name;
      var filename = 'AIScreenControl-' + osName + '-' +
        (method === 'installer' ? 'QuickSetup' : 'ManualInstall') + '.txt';
      var content = method === 'installer' ? quickSetupGuide(os) : manualGuide(os);
      return { filename: filename, content: content };
    }

    function triggerDownload(filename, content) {
      var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    // ---- Screen-control permission text (shared) ----
    function screenControlText(os) {
      if (os === 'windows') {
        return 'ENABLE SCREEN CONTROL:\r\n' +
          '  Nothing to type. Screen capture and control work automatically.\r\n' +
          '  If Windows Firewall asks, click Allow.\r\n';
      }
      if (os === 'macos') {
        return 'ENABLE SCREEN CONTROL:\r\n' +
          '  Open System Settings > Privacy & Security and turn ON\r\n' +
          '  "AI Screen Control" under BOTH: Screen Recording AND Accessibility.\r\n' +
          '  If macOS blocks the app as unverified, run this once in Terminal:\r\n' +
          '    xattr -dr com.apple.quarantine "/Applications/AI Screen Control.app"\r\n';
      }
      return 'ENABLE SCREEN CONTROL:\r\n' +
        '  Install the tools the app uses to capture/control the screen:\r\n' +
        '    sudo apt install -y xdotool gnome-screenshot\r\n' +
        '  On Wayland, allow screen sharing when your desktop asks.\r\n';
    }

    // ---- Installer guide (text) ----
    function quickSetupGuide(os) {
      var fileName = { windows: '.msi / .exe', macos: '.dmg', linux: '.AppImage or .deb' }[os];
      var run = {
        windows: '  Double-click the file. If SmartScreen appears: More info > Run anyway.',
        macos:   '  Open the .dmg, drag the app to Applications, then right-click > Open.',
        linux:   '  chmod +x AIScreenControl*.AppImage  &&  ./AIScreenControl*.AppImage'
      }[os];
      return 'AI SCREEN CONTROL - INSTALLER (' + OS_CONFIG[os].name + ')\r\n' +
        '======================================================\r\n\r\n' +
        'STEP 1 - Download the ' + fileName + ' installer:\r\n' +
        '  ' + RELEASES_URL + '\r\n\r\n' +
        'STEP 2 - Run the installer:\r\n' + run + '\r\n\r\n' +
        'STEP 3 - ' + screenControlText(os) + '\r\n' +
        'STEP 4 - Add your API key:\r\n' +
        '  Open the app > Settings (gear) > paste your key > Save.\r\n\r\n' +
        'GET AN API KEY:\r\n' +
        '  Claude  -> https://console.anthropic.com/settings/keys\r\n' +
        '  OpenAI  -> https://platform.openai.com/api-keys\r\n' +
        '  Gemini  -> https://aistudio.google.com/app/apikey\r\n\r\n' +
        'NOTE: To analyze YouTube videos you MUST use a Gemini API key.\r\n' +
        'You can also add several API keys and use multiple AIs at once.\r\n';
    }

    // ---- Build-from-source guide (text) ----
    function manualGuide(os) {
      var pre = {
        windows: 'Node.js (https://nodejs.org), Rust (https://rustup.rs), and Visual C++ Build Tools.',
        macos:   'Node.js (https://nodejs.org), Rust (https://rustup.rs), and Xcode CLT: xcode-select --install',
        linux:   'Node.js, Rust (https://rustup.rs), and: sudo apt install libwebkit2gtk-4.1-dev build-essential'
      }[os];
      return 'AI SCREEN CONTROL - BUILD FROM SOURCE (' + OS_CONFIG[os].name + ')\r\n' +
        '======================================================\r\n\r\n' +
        'PREREQUISITES:\r\n  ' + pre + '\r\n\r\n' +
        'BUILD:\r\n' +
        '  git clone ' + REPO_URL + '.git\r\n' +
        '  cd ai-screen-control\r\n' +
        '  npm install\r\n' +
        '  npm run tauri-build\r\n\r\n' +
        'The finished installer will be in:\r\n' +
        '  src-tauri/target/release/bundle/\r\n\r\n' +
        screenControlText(os) + '\r\n' +
        'ADD YOUR API KEY:\r\n' +
        '  Open the app > Settings (gear) > paste your key > Save.\r\n\r\n' +
        'NOTE: YouTube video analysis requires a Gemini API key.\r\n' +
        'You can configure multiple API keys and run several AIs in parallel.\r\n';
    }

    // ---- On-screen instructions: copy buttons + clickable links ----
    function renderInstructions(os, method) {
      return method === 'installer' ? installerFlow(os) : sourceFlow(os);
    }

    // Real installer flow: download the file, run it, grant permissions
    function installerFlow(os) {
      var fileName = { windows: '.msi / .exe installer', macos: '.dmg installer', linux: '.AppImage or .deb' }[os];
      var runStep = {
        windows: '<span>Double-click the downloaded file. If Windows SmartScreen appears, click ' +
          '<strong>More info → Run anyway</strong> (the app is new, not signed yet), then follow the setup.</span>',
        macos: '<span>Open the .dmg and drag the app to <strong>Applications</strong>. ' +
          'The first time, <strong>right-click the app → Open</strong> to bypass the "unidentified developer" warning.</span>',
        linux: '<span>Make the .AppImage executable and run it, or install the .deb:</span>' +
          cmd('chmod +x AIScreenControl*.AppImage') +
          cmd('./AIScreenControl*.AppImage')
      }[os];

      var html = '<ol class="install-steps">';

      html += '<li><strong>Download the app</strong>' +
        '<span>Get the ' + fileName + ' for ' + OS_CONFIG[os].name + ':</span>' +
        '<div class="link-row"><a class="link-chip primary-chip" ' +
          'href="' + RELEASES_URL + '" target="_blank" rel="noopener">📥 Download the app ↗</a></div></li>';

      html += '<li><strong>Run the installer</strong>' + runStep + '</li>';

      html += ollamaStep(os);

      html += screenControlStep(os);

      html += '<li><strong>Prefer a smarter (paid) AI? Optional</strong>' +
        '<span>Local AI is free. If you want Claude/GPT/Gemini instead, open Settings → paste a key (these now need billing):</span>' +
        apiKeyLinks() + '</li>';

      html += '</ol>';
      return html;
    }

    // Free-AI step: a button that downloads Ollama AND opens a detailed guide.
    function ollamaStep(os) {
      return '<li class="free-step"><strong>💻 Get the free AI (recommended)</strong>' +
        '<span>Ollama is the free brain that runs on your computer — no key, no credit card. ' +
        'Click below to download it and get full step-by-step instructions:</span>' +
        '<div class="link-row"><button class="link-chip primary-chip" onclick="showOllamaGuide(\'' + os + '\')">' +
        '💻 Download Ollama &amp; show me how →</button></div></li>';
    }

    var OLLAMA_URL = {
      windows: 'https://ollama.com/download/windows',
      macos: 'https://ollama.com/download/mac',
      linux: 'https://ollama.com/download/linux'
    };

    // Detailed screen shown after the user chooses to set up Ollama:
    // starts the download and explains how to run it and connect it to the app.
    function showOllamaGuide(os) {
      var name = OS_CONFIG[os].name;
      var url = OLLAMA_URL[os];
      // Start the download.
      window.open(url, '_blank');

      var runVerify = {
        windows: 'Run the downloaded <strong>OllamaSetup.exe</strong> and click through the installer. When it finishes, Ollama starts automatically — you\'ll see its icon in the system tray (bottom-right).',
        macos: 'Open the downloaded file and drag <strong>Ollama</strong> to Applications, then launch it once. You\'ll see the Ollama icon in the menu bar (top-right) — that means it\'s running.',
        linux: 'Install with the one-line command below; it also starts the Ollama service automatically.'
      }[os];

      var steps = '<ol class="install-steps">';

      // 1. Install
      steps += '<li><strong>Install Ollama</strong><span>' + runVerify + '</span>' +
        (os === 'linux' ? cmd('curl -fsSL https://ollama.com/install.sh | sh') : '') + '</li>';

      // 2. Download the model
      steps += '<li><strong>Download a model that can see the screen</strong>' +
        '<span>Open a terminal (' + (os === 'windows' ? 'search “cmd” in Start' : 'Terminal') +
        ') and run this once. It\'s a few GB, so give it a minute:</span>' +
        cmd('ollama pull llama3.2-vision') +
        '<span>When it finishes, the free AI is ready.</span></li>';

      // 3. Connect to the app
      steps += '<li><strong>Connect it to AI Screen Control</strong>' +
        '<span>Open the app, click the ⚙️ Settings gear, choose <strong>💻 Local AI · Free</strong>, and press Save. ' +
        'No API key needed — the app finds Ollama automatically.</span></li>';

      // 4. Use it
      steps += '<li><strong>Start using it — free</strong>' +
        '<span>Tap the bubble, ask a question, and the local AI answers using your screen. Everything stays on your computer.</span></li>';

      // Troubleshooting
      steps += '<li><strong>If it says “can\'t reach the local AI”</strong>' +
        '<span>Make sure Ollama is running (its icon should be visible), and that the model finished downloading. You can re-check by running:</span>' +
        cmd('ollama list') +
        '<span><code>llama3.2-vision</code> should appear in the list.</span></li>';

      steps += '</ol>';

      document.getElementById('modalTitle').textContent = '💻 Free AI setup — ' + name;
      document.getElementById('modalBody').innerHTML =
        '<button class="modal-back" onclick="chooseMethod(\'installer\')">← Back to install steps</button>' +
        '<div class="download-banner"><div class="dl-icon">⬇️</div><div class="dl-text">' +
        '<strong>Ollama is downloading…</strong><p>If it didn\'t start, use the button below.</p></div></div>' +
        '<div class="link-row" style="margin-bottom:18px;"><a class="link-chip primary-chip" href="' + url +
        '" target="_blank" rel="noopener">💻 Download Ollama for ' + name + ' again ↗</a></div>' +
        steps;
      document.getElementById('modalBody').scrollTop = 0;
    }

    // Build-from-source flow (for developers)
    function sourceFlow(os) {
      var termName = os === 'windows' ? 'Command Prompt (search "cmd" in Start)' : 'Terminal';
      var preLinks = linkChip('https://nodejs.org', 'Download Node.js') +
        linkChip('https://rustup.rs', 'Install Rust') +
        (os === 'windows' ? linkChip('https://git-scm.com/download/win', 'Download Git') : '');

      var html = '<ol class="install-steps">';

      html += '<li><strong>Install the prerequisites</strong>' +
        '<span>Click to open each page and install it (all free):</span>' +
        '<div class="link-row">' + preLinks + '</div></li>';

      html += '<li><strong>Open ' + termName + '</strong>' +
        '<span>Copy each line with its <em>Copy</em> button, paste it, and press Enter — one at a time:</span>' +
        cmd('git clone ' + REPO_URL + '.git') +
        cmd('cd ai-screen-control') +
        cmd('npm install') +
        cmd('npm run tauri-build') +
        '<span>The finished installer appears in <code>src-tauri/target/release/bundle/</code>.</span></li>';

      html += screenControlStep(os);

      html += '<li><strong>Add your API key</strong>' +
        '<span>Open the app → Settings (gear) → paste your key → Save. Click a provider to get a key:</span>' +
        apiKeyLinks() + '</li>';

      html += '</ol>';
      html += '<div class="link-row" style="justify-content:center; margin-top:6px;">' +
        linkChip(REPO_URL, '📂 Open the GitHub repository') + '</div>';
      return html;
    }

    // Shared step: what the user must do so the app can control the screen + show the bubble
    function screenControlStep(os) {
      if (os === 'windows') {
        return '<li><strong>Enable screen control</strong>' +
          '<span>Nothing to type — screen capture and control work automatically on Windows. ' +
          'If Windows Firewall asks, click <strong>Allow</strong>. The floating bubble appears once the app is open.</span></li>';
      }
      if (os === 'macos') {
        return '<li><strong>Enable screen control</strong>' +
          '<span>Give the app permission so it can see and control your screen and show the bubble. ' +
          'Open <strong>System Settings → Privacy & Security</strong> and switch <em>AI Screen Control</em> ON under both ' +
          '<strong>Screen Recording</strong> and <strong>Accessibility</strong>. If the app is blocked as unverified, run this once in Terminal:</span>' +
          cmd('xattr -dr com.apple.quarantine "/Applications/AI Screen Control.app"') +
          '</li>';
      }
      return '<li><strong>Enable screen control</strong>' +
        '<span>Install the small system tools the app uses to capture and control the screen, then open the app — the bubble appears:</span>' +
        cmd('sudo apt install -y xdotool gnome-screenshot') +
        '<span>On Wayland sessions, allow screen sharing when your desktop asks.</span></li>';
    }

    function apiKeyLinks() {
      return '<div class="link-row">' +
        linkChip('https://console.anthropic.com/settings/keys', '🤖 Get Claude key') +
        linkChip('https://platform.openai.com/api-keys', '⚡ Get OpenAI key') +
        linkChip('https://aistudio.google.com/app/apikey', '🎨 Get Gemini key') +
        '</div>';
    }

    // A command line with a working Copy button
    function cmd(command) {
      return '<div class="cmd-block"><code>' + escapeHtml(command) + '</code>' +
        '<button class="copy-btn" onclick="copyCmd(this)" aria-label="Copy command">Copy</button></div>';
    }

    // A clickable link that opens in a new browser tab
    function linkChip(url, label) {
      return '<a class="link-chip" href="' + url + '" target="_blank" rel="noopener">' + label + ' ↗</a>';
    }

    function escapeHtml(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
              .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Copy the command text to the clipboard, with visual feedback
    function copyCmd(btn) {
      var text = btn.parentNode.querySelector('code').textContent;
      var done = function () {
        btn.textContent = '✓ Copied'; btn.classList.add('copied');
        setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
      } else {
        fallbackCopy(text); done();
      }
    }
    function fallbackCopy(text) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
    }

    // Close on overlay click / Escape, and trap focus inside the dialog
    var modalEl = document.getElementById('downloadModal');
    if (modalEl) modalEl.addEventListener('click', function (e) { if (e.target === this) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (!modalEl || !modalEl.classList.contains('active')) return;
      if (e.key === 'Escape') { closeModal(); return; }
      if (e.key === 'Tab') {
        var focusable = modalEl.querySelectorAll(
          'button, [href], input, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    });

    // Reviews form — sends feedback to the owner by email (works on a static site).
    // ▸ Change REVIEWS_EMAIL to your real email address.
    var REVIEWS_EMAIL = 'you@example.com';
    function submitReview(e) {
      e.preventDefault();
      var name = document.getElementById('rv-name').value;
      var rating = document.getElementById('rv-rating').value;
      var msg = document.getElementById('rv-msg').value;
      var files = document.getElementById('rv-file').files;
      var note = files && files.length ? ('\n\n(' + files.length + ' file(s) selected — please attach them in your email.)') : '';
      var subject = encodeURIComponent('AI Screen Control feedback (' + rating + '★) from ' + name);
      var body = encodeURIComponent(msg + note + '\n\n— ' + name);
      window.location.href = 'mailto:' + REVIEWS_EMAIL + '?subject=' + subject + '&body=' + body;
    }

    // ---- Technical support chat widget (on-site chat box) ----
    function toggleSupport() {
      var p = document.getElementById('supportPanel');
      p.hidden = !p.hidden;
    }
    function openSupport() {
      document.getElementById('supportPanel').hidden = false;
      document.getElementById('supportWidget').scrollIntoView({ behavior: 'smooth' });
    }
    function supportAddMsg(text, who) {
      var log = document.getElementById('supportLog');
      var d = document.createElement('div');
      d.className = 's-msg ' + who;
      d.textContent = text;
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
    }
    var supportFiles = [];
    function supportFilePicked() {
      var f = document.getElementById('supportFile').files;
      supportFiles = f;
      if (f && f.length) supportAddMsg('📎 ' + f.length + ' file(s) attached', 'me');
    }
    function sendSupport() {
      var t = document.getElementById('supportMsg').value.trim();
      if (!t) return;
      supportAddMsg(t, 'me');
      document.getElementById('supportMsg').value = '';
      setTimeout(function () {
        supportAddMsg('Thanks! Your message is noted. A team member will reply here shortly. 🙌', 'bot');
      }, 500);
    }

    // ---- Secret admin edit area (no backend, no WordPress) ----
    // Open it with the secret shortcut  Ctrl + Shift + E  (or add #admin to the URL).
    // ▸ Change ADMIN_PASS to your own secret password.
    var ADMIN_PASS = 'Avishai2025!';
    function showAdminLogin() {
      var box = document.getElementById('adminLogin');
      box.hidden = false;
      document.getElementById('adminErr').hidden = true;
      var f = document.getElementById('adminPass'); f.value = '';
      setTimeout(function () { f.focus(); }, 50);
    }
    function tryAdmin(e) {
      if (e) e.preventDefault();
      if (document.getElementById('adminPass').value !== ADMIN_PASS) {
        document.getElementById('adminErr').hidden = false; return;
      }
      document.getElementById('adminLogin').hidden = true;
      startEditing();
    }
    function startEditing() {
      document.body.classList.add('admin-editing');
      document.querySelectorAll('h1, h2, h3, h4, p, li, .hero-badge, .feature-card, .doc-card').forEach(function (el) {
        if (el.closest('#adminBar') || el.closest('#supportWidget') || el.closest('.modal') || el.closest('#adminLogin')) return;
        el.setAttribute('contenteditable', 'true');
      });
      var bar = document.createElement('div');
      bar.id = 'adminBar';
      bar.innerHTML = '✏️ Edit mode — click any text and type to change it. ' +
        '<button onclick="adminSave()">💾 Save &amp; download</button>' +
        '<button class="exit" onclick="location.reload()">Exit</button>';
      document.body.appendChild(bar);
      document.body.style.paddingTop = '48px';
    }
    // Triggers: keyboard shortcut and #admin
    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e')) { e.preventDefault(); showAdminLogin(); }
    });
    function adminSave() {
      // Clean up the editing UI before exporting a pristine copy.
      document.querySelectorAll('[contenteditable]').forEach(function (el) { el.removeAttribute('contenteditable'); });
      var bar = document.getElementById('adminBar'); if (bar) bar.remove();
      document.body.classList.remove('admin-editing');
      document.body.style.paddingTop = '';
      var html = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'standalone.html';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 800);
      alert('Saved! Upload the downloaded "standalone.html" to update your live site (or send it to me).');
    }

    // Smooth scroll for nav
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var t = document.querySelector(this.getAttribute('href'));
        if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
      });
    });

    // Reveal cards/sections smoothly as they scroll into view, with a gentle stagger.
    (function () {
      var items = document.querySelectorAll(
        '.feature-card, .os-card, .doc-card, .localai-step, .step, .faq-item, .localai-card'
      );
      if (!('IntersectionObserver' in window)) {
        items.forEach(function (el) { el.classList.add('in'); });
        return;
      }
      items.forEach(function (el) { el.classList.add('reveal'); });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var el = entry.target;
            var group = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
            el.style.transitionDelay = Math.min(group, 5) * 70 + 'ms';
            el.classList.add('in');
            io.unobserve(el);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      items.forEach(function (el) { io.observe(el); });
    })();
