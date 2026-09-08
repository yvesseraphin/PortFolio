(function () {
  "use strict";

  var PROJECT_ID  = "m77bsvm1";
  var DATASET     = "production";
  var API_VERSION = "2024-01-01";

  var slug = new URLSearchParams(window.location.search).get("slug") || "";

  var CACHE_KEY = "project_detail_cache_v2_" + slug;

  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY) || localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeCache(data) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function esc(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function sanityImgUrl(ref, width) {
    if (!ref) return "";
    var parts = ref.split("-");
    var ext  = parts[parts.length - 1];
    var dims = parts[parts.length - 2];
    var id   = parts.slice(1, parts.length - 2).join("-");
    var base = "https://cdn.sanity.io/images/" + PROJECT_ID + "/" + DATASET + "/" + id + "-" + dims + "." + ext;
    return base + (width ? "?w=" + width + "&auto=format&fit=max" : "");
  }

  function highlightCode(rawCode, lang) {
    if (!rawCode) return "";
    var lines = rawCode.split("\n");

    return lines.map(function (line) {
      if (!line.trim()) {
        return '<span class="code-line">&nbsp;</span>';
      }

      var l = esc(line);
      var tokens = [];

      // 1. Strings (single, double, backticks)
      l = l.replace(/(&quot;(?:\\.|[^&]|&(?!quot;))*&quot;|&#39;(?:\\.|[^&]|&(?!#39;))*&#39;|`(?:\\.|[^`])*`)/g, function (m) {
        var id = "___TOK_STR_" + tokens.length + "___";
        tokens.push('<span class="tok-str">' + m + '</span>');
        return id;
      });

      // 2. Comments (// or # or /* */)
      l = l.replace(/(\/\/.*$|#.*$|\/\*[\s\S]*?\*\/)/g, function (m) {
        var id = "___TOK_COM_" + tokens.length + "___";
        tokens.push('<span class="tok-com">' + m + '</span>');
        return id;
      });

      // 3. Keywords (JS/TS, Python, Rust, Go, etc.)
      l = l.replace(/\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|extends|new|this|super|import|export|from|async|await|try|catch|finally|throw|typeof|instanceof|in|of|interface|type|enum|public|private|protected|static|readonly|def|self|elif|lambda|pass|raise|yield|with|is|not|and|or|True|False|None|true|false|null|undefined)\b/g, '<span class="tok-kw">$1</span>');

      // 4. Numbers
      l = l.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');

      // 5. Function calls: foo(...)
      l = l.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/g, '<span class="tok-fn">$1</span>');

      // Restore protected tokens
      for (var i = 0; i < tokens.length; i++) {
        l = l.replace("___TOK_STR_" + i + "___", tokens[i]);
        l = l.replace("___TOK_COM_" + i + "___", tokens[i]);
      }

      return '<span class="code-line">' + l + '</span>';
    }).join("");
  }

  window.copySnippet = function (btn) {
    var wrap = btn.closest(".codeblock-wrap");
    if (!wrap) return;
    var codeEl = wrap.querySelector("code");
    if (!codeEl) return;
    var text = codeEl.innerText || codeEl.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        var prev = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(function () {
          btn.textContent = prev;
        }, 1800);
      });
    }
  };

  function renderSpans(children, markDefs) {
    if (!Array.isArray(children)) return "";
    return children
      .map(function (span) {
        var text  = esc(span.text || "");
        var marks = span.marks || [];
        marks.forEach(function (mark) {
          if (mark === "strong") {
            text = '<strong class="medium-bold">' + text + '</strong>';
          } else if (mark === "em") {
            text = "<em>" + text + "</em>";
          } else if (mark === "code") {
            text = '<code style="font-family:var(--fonts-mono);font-size:12px;background:var(--colors-gray3);padding:2px 5px;border-radius:4px;color:var(--colors-gray12);">' + text + '</code>';
          } else {
            var def = (markDefs || []).find(function (d) { return d._key === mark; });
            if (def && def._type === "link" && def.href) {
              text = '<a href="' + esc(def.href) + '" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;text-underline-offset:3px;color:var(--colors-gray12);">' + text + '</a>';
            }
          }
        });
        return text;
      })
      .join("");
  }

  function renderBlocks(blocks) {
    if (!Array.isArray(blocks) || !blocks.length) return "";
    var html = "";
    blocks.forEach(function (block) {
      if (!block) return;

      if (block._type === "codeBlock") {
        var lang = esc(block.language || "code");
        var rawCode = block.code || "";
        var highlighted = highlightCode(rawCode, lang);
        var captionLeft = block.caption ? '<span>' + esc(block.caption) + '</span>' : '<span>' + lang + '</span>';
        var header =
          '<div class="codeblock-header">' +
            captionLeft +
            '<button type="button" class="codeblock-copy-btn" onclick="copySnippet(this)">Copy</button>' +
          '</div>';
        html += '<div class="codeblock-wrap">' + header + '<pre class="codeblock-body"><code>' + highlighted + '</code></pre></div>';
        return;
      }

      if (block._type === "image") {
        var ref = block.asset && block.asset._ref;
        if (!ref) return;
        var cap = block.caption ? '<figcaption class="architecture-figcaption">' + esc(block.caption) + '</figcaption>' : "";
        html += '<figure style="margin:24px 0;border-radius:10px;overflow:hidden;border:1px solid var(--colors-gray4);background:var(--colors-gray2);">' +
          '<img src="' + esc(sanityImgUrl(ref, 1200)) + '" alt="' + esc(block.alt || "") + '" loading="lazy" style="width:100%;height:auto;display:block;">' +
          cap +
          '</figure>';
        return;
      }

      if (block._type !== "block") return;

      var style = block.style || "normal";
      var text = renderSpans(block.children || [], block.markDefs || []);

      if (style === "h2") {
        html += '<h2 style="font-size:16px;font-weight:500;margin:32px 0 12px;color:var(--colors-gray12);line-height:24px;">' + text + '</h2>';
      } else if (style === "h3") {
        html += '<h3 style="font-size:14px;font-weight:500;margin:24px 0 10px;color:var(--colors-gray12);">' + text + '</h3>';
      } else if (style === "blockquote") {
        html += '<blockquote class="quote-block">' + text + '</blockquote>';
      } else if (text.trim()) {
        html += '<p style="margin-bottom:14px;color:var(--colors-gray12);">' + text + '</p>';
      }
    });
    return html;
  }


  function updateSeo(p) {
    if (!p) return;
    var title = (p.title || "Project") + " — Seraphin";
    var desc = p.tagline || p.problem || "Project case study and technical breakdown by Seraphin.";
    document.title = title;

    var titleEl = document.getElementById("page-title");
    if (titleEl) titleEl.textContent = title;

    var metaDesc = document.getElementById("meta-description");
    if (metaDesc) metaDesc.setAttribute("content", desc);

    var ogTitle = document.getElementById("og-title");
    if (ogTitle) ogTitle.setAttribute("content", title);

    var ogDesc = document.getElementById("og-description");
    if (ogDesc) ogDesc.setAttribute("content", desc);

    var ogUrl = document.getElementById("og-url");
    if (ogUrl) ogUrl.setAttribute("content", window.location.href);

    var canonical = document.getElementById("canonical");
    if (canonical) canonical.setAttribute("href", window.location.href);

    if (p.coverImage && p.coverImage.asset && p.coverImage.asset._ref) {
      var imgUrl = sanityImgUrl(p.coverImage.asset._ref, 1200);
      var ogImg = document.getElementById("og-image");
      if (ogImg) ogImg.setAttribute("content", imgUrl);
    }
  }

  function renderProject(p) {
    var contentEl = document.getElementById("project-content");
    if (!contentEl || !p) return;

    var titleEl = document.getElementById("project-title");
    var taglineEl = document.getElementById("project-tagline");
    if (titleEl) titleEl.textContent = p.title || "Project";
    if (taglineEl) {
      var metaText = "";
      if (p.year) metaText += p.year;
      if (p.tagline) metaText += (metaText ? " · " : "") + p.tagline;
      taglineEl.textContent = metaText;
    }

    var html = "";

    // Hero Visual
    if (p.coverImage && p.coverImage.asset && p.coverImage.asset._ref) {
      var heroImg = sanityImgUrl(p.coverImage.asset._ref, 1400);
      html += '<div class="hero-media-wrap" style="margin-top:0">';
      html += '  <img class="hero-media-img" src="' + esc(heroImg) + '" alt="' + esc(p.coverImage.alt || p.title) + '" loading="eager" decoding="async" />';
      if (p.coverImage.alt) {
        html += '  <div class="hero-media-caption">' + esc(p.coverImage.alt) + '</div>';
      }
      html += '</div>';
    }

    // ── 2. Metadata at a Glance ──
    var hasMeta = p.role || p.timeline || p.teamSize || (p.techStack && p.techStack.length);
    if (hasMeta) {
      html += '<section class="meta-grid" aria-label="Metadata at a glance">';
      if (p.role) {
        html += '<div class="meta-item">';
        html += '  <span class="meta-label">Role</span>';
        html += '  <span class="meta-val">' + esc(p.role) + '</span>';
        html += '</div>';
      }
      if (p.timeline) {
        html += '<div class="meta-item">';
        html += '  <span class="meta-label">Timeline</span>';
        html += '  <span class="meta-val">' + esc(p.timeline) + '</span>';
        html += '</div>';
      }
      if (p.teamSize) {
        html += '<div class="meta-item">';
        html += '  <span class="meta-label">Team Context</span>';
        html += '  <span class="meta-val">' + esc(p.teamSize) + '</span>';
        html += '</div>';
      }
      if (p.techStack && p.techStack.length) {
        html += '<div class="meta-item meta-item--span-all">';
        html += '  <span class="meta-label">Core Tech Stack</span>';
        html += '  <div class="tech-pills">';
        p.techStack.forEach(function (tech) {
          html += '    <span class="tech-pill">' + esc(tech) + '</span>';
        });
        html += '  </div>';
        html += '</div>';
      }
      html += '</section>';
    }

    // ── 3. The Problem & Objective ──
    if (p.problem || p.targetUser || p.goal) {
      html += '<section class="section-block">';
      html += '  <h2 class="section-title">01 / The Problem &amp; Objective</h2>';
      html += '  <div class="problem-cards">';
      if (p.problem) {
        html += '    <div class="problem-card">';
        html += '      <div class="problem-card-title">';
        html += '        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>';
        html += '        The Problem';
        html += '      </div>';
        html += '      <p class="problem-card-text">' + esc(p.problem) + '</p>';
        html += '    </div>';
      }
      if (p.targetUser) {
        html += '    <div class="problem-card">';
        html += '      <div class="problem-card-title">';
        html += '        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
        html += '        Target User';
        html += '      </div>';
        html += '      <p class="problem-card-text">' + esc(p.targetUser) + '</p>';
        html += '    </div>';
      }
      if (p.goal) {
        html += '    <div class="problem-card">';
        html += '      <div class="problem-card-title">';
        html += '        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>';
        html += '        The Objective &amp; Goal';
        html += '      </div>';
        html += '      <p class="problem-card-text">' + esc(p.goal) + '</p>';
        html += '    </div>';
      }
      html += '  </div>';
      html += '</section>';
    }

    // ── 4. Your Direct Contribution ──
    if (p.directContribution && p.directContribution.length) {
      html += '<section class="section-block">';
      html += '  <h2 class="section-title">02 / Direct Contributions &amp; Ownership</h2>';
      html += '  <div class="contribution-box">';
      html += '    <ul class="contribution-list">';
      p.directContribution.forEach(function (contrib) {
        html += '      <li>';
        html += '        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
        html += '        <span>' + esc(contrib) + '</span>';
        html += '      </li>';
      });
      html += '    </ul>';
      html += '  </div>';
      html += '</section>';
    }

    // ── 5. Process & Architecture ──
    var archHtml = renderBlocks(p.processArchitecture);
    if (archHtml) {
      html += '<section class="section-block">';
      html += '  <h2 class="section-title">03 / Process &amp; Architecture</h2>';
      html += '  <div class="architecture-body">' + archHtml + '</div>';
      html += '</section>';
    }

    // ── 6. Key Challenges & Trade-offs ──
    if (p.challenges && p.challenges.length) {
      html += '<section class="section-block">';
      html += '  <h2 class="section-title">04 / Key Challenges &amp; Trade-offs</h2>';
      html += '  <div class="challenges-list">';
      p.challenges.forEach(function (ch) {
        html += '    <div class="challenge-card">';
        html += '      <div class="challenge-title">' + esc(ch.title) + '</div>';
        html += '      <div class="challenge-row">';
        html += '        <div class="challenge-subblock">';
        html += '          <span class="challenge-subblock-tag">The Roadblock</span>';
        html += '          <span class="challenge-subblock-text">' + esc(ch.roadblock) + '</span>';
        html += '        </div>';
        html += '        <div class="challenge-subblock">';
        html += '          <span class="challenge-subblock-tag">Resolution &amp; Trade-off</span>';
        html += '          <span class="challenge-subblock-text">' + esc(ch.tradeoff) + '</span>';
        html += '        </div>';
        html += '      </div>';
        html += '    </div>';
      });
      html += '  </div>';
      html += '</section>';
    }

    // ── 7. Results & Impact ──
    var hasMetrics = p.metrics && p.metrics.length;
    if (hasMetrics || p.impactSummary) {
      html += '<section class="section-block">';
      html += '  <h2 class="section-title">05 / Results &amp; Impact</h2>';
      if (hasMetrics) {
        html += '  <div class="metrics-grid">';
        p.metrics.forEach(function (m) {
          html += '    <div class="metric-card">';
          html += '      <div class="metric-num">' + esc(m.value) + '</div>';
          html += '      <div class="metric-lbl">' + esc(m.label) + '</div>';
          if (m.description) {
            html += '      <div class="metric-desc">' + esc(m.description) + '</div>';
          }
          html += '    </div>';
        });
        html += '  </div>';
      }
      if (p.impactSummary) {
        html += '  <div class="impact-summary-text">' + esc(p.impactSummary) + '</div>';
      }
      html += '</section>';
    }

    // ── 8. Artifacts & Links ──
    var hasArtifacts = p.liveDemoUrl || p.githubUrl || p.docsUrl || p.designSpecsUrl;
    if (hasArtifacts) {
      html += '<section class="section-block">';
      html += '  <h2 class="section-title">06 / Artifacts &amp; Links</h2>';
      html += '  <div class="artifacts-btns">';
      if (p.liveDemoUrl) {
        html += '    <a href="' + esc(p.liveDemoUrl) + '" target="_blank" rel="noopener noreferrer" class="artifact-btn artifact-btn--primary">';
        html += '      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
        html += '      Live Demo';
        html += '    </a>';
      }
      if (p.githubUrl) {
        html += '    <a href="' + esc(p.githubUrl) + '" target="_blank" rel="noopener noreferrer" class="artifact-btn">';
        html += '      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.475 2 2 6.475 2 12a9.994 9.994 0 006.838 9.488c.5.087.687-.213.687-.476 0-.237-.013-1.024-.013-1.862-2.512.463-3.162-.612-3.362-1.175-.113-.288-.6-1.175-1.025-1.413-.35-.187-.85-.65-.013-.662.788-.013 1.35.725 1.538 1.025.9 1.512 2.338 1.087 2.912.825.088-.65.35-1.087.638-1.337-2.225-.25-4.55-1.113-4.55-4.938 0-1.088.387-1.987 1.025-2.688-.1-.25-.45-1.275.1-2.65 0 0 .837-.262 2.75 1.026a9.28 9.28 0 012.5-.338c.85 0 1.7.112 2.5.337 1.912-1.3 2.75-1.024 2.75-1.024.55 1.375.2 2.4.1 2.65.637.7 1.025 1.587 1.025 2.687 0 3.838-2.337 4.688-4.562 4.938.362.312.675.912.675 1.85 0 1.337-.013 2.412-.013 2.75 0 .262.188.574.688.474A10.016 10.016 0 0022 12c0-5.525-4.475-10-10-10z"/></svg>';
        html += '      Source Code';
        html += '    </a>';
      }
      if (p.docsUrl) {
        html += '    <a href="' + esc(p.docsUrl) + '" target="_blank" rel="noopener noreferrer" class="artifact-btn">';
        html += '      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
        html += '      Documentation';
        html += '    </a>';
      }
      if (p.designSpecsUrl) {
        html += '    <a href="' + esc(p.designSpecsUrl) + '" target="_blank" rel="noopener noreferrer" class="artifact-btn">';
        html += '      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z"/><path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z"/><path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z"/><path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z"/><path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z"/></svg>';
        html += '      Design Specs';
        html += '    </a>';
      }
      html += '  </div>';
      html += '</section>';
    }

    contentEl.innerHTML = html;

    // ── Divider (matching blog post) ──
    var dividerEl = document.getElementById("project-divider");
    if (dividerEl) dividerEl.style.display = "";

    // ── Pagination Footer (matching blog post) ──
    var paginationEl = document.getElementById("project-pagination");
    if (paginationEl && (p.prev || p.next)) {
      var navHtml = "";
      if (p.prev) {
        navHtml += '<a class="project-nav-item" href="/projects/project/?slug=' + esc(p.prev.slug) + '">';
        navHtml += '  <div class="project-nav-label">&larr; Previous</div>';
        navHtml += '  <span class="project-nav-title">' + esc(p.prev.title) + '</span>';
        navHtml += '</a>';
      } else {
        navHtml += '<div></div>';
      }
      if (p.next) {
        navHtml += '<a class="project-nav-item" style="margin-left:auto;text-align:right" href="/projects/project/?slug=' + esc(p.next.slug) + '">';
        navHtml += '  <div class="project-nav-label" style="margin-left:auto">Next &rarr;</div>';
        navHtml += '  <span class="project-nav-title">' + esc(p.next.title) + '</span>';
        navHtml += '</a>';
      }
      paginationEl.innerHTML = navHtml;
      paginationEl.style.display = "flex";
    }
  }

  function initCopyButton() {
    var btn = document.getElementById("btn-copy-url");
    if (!btn || btn.dataset.init) return;
    btn.dataset.init = "true";
    btn.addEventListener("click", function () {
      var url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(showCopied, fallback);
      } else {
        fallback();
      }
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = url;
        ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          showCopied();
        } catch (e) {}
        document.body.removeChild(ta);
      }
    });

    function showCopied() {
      var orig = btn.getAttribute("aria-label");
      var svg = btn.querySelector("svg");
      var origSvg = svg ? svg.outerHTML : "";
      btn.setAttribute("aria-label", "Copied!");
      btn.style.background = "var(--colors-gray4)";
      if (svg) svg.outerHTML = '<svg width="24px" height="24px" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      setTimeout(function () {
        btn.setAttribute("aria-label", orig);
        btn.style.background = "";
        var s = btn.querySelector("svg");
        if (s && origSvg) s.outerHTML = origSvg;
      }, 2000);
    }
  }

  function renderNotFound(msg) {
    var titleEl = document.getElementById("project-title");
    var taglineEl = document.getElementById("project-tagline");
    if (titleEl) titleEl.textContent = msg || "Project not found";
    if (taglineEl) taglineEl.textContent = "";

    var contentEl = document.getElementById("project-content");
    if (!contentEl) return;
    contentEl.innerHTML =
      '<div class="state-box">' +
      '  <p style="color:var(--colors-gray11);margin-bottom:20px;">The requested project could not be found or has not been published yet in Sanity Studio.</p>' +
      '  <a href="/projects" class="artifact-btn" style="display:inline-flex;">&larr; Back to all projects</a>' +
      '</div>';
  }

  // ── Main Controller ──
  if (!slug) {
    renderNotFound("No project specified");
    return;
  }

  initCopyButton();

  // Instant render from cache if available
  var cached = readCache();
  if (cached) {
    updateSeo(cached);
    renderProject(cached);
  }

  var groq =
    '*[_type == "project" && slug.current == $slug][0]{' +
    '  title, "slug": slug.current, tagline, year, order, coverImage, role, timeline, teamSize, techStack,' +
    '  problem, targetUser, goal, directContribution, processArchitecture, challenges, metrics, impactSummary,' +
    '  liveDemoUrl, githubUrl, docsUrl, designSpecsUrl,' +
    '  "prev": *[_type == "project" && (order < ^.order || (order == ^.order && _createdAt < ^._createdAt))] | order(order desc, _createdAt desc)[0]{ title, "slug": slug.current },' +
    '  "next": *[_type == "project" && (order > ^.order || (order == ^.order && _createdAt > ^._createdAt))] | order(order asc, _createdAt asc)[0]{ title, "slug": slug.current }' +
    '}';

  var url =
    "https://" + PROJECT_ID + ".apicdn.sanity.io/v" + API_VERSION +
    "/data/query/" + DATASET +
    "?query=" + encodeURIComponent(groq) +
    "&%24slug=" + encodeURIComponent('"' + slug + '"');

  fetch(url)
    .then(function (r) {
      if (!r.ok) throw new Error("Fetch failed: " + r.status);
      return r.json();
    })
    .then(function (data) {
      var project = data && data.result;
      if (project) {
        writeCache(project);
        updateSeo(project);
        renderProject(project);
      } else if (!cached) {
        renderNotFound("Project not found");
      }
    })
    .catch(function (err) {
      console.warn("[project detail] Sanity error:", err);
      if (!cached) {
        renderNotFound("Unable to load project");
      }
    });
})();
